import {makeAutoObservable, runInAction} from 'mobx';
import {Platform} from 'react-native';
import type {NativeBackendDeviceInfo} from 'llama.rn';

import NativeHardwareInfo, {
  type GPUInfo,
  type VulkanInfo,
} from '../specs/NativeHardwareInfo';
import {getAvailableDevices} from '../utils/deviceSelection';
import {ModelOrigin} from '../utils/types';
import {modelStore} from './ModelStore';

export type EnterpriseRequestedBackend = 'auto' | 'cpu' | 'gpu' | 'hybrid';
export type EnterpriseEffectiveBackend =
  | 'idle'
  | 'remote'
  | 'cpu'
  | 'gpu'
  | 'hybrid'
  | 'unverified';

const parseVulkanInfo = (json: string): VulkanInfo => {
  const parsed: unknown = JSON.parse(json);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as {available?: unknown}).available !== 'boolean'
  ) {
    throw new Error('Invalid Vulkan diagnostic payload');
  }
  return parsed as VulkanInfo;
};

/**
 * Runtime-only hardware and backend state for PocketPal Enterprise.
 *
 * The original app exposes requested init parameters but does not clearly
 * separate them from what the native engine can actually execute. This store
 * keeps that distinction explicit. Hardware discovery is not persisted;
 * requested settings remain persisted by ModelStore.contextInitParams.
 */
class EnterpriseRuntimeStore {
  backendDevices: NativeBackendDeviceInfo[] = [];
  gpuInfo: GPUInfo | null = null;
  vulkanInfo: VulkanInfo | null = null;
  isRefreshing = false;
  lastError: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, {autoBind: true});
  }

  get gpuBackendDevice(): NativeBackendDeviceInfo | undefined {
    return this.backendDevices.find(device => device.type === 'gpu');
  }

  get physicalGpuDetected(): boolean {
    return Boolean(
      this.vulkanInfo?.available ||
        this.gpuInfo?.renderer ||
        this.gpuInfo?.hasMali ||
        this.gpuInfo?.hasAdreno ||
        this.gpuInfo?.hasPowerVR,
    );
  }

  get vulkanAvailable(): boolean {
    return this.vulkanInfo?.available === true;
  }

  get gpuBackendAvailable(): boolean {
    return this.gpuBackendDevice !== undefined;
  }

  get requestedBackend(): EnterpriseRequestedBackend {
    const params = modelStore.contextInitParams;
    const layers = params.n_gpu_layers ?? 0;
    const devices = params.devices;

    if (
      layers <= 0 ||
      devices?.some(device => device.toLowerCase() === 'cpu')
    ) {
      return 'cpu';
    }

    if (!devices || devices.length === 0) {
      return 'auto';
    }

    const totalLayers = modelStore.activeModel?.ggufMetadata?.n_layers;
    if (totalLayers && layers < totalLayers) {
      return 'hybrid';
    }

    return 'gpu';
  }

  get effectiveBackend(): EnterpriseEffectiveBackend {
    const activeModel = modelStore.activeModel;

    if (activeModel?.origin === ModelOrigin.REMOTE) {
      return 'remote';
    }

    if (!modelStore.context || !modelStore.engine) {
      return 'idle';
    }

    const params =
      modelStore.activeContextSettings ?? modelStore.contextInitParams;
    const layers = params.n_gpu_layers ?? 0;
    const devices = params.devices;

    if (
      layers <= 0 ||
      devices?.some(device => device.toLowerCase() === 'cpu') ||
      !this.gpuBackendAvailable
    ) {
      return 'cpu';
    }

    // Auto-selection may choose different devices internally. Until the native
    // bridge reports the loaded backend and actual offloaded layer count, do
    // not pretend that a detected accelerator proves it was used.
    if (!devices || devices.length === 0) {
      return 'unverified';
    }

    const totalLayers = activeModel?.ggufMetadata?.n_layers;
    if (totalLayers && layers < totalLayers) {
      return 'hybrid';
    }

    return 'gpu';
  }

  get requestedGpuLayers(): number {
    return modelStore.contextInitParams.n_gpu_layers ?? 0;
  }

  get effectiveGpuLayers(): number | null {
    return this.effectiveBackend === 'cpu' ||
      this.effectiveBackend === 'idle' ||
      this.effectiveBackend === 'remote'
      ? 0
      : null;
  }

  get requiresModelReload(): boolean {
    if (!modelStore.context || !modelStore.activeContextSettings) {
      return false;
    }

    const requested = modelStore.contextInitParams;
    const active = modelStore.activeContextSettings;
    const requestedDevices = requested.devices ?? [];
    const activeDevices = active.devices ?? [];

    return (
      requested.n_gpu_layers !== active.n_gpu_layers ||
      requestedDevices.length !== activeDevices.length ||
      requestedDevices.some((device, index) => device !== activeDevices[index])
    );
  }

  setRequestedBackend(backend: EnterpriseRequestedBackend): boolean {
    if (backend === 'cpu') {
      modelStore.setDevices(['CPU']);
      modelStore.setNGPULayers(0);
      return true;
    }

    if (backend === 'auto') {
      modelStore.setDevices(undefined);
      modelStore.setNGPULayers(99);
      return true;
    }

    const gpuDeviceName = this.gpuBackendDevice?.deviceName;
    if (!gpuDeviceName) {
      return false;
    }

    modelStore.setDevices([gpuDeviceName]);

    // The stock Android GPU path exposed by llama.rn 0.12.7 is OpenCL,
    // whose device option only supports flash attention disabled. Keep this
    // normalization beside backend selection so model reload cannot receive
    // an invalid OpenCL + flash-attention combination. The Vulkan fork will
    // replace this with backend-reported capabilities.
    if (Platform.OS === 'android') {
      modelStore.setFlashAttnType('off');
    }

    if (backend === 'hybrid') {
      const totalLayers = modelStore.activeModel?.ggufMetadata?.n_layers;
      const partialLayers = totalLayers
        ? Math.max(1, Math.min(totalLayers - 1, Math.ceil(totalLayers / 2)))
        : 16;
      modelStore.setNGPULayers(partialLayers);
      return true;
    }

    modelStore.setNGPULayers(99);
    return true;
  }

  async refresh(): Promise<void> {
    runInAction(() => {
      this.isRefreshing = true;
      this.lastError = null;
    });

    const [devicesResult, gpuResult, vulkanResult] = await Promise.allSettled([
      getAvailableDevices(),
      NativeHardwareInfo.getGPUInfo(),
      NativeHardwareInfo.getVulkanInfo(),
    ]);

    runInAction(() => {
      if (devicesResult.status === 'fulfilled') {
        this.backendDevices = devicesResult.value;
      } else {
        this.backendDevices = [];
        this.lastError = String(devicesResult.reason);
      }

      if (gpuResult.status === 'fulfilled') {
        this.gpuInfo = gpuResult.value;
      } else {
        this.gpuInfo = null;
        this.lastError = this.lastError ?? String(gpuResult.reason);
      }

      if (vulkanResult.status === 'fulfilled') {
        try {
          this.vulkanInfo = parseVulkanInfo(vulkanResult.value);
        } catch (error) {
          this.vulkanInfo = null;
          this.lastError = this.lastError ?? String(error);
        }
      } else {
        this.vulkanInfo = null;
        this.lastError = this.lastError ?? String(vulkanResult.reason);
      }

      this.isRefreshing = false;
    });
  }
}

export const enterpriseRuntimeStore = new EnterpriseRuntimeStore();
