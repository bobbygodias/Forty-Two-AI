// JNI hardware probes used by the PocketPal HardwareInfo TurboModule.
//
// The allocator purge path exposes bionic's mallopt(M_PURGE_ALL). The Vulkan
// path creates a minimal instance and reads the physical device capabilities
// that matter for on-device inference. Neither path initializes an inference
// backend; this file is diagnostics only.

#include <android/log.h>
#include <dlfcn.h>
#include <jni.h>
#include <malloc.h>
#include <vulkan/vulkan.h>

#include <algorithm>
#include <cstdint>
#include <sstream>
#include <string>
#include <vector>

typedef int (*mallopt_fn_t)(int, int);

// The `appmodules` target compile flags include -DLOG_TAG="ReactNative",
// which would clash if we redefined plain `LOG_TAG` here. Distinct name
// to avoid -Wmacro-redefined.
#define HW_INFO_LOG_TAG "PocketPalHardwareInfo"
#define HW_INFO_LOGI(...) \
    __android_log_print(ANDROID_LOG_INFO, HW_INFO_LOG_TAG, __VA_ARGS__)

namespace {

std::string json_escape(const char* value) {
    if (value == nullptr) {
        return "";
    }

    std::ostringstream out;
    for (const unsigned char c : std::string(value)) {
        switch (c) {
            case '\\': out << "\\\\"; break;
            case '"': out << "\\\""; break;
            case '\b': out << "\\b"; break;
            case '\f': out << "\\f"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (c < 0x20) {
                    static const char* hex = "0123456789abcdef";
                    out << "\\u00" << hex[(c >> 4) & 0x0f] << hex[c & 0x0f];
                } else {
                    out << static_cast<char>(c);
                }
        }
    }
    return out.str();
}

std::string version_string(uint32_t version) {
    std::ostringstream out;
    out << VK_VERSION_MAJOR(version) << "."
        << VK_VERSION_MINOR(version) << "."
        << VK_VERSION_PATCH(version);
    return out.str();
}

const char* device_type_string(VkPhysicalDeviceType type) {
    switch (type) {
        case VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU: return "integrated";
        case VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU: return "discrete";
        case VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU: return "virtual";
        case VK_PHYSICAL_DEVICE_TYPE_CPU: return "cpu";
        default: return "other";
    }
}

int device_score(VkPhysicalDeviceType type) {
    switch (type) {
        case VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU: return 4;
        case VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU: return 3;
        case VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU: return 2;
        case VK_PHYSICAL_DEVICE_TYPE_CPU: return 1;
        default: return 0;
    }
}

bool has_extension(
    const std::vector<VkExtensionProperties>& extensions,
    const char* name) {
    return std::any_of(
        extensions.begin(),
        extensions.end(),
        [name](const VkExtensionProperties& extension) {
            return std::string(extension.extensionName) == name;
        });
}

std::string unavailable_json(const std::string& error) {
    std::ostringstream out;
    out << "{\"available\":false,\"error\":\""
        << json_escape(error.c_str()) << "\"}";
    return out.str();
}

std::string query_vulkan_info_json() {
    uint32_t loader_api_version = VK_API_VERSION_1_0;
    auto enumerate_instance_version =
        reinterpret_cast<PFN_vkEnumerateInstanceVersion>(
            vkGetInstanceProcAddr(VK_NULL_HANDLE, "vkEnumerateInstanceVersion"));
    if (enumerate_instance_version != nullptr) {
        const VkResult result = enumerate_instance_version(&loader_api_version);
        if (result != VK_SUCCESS) {
            loader_api_version = VK_API_VERSION_1_0;
        }
    }

    VkApplicationInfo app_info{};
    app_info.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    app_info.pApplicationName = "PocketPal Enterprise Vulkan Probe";
    app_info.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    app_info.pEngineName = "diagnostics";
    app_info.engineVersion = VK_MAKE_VERSION(1, 0, 0);
#if defined(VK_VERSION_1_1)
    app_info.apiVersion = std::min(loader_api_version, VK_API_VERSION_1_1);
#else
    app_info.apiVersion = VK_API_VERSION_1_0;
#endif

    VkInstanceCreateInfo create_info{};
    create_info.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    create_info.pApplicationInfo = &app_info;

    VkInstance instance = VK_NULL_HANDLE;
    const VkResult create_result = vkCreateInstance(&create_info, nullptr, &instance);
    if (create_result != VK_SUCCESS || instance == VK_NULL_HANDLE) {
        return unavailable_json(
            "vkCreateInstance failed with code " + std::to_string(create_result));
    }

    uint32_t device_count = 0;
    VkResult enumerate_result =
        vkEnumeratePhysicalDevices(instance, &device_count, nullptr);
    if (enumerate_result != VK_SUCCESS || device_count == 0) {
        vkDestroyInstance(instance, nullptr);
        return unavailable_json(
            device_count == 0
                ? "Vulkan loader reported no physical devices"
                : "vkEnumeratePhysicalDevices failed with code " +
                      std::to_string(enumerate_result));
    }

    std::vector<VkPhysicalDevice> devices(device_count);
    enumerate_result =
        vkEnumeratePhysicalDevices(instance, &device_count, devices.data());
    if (enumerate_result != VK_SUCCESS) {
        vkDestroyInstance(instance, nullptr);
        return unavailable_json(
            "vkEnumeratePhysicalDevices failed with code " +
            std::to_string(enumerate_result));
    }

    VkPhysicalDevice selected_device = devices.front();
    VkPhysicalDeviceProperties selected_properties{};
    vkGetPhysicalDeviceProperties(selected_device, &selected_properties);
    int selected_score = device_score(selected_properties.deviceType);

    for (size_t index = 1; index < devices.size(); ++index) {
        VkPhysicalDeviceProperties candidate_properties{};
        vkGetPhysicalDeviceProperties(devices[index], &candidate_properties);
        const int candidate_score = device_score(candidate_properties.deviceType);
        if (candidate_score > selected_score) {
            selected_device = devices[index];
            selected_properties = candidate_properties;
            selected_score = candidate_score;
        }
    }

    VkPhysicalDeviceMemoryProperties memory_properties{};
    vkGetPhysicalDeviceMemoryProperties(selected_device, &memory_properties);

    uint64_t memory_heap_bytes = 0;
    uint64_t device_local_heap_bytes = 0;
    for (uint32_t index = 0; index < memory_properties.memoryHeapCount; ++index) {
        const VkMemoryHeap& heap = memory_properties.memoryHeaps[index];
        memory_heap_bytes += static_cast<uint64_t>(heap.size);
        if ((heap.flags & VK_MEMORY_HEAP_DEVICE_LOCAL_BIT) != 0) {
            device_local_heap_bytes += static_cast<uint64_t>(heap.size);
        }
    }

    bool unified_memory = false;
    for (uint32_t index = 0; index < memory_properties.memoryTypeCount; ++index) {
        const VkMemoryPropertyFlags flags =
            memory_properties.memoryTypes[index].propertyFlags;
        const bool device_local =
            (flags & VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT) != 0;
        const bool host_visible =
            (flags & VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT) != 0;
        if (device_local && host_visible) {
            unified_memory = true;
            break;
        }
    }

    uint32_t extension_count = 0;
    vkEnumerateDeviceExtensionProperties(
        selected_device, nullptr, &extension_count, nullptr);
    std::vector<VkExtensionProperties> extensions(extension_count);
    if (extension_count > 0) {
        const VkResult extension_result = vkEnumerateDeviceExtensionProperties(
            selected_device, nullptr, &extension_count, extensions.data());
        if (extension_result != VK_SUCCESS) {
            extensions.clear();
            extension_count = 0;
        }
    }

    bool supports_shader_float16 = false;
    bool supports_shader_int8 = false;
    bool supports_integer_dot_product = false;

    auto get_features2 = reinterpret_cast<PFN_vkGetPhysicalDeviceFeatures2>(
        vkGetInstanceProcAddr(instance, "vkGetPhysicalDeviceFeatures2"));
    if (get_features2 == nullptr) {
        get_features2 = reinterpret_cast<PFN_vkGetPhysicalDeviceFeatures2>(
            vkGetInstanceProcAddr(instance, "vkGetPhysicalDeviceFeatures2KHR"));
    }

#if defined(VK_KHR_shader_float16_int8)
    VkPhysicalDeviceFloat16Int8FeaturesKHR float16_int8_features{};
    float16_int8_features.sType =
        VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FLOAT16_INT8_FEATURES_KHR;
#endif
#if defined(VK_KHR_shader_integer_dot_product)
    VkPhysicalDeviceShaderIntegerDotProductFeaturesKHR dot_product_features{};
    dot_product_features.sType =
        VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_SHADER_INTEGER_DOT_PRODUCT_FEATURES_KHR;
#endif

    if (get_features2 != nullptr) {
        VkPhysicalDeviceFeatures2 features2{};
        features2.sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2;
        void** next = &features2.pNext;

#if defined(VK_KHR_shader_float16_int8)
        const bool can_query_float16_int8 =
            selected_properties.apiVersion >= VK_API_VERSION_1_2 ||
            has_extension(extensions, VK_KHR_SHADER_FLOAT16_INT8_EXTENSION_NAME);
        if (can_query_float16_int8) {
            *next = &float16_int8_features;
            next = &float16_int8_features.pNext;
        }
#endif
#if defined(VK_KHR_shader_integer_dot_product)
        const bool can_query_dot_product =
            selected_properties.apiVersion >= VK_API_VERSION_1_3 ||
            has_extension(
                extensions, VK_KHR_SHADER_INTEGER_DOT_PRODUCT_EXTENSION_NAME);
        if (can_query_dot_product) {
            *next = &dot_product_features;
            next = &dot_product_features.pNext;
        }
#endif
        *next = nullptr;
        get_features2(selected_device, &features2);

#if defined(VK_KHR_shader_float16_int8)
        supports_shader_float16 = float16_int8_features.shaderFloat16 == VK_TRUE;
        supports_shader_int8 = float16_int8_features.shaderInt8 == VK_TRUE;
#endif
#if defined(VK_KHR_shader_integer_dot_product)
        supports_integer_dot_product =
            dot_product_features.shaderIntegerDotProduct == VK_TRUE;
#endif
    }

    uint32_t subgroup_size = 0;
#if defined(VK_VERSION_1_1)
    auto get_properties2 = reinterpret_cast<PFN_vkGetPhysicalDeviceProperties2>(
        vkGetInstanceProcAddr(instance, "vkGetPhysicalDeviceProperties2"));
    if (get_properties2 == nullptr) {
        get_properties2 =
            reinterpret_cast<PFN_vkGetPhysicalDeviceProperties2>(
                vkGetInstanceProcAddr(
                    instance, "vkGetPhysicalDeviceProperties2KHR"));
    }
    if (get_properties2 != nullptr) {
        VkPhysicalDeviceSubgroupProperties subgroup_properties{};
        subgroup_properties.sType =
            VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_SUBGROUP_PROPERTIES;
        VkPhysicalDeviceProperties2 properties2{};
        properties2.sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_PROPERTIES_2;
        properties2.pNext = &subgroup_properties;
        get_properties2(selected_device, &properties2);
        subgroup_size = subgroup_properties.subgroupSize;
    }
#endif

    const VkPhysicalDeviceLimits& limits = selected_properties.limits;
    std::ostringstream out;
    out << "{"
        << "\"available\":true,"
        << "\"loaderApiVersion\":\""
        << version_string(loader_api_version) << "\","
        << "\"deviceApiVersion\":\""
        << version_string(selected_properties.apiVersion) << "\","
        << "\"deviceName\":\""
        << json_escape(selected_properties.deviceName) << "\","
        << "\"deviceType\":\""
        << device_type_string(selected_properties.deviceType) << "\","
        << "\"vendorId\":" << selected_properties.vendorID << ","
        << "\"deviceId\":" << selected_properties.deviceID << ","
        << "\"driverVersion\":" << selected_properties.driverVersion << ","
        << "\"maxStorageBufferRange\":"
        << static_cast<uint64_t>(limits.maxStorageBufferRange) << ","
        << "\"maxComputeSharedMemorySize\":"
        << limits.maxComputeSharedMemorySize << ","
        << "\"maxComputeWorkGroupInvocations\":"
        << limits.maxComputeWorkGroupInvocations << ","
        << "\"maxComputeWorkGroupCount\":["
        << limits.maxComputeWorkGroupCount[0] << ","
        << limits.maxComputeWorkGroupCount[1] << ","
        << limits.maxComputeWorkGroupCount[2] << "],"
        << "\"maxComputeWorkGroupSize\":["
        << limits.maxComputeWorkGroupSize[0] << ","
        << limits.maxComputeWorkGroupSize[1] << ","
        << limits.maxComputeWorkGroupSize[2] << "],"
        << "\"memoryHeapBytes\":" << memory_heap_bytes << ","
        << "\"deviceLocalHeapBytes\":" << device_local_heap_bytes << ","
        << "\"unifiedMemory\":" << (unified_memory ? "true" : "false") << ","
        << "\"subgroupSize\":" << subgroup_size << ","
        << "\"supportsShaderFloat16\":"
        << (supports_shader_float16 ? "true" : "false") << ","
        << "\"supportsShaderInt8\":"
        << (supports_shader_int8 ? "true" : "false") << ","
        << "\"supportsIntegerDotProduct\":"
        << (supports_integer_dot_product ? "true" : "false") << ","
        << "\"extensionCount\":" << extension_count
        << "}";

    vkDestroyInstance(instance, nullptr);
    return out.str();
}

}  // namespace

