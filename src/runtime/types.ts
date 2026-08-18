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

/** Hardware capability measured independently of any inference engine. */
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

/**
 * Device exposed by a concrete runtime/engine. This is intentionally distinct
 * from AcceleratorCapability: a physical GPU may exist while a particular
 * engine exposes no usable GPU device at all.
 */
export interface RuntimeDeviceDescriptor {
  id: string;
  name: string;
  device: ComputeDeviceKind;
  api?: AcceleratorApi;
  backend?: string;
  memoryBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface RuntimeTarget {
  device: ComputeDeviceKind;
  api?: AcceleratorApi;
  /** Hardware probe identity. */
  acceleratorId?: string;
  /** Opaque device identity that the selected runtime understands. */
  runtimeDeviceId?: string;
  /** Human/debug label reported by the runtime. Never use this as hardware policy. */
  runtimeDeviceName?: string;
}

export interface RuntimeSupport {
  adapter: RuntimeAdapterId;
  canLoad: boolean;
  reason?: string;
  targets: RuntimeTarget[];
  supportsLayerSplit: boolean;
  supportsOperatorSplit: boolean;
  /**
   * True only when the adapter can prove that accelerator-only execution did
   * not silently fall back to CPU. A UI must not expose Strict as available
   * when this is false.
   */
  supportsStrictAcceleration: boolean;
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

/**
 * Semantic load settings shared by runtime adapters. Each adapter translates
 * only the fields it supports to its native API.
 */
export interface RuntimeLoadSettings {
  contextSize?: number;
  batchSize?: number;
  microBatchSize?: number;
  threads?: number;
  flashAttention?: 'auto' | 'on' | 'off';
  cacheTypeK?: string;
  cacheTypeV?: string;
  unifiedKv?: boolean;
  parallelism?: number;
  useMlock?: boolean;
  useMmap?: boolean;
  noExtraBuffers?: boolean;
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
  settings?: RuntimeLoadSettings;
}

export interface RuntimeStreamEvent {
  token?: string;
  content?: string;
  reasoningContent?: string;
  toolCalls?: unknown[];
  accumulatedText?: string;
}

export interface RuntimeSession {
  readonly telemetry: RuntimeTelemetry;
  complete(
    params: unknown,
    onToken?: (event: RuntimeStreamEvent) => void,
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
