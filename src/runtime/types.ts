export type RuntimeAdapterId =
  | 'ggml'
  | 'mnn'
  | 'executorch'
  | 'litert'
  | 'onnx';

export type ModelFormat =
  | 'gguf'
  | 'mnn'
  | 'pte'
  | 'litert'
  | 'onnx'
  | 'unknown';

export type AcceleratorApi =
  | 'vulkan'
  | 'opencl'
  | 'metal'
  | 'nnapi'
  | 'qnn'
  | 'other';

export type ComputeDeviceKind = 'cpu' | 'gpu' | 'npu';

/**
 * User-facing policy. Automatic is the normal/default mode; the others are
 * advanced controls and diagnostics, not choices we should force on users.
 */
export type ExecutionPolicy =
  | 'automatic'
  | 'cpu'
  | 'accelerator-strict'
  | 'balanced';

export type ExecutionStrategy =
  | 'cpu-only'
  | 'accelerator-only'
  | 'layer-split'
  | 'operator-split';

export interface CpuCapabilityProfile {
  arch: string;
  logicalCores: number;
  fp16: boolean;
  dotprod: boolean;
  i8mm: boolean;
}

export interface AcceleratorCapability {
  id: string;
  kind: 'gpu' | 'npu';
  name: string;
  vendor?: string;
  api: AcceleratorApi;
  available: boolean;
  /** A real minimal compute probe succeeded, not merely device enumeration. */
  computeVerified: boolean;
  fp16?: boolean;
  int8?: boolean;
  sharedMemory?: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export interface DeviceCapabilityProfile {
  generatedAt: number;
  cpu: CpuCapabilityProfile;
  memory: {
    totalBytes: number;
    availableBytes: number;
  };
  accelerators: AcceleratorCapability[];
}

export interface ModelProfile {
  id: string;
  format: ModelFormat;
  sizeBytes: number;
  quantization?: string;
  layerCount?: number;
  estimatedRuntimeBytes?: number;
  modalities?: Array<'text' | 'vision' | 'audio'>;
}

export interface RuntimeTarget {
  device: ComputeDeviceKind;
  api?: AcceleratorApi;
  acceleratorId?: string;
}

export interface RuntimeSupport {
  adapter: RuntimeAdapterId;
  canLoad: boolean;
  reason?: string;
  targets: RuntimeTarget[];
  supportsLayerSplit: boolean;
  supportsOperatorSplit: boolean;
}

export interface ExecutionPlan {
  adapter: RuntimeAdapterId;
  policy: ExecutionPolicy;
  strategy: ExecutionStrategy;
  primary: RuntimeTarget;
  fallback?: RuntimeTarget;
  /**
   * Present only when the chosen adapter can deliberately partition by layer.
   * The planner may refine this after the model is inspected by the adapter.
   */
  partition?: {
    acceleratorLayers?: number;
    cpuLayers?: number;
  };
  memoryBudgetBytes: number;
  reasons: string[];
}

export interface RuntimeTelemetry {
  adapter: RuntimeAdapterId;
  requestedPlan: ExecutionPlan;
  effectiveStrategy: ExecutionStrategy | 'unknown';
  effectiveTargets: RuntimeTarget[];
  acceleratorWorkVerified: boolean;
  cpuWorkVerified: boolean;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  metrics?: {
    promptTokensPerSecond?: number;
    decodeTokensPerSecond?: number;
    peakMemoryBytes?: number;
  };
}

export interface RuntimeLoadRequest {
  model: ModelProfile;
  plan: ExecutionPlan;
  modelPath: string;
}

export interface RuntimeSession {
  readonly telemetry: RuntimeTelemetry;
  complete(
    params: unknown,
    onToken?: (token: string) => void,
  ): Promise<unknown>;
  stop(): Promise<void>;
  unload(): Promise<void>;
}

export interface RuntimeAdapter {
  readonly id: RuntimeAdapterId;
  inspectSupport(
    model: ModelProfile,
    device: DeviceCapabilityProfile,
  ): Promise<RuntimeSupport>;
  load(request: RuntimeLoadRequest): Promise<RuntimeSession>;
}