extern "C" JNIEXPORT jboolean JNICALL
Java_com_pocketpal_HardwareInfoModule_nativePurgeAll(
    JNIEnv* /* env */, jobject /* this */) {
    static mallopt_fn_t mallopt_fn =
        reinterpret_cast<mallopt_fn_t>(dlsym(RTLD_DEFAULT, "mallopt"));
    if (mallopt_fn == nullptr) {
        HW_INFO_LOGI("mallopt unavailable on this device");
        return JNI_FALSE;
    }
    // Bionic mallopt returns 1 on success, 0 on unknown option.
    // Try the aggressive variant first; fall back to M_PURGE on
    // devices that ship the symbol but not the M_PURGE_ALL option.
    int rc = mallopt_fn(M_PURGE_ALL, 0);
    if (rc == 0) {
        rc = mallopt_fn(M_PURGE, 0);
        HW_INFO_LOGI("M_PURGE_ALL unsupported, fell back to M_PURGE rc=%d", rc);
    } else {
        HW_INFO_LOGI("M_PURGE_ALL rc=%d", rc);
    }
    return rc == 1 ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_pocketpal_HardwareInfoModule_nativeGetVulkanInfoJson(
    JNIEnv* env, jobject /* this */) {
    try {
        const std::string json = query_vulkan_info_json();
        HW_INFO_LOGI("Vulkan probe completed: %s", json.c_str());
        return env->NewStringUTF(json.c_str());
    } catch (const std::exception& exception) {
        const std::string json = unavailable_json(exception.what());
        return env->NewStringUTF(json.c_str());
    } catch (...) {
        const std::string json =
            unavailable_json("Unknown native exception during Vulkan probe");
        return env->NewStringUTF(json.c_str());
    }
}
