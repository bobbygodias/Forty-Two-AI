import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface CPUProcessor {
  processor?: string;
  'model name'?: string;
  'cpu MHz'?: string;
  vendor_id?: string;
}

export interface CPUInfo {
  cores: number;
  processors?: CPUProcessor[];
  features?: string[];
  hasFp16?: boolean;
  hasDotProd?: boolean;
  hasSve?: boolean;
  hasI8mm?: boolean;
  socModel?: string;
  hardware?: string;
  maxFreqMhz?: number;
}

export interface GPUInfo {
  renderer: string;
  vendor: string;
  version: string;
  hasAdreno: boolean;
  hasMali: boolean;
  hasPowerVR: boolean;
  supportsOpenCL: boolean;
  gpuType: string;
}

/**
 * Parsed shape returned by the Android NDK Vulkan probe.
 *
 * The TurboModule method returns JSON rather than a nested map so the JNI
 * implementation can remain independent of React Native bridge classes.
 */
export interface VulkanInfo {
  available: boolean;
  error?: string;
  loaderApiVersion?: string;
  deviceApiVersion?: string;
  deviceName?: string;
  deviceType?: string;
  vendorId?: number;
  deviceId?: number;
  driverVersion?: number;
  maxStorageBufferRange?: number;
  maxComputeSharedMemorySize?: number;
  maxComputeWorkGroupInvocations?: number;
  maxComputeWorkGroupCount?: [number, number, number];
  maxComputeWorkGroupSize?: [number, number, number];
  memoryHeapBytes?: number;
  deviceLocalHeapBytes?: number;
  unifiedMemory?: boolean;
  subgroupSize?: number;
  supportsShaderFloat16?: boolean;
  supportsShaderInt8?: boolean;
  supportsIntegerDotProduct?: boolean;
  extensionCount?: number;
}

export interface Spec extends TurboModule {
  getCPUInfo(): Promise<CPUInfo>;
  getGPUInfo(): Promise<GPUInfo>;
  /** Android-only NDK Vulkan probe, encoded as a JSON string. */
  getVulkanInfo(): Promise<string>;
  getChipset?(): Promise<string>; // Android only
  /**
   * Get available memory in bytes from the operating system.
   * - Android: Uses ActivityManager.getMemoryInfo() to get availMem
   * - iOS: Uses os_proc_available_memory()
   * @returns Promise<number> Available memory in bytes
   */
  getAvailableMemory(): Promise<number>;
  /**
   * Collect memory metrics and write a snapshot entry to disk.
   * Appends to Documents/memory-snapshots.json (iOS) or externalFilesDir/memory-snapshots.json (Android).
   */
  writeMemorySnapshot(label: string): Promise<{label: string; status: string}>;
  /**
   * Hint the native allocator to release fully-free pages back to the
   * kernel. Best-effort: resolves with `purged: false` on platforms
   * without an underlying mechanism (iOS, Android < API 28).
   * `rss_kb_before`/`after` are sampled from /proc/self/status so
   * callers can record actual reclaim per call.
   */
  purgeNativeAllocator(): Promise<{
    purged: boolean;
    rss_kb_before: number;
    rss_kb_after: number;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HardwareInfo');
