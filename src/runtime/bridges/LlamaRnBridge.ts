import {
  getBackendDevicesInfo,
  initLlama,
  type CompletionParams,
  type ContextParams,
  type LlamaContext,
  type NativeBackendDeviceInfo,
  type TokenData,
} from 'llama.rn';

import type {GGMLBridge} from '../adapters/GGMLAdapter';
import type {
  AcceleratorApi,
  ComputeDeviceKind,
  RuntimeDeviceDescriptor,
  RuntimeLoadRequest,
  RuntimeLoadSettings,
  RuntimeSession,
  RuntimeTelemetry,
  RuntimeTarget,
} from '../types';

function acceleratorApiFromBackend(
  backend: string | undefined,
): AcceleratorApi | undefined {
  const value = backend?.toLowerCase() ?? '';

  if (value.includes('vulkan')) return 'vulkan';
  if (value.includes('opencl')) return 'opencl';
  if (value.includes('metal')) return 'metal';
  if (value.includes('qnn') || value.includes('hexagon')) return 'qnn';
  if (value.includes('nnapi')) return 'nnapi';
  return value ? 'other' : undefined;
}

function deviceKindFromNative(
  info: NativeBackendDeviceInfo,
): ComputeDeviceKind | null {
  const type = info.type?.toLowerCase() ?? '';
  const backend = info.backend?.toLowerCase() ?? '';
  const name = info.deviceName?.toLowerCase() ?? '';

  if (type.includes('cpu')) return 'cpu';
  if (type.includes('gpu')) return 'gpu';
  if (
    type.includes('npu') ||
    type.includes('accelerator') ||
    backend.includes('qnn') ||
    backend.includes('hexagon') ||
    name.startsWith('htp')
  ) {
    return 'npu';
  }

  // Unknown engine device types are not guessed into an accelerator class.
  return null;
}

function toRuntimeDevice(
  info: NativeBackendDeviceInfo,
): RuntimeDeviceDescriptor | null {
  const device = deviceKindFromNative(info);
  if (!device) return null;

  const backend = info.backend || undefined;
  return {
    id: `${backend ?? 'unknown'}:${info.deviceName}`,
    name: info.deviceName,
    device,
    api: device === 'cpu' ? undefined : acceleratorApiFromBackend(backend),
    backend,
    memoryBytes: info.maxMemorySize,
    metadata: info.metadata,
  };
}

function applyLoadSettings(
  params: ContextParams,
  settings: RuntimeLoadSettings | undefined,
): void {
  if (!settings) return;

  if (settings.contextSize !== undefined) params.n_ctx = settings.contextSize;
  if (settings.batchSize !== undefined) params.n_batch = settings.batchSize;
  if (settings.microBatchSize !== undefined) {
    params.n_ubatch = settings.microBatchSize;
  }
  if (settings.threads !== undefined) params.n_threads = settings.threads;
  if (settings.flashAttention !== undefined) {
    params.flash_attn_type = settings.flashAttention;
  }
  if (settings.cacheTypeK !== undefined) {
    params.cache_type_k = settings.cacheTypeK as ContextParams['cache_type_k'];
  }
  if (settings.cacheTypeV !== undefined) {
    params.cache_type_v = settings.cacheTypeV as ContextParams['cache_type_v'];
  }
  if (settings.unifiedKv !== undefined) params.kv_unified = settings.unifiedKv;
  if (settings.parallelism !== undefined) {
    params.n_parallel = settings.parallelism;
  }
  if (settings.useMlock !== undefined) params.use_mlock = settings.useMlock;
  if (settings.useMmap !== undefined) params.use_mmap = settings.useMmap;
  if (settings.noExtraBuffers !== undefined) {
    params.no_extra_bufts = settings.noExtraBuffers;
  }
}

function applyExecutionPlan(
  params: ContextParams,
  request: RuntimeLoadRequest,
): void {
  const {plan} = request;

  if (plan.primary.device === 'cpu') {
    params.devices = ['CPU'];
    params.n_gpu_layers = 0;
    return;
  }

  if (!plan.primary.runtimeDeviceName) {
    throw new Error(
      'GGML execution plan selected an accelerator without a runtime device name',
    );
  }

  params.devices = [plan.primary.runtimeDeviceName];
  params.n_gpu_layers =
    plan.strategy === 'layer-split'
      ? Math.max(1, plan.partition?.acceleratorLayers ?? 1)
      : 99;
}

function updateMetricsFromResult(
  telemetry: RuntimeTelemetry,
  result: unknown,
): void {
  if (!result || typeof result !== 'object') return;

  const timings = (result as {timings?: unknown}).timings;
  if (!timings || typeof timings !== 'object') return;

  const prompt = (timings as {prompt_per_second?: unknown}).prompt_per_second;
  const decode = (timings as {predicted_per_second?: unknown})
    .predicted_per_second;

  telemetry.metrics = {
    ...telemetry.metrics,
    promptTokensPerSecond: typeof prompt === 'number' ? prompt : undefined,
    decodeTokensPerSecond: typeof decode === 'number' ? decode : undefined,
  };
}

/**
 * Thin session wrapper around llama.rn. This is intentionally a migration
 * bridge: it preserves current native behavior while the rest of Forty-Two
 * learns to depend on RuntimeSession instead of LlamaContext directly.
 */
export class LlamaRnRuntimeSession implements RuntimeSession {
  readonly telemetry: RuntimeTelemetry;

  constructor(
    readonly context: LlamaContext,
    private readonly request: RuntimeLoadRequest,
  ) {
    const acceleratorRequested = request.plan.primary.device !== 'cpu';
    const engineReportsGpu = context.gpu === true;
    const fallbackOccurred = acceleratorRequested && !engineReportsGpu;

    const effectiveTargets: RuntimeTarget[] = fallbackOccurred
      ? request.plan.fallback
        ? [request.plan.fallback]
        : [{device: 'cpu'}]
      : request.plan.strategy === 'layer-split' && request.plan.fallback
        ? [request.plan.primary, request.plan.fallback]
        : [request.plan.primary];

    this.telemetry = {
      adapter: 'ggml',
      requestedPlan: request.plan,
      effectiveStrategy: fallbackOccurred
        ? 'cpu-only'
        : request.plan.primary.device === 'cpu'
          ? 'cpu-only'
          : 'unknown',
      effectiveTargets,
      // Set after a successful completion. Context creation alone is not work.
      acceleratorWorkVerified: false,
      cpuWorkVerified: false,
      fallbackOccurred,
      fallbackReason: fallbackOccurred
        ? context.reasonNoGPU || 'llama.rn created the context without GPU use'
        : undefined,
    };
  }

  async complete(
    params: unknown,
    onToken?: (event: {
      token?: string;
      content?: string;
      reasoningContent?: string;
      toolCalls?: unknown[];
      accumulatedText?: string;
    }) => void,
  ): Promise<unknown> {
    const result = await this.context.completion(
      params as CompletionParams,
      onToken
        ? (data: TokenData) => {
            onToken({
              token: data.token,
              content: data.content,
              reasoningContent: data.reasoning_content,
              toolCalls: data.tool_calls,
              accumulatedText: data.accumulated_text,
            });
          }
        : undefined,
    );

    if (this.request.plan.primary.device === 'cpu') {
      this.telemetry.cpuWorkVerified = true;
      this.telemetry.effectiveStrategy = 'cpu-only';
    } else if (this.context.gpu) {
      // A successful completion plus llama.rn reporting GPU use proves some
      // accelerator participation. It does NOT prove zero per-op CPU fallback,
      // which is why supportsStrictAcceleration remains false for this bridge.
      this.telemetry.acceleratorWorkVerified = true;

      if (this.request.plan.strategy === 'layer-split') {
        this.telemetry.cpuWorkVerified = true;
        this.telemetry.effectiveStrategy = 'layer-split';
      } else {
        this.telemetry.effectiveStrategy = 'accelerator-only';
      }
    } else {
      this.telemetry.cpuWorkVerified = true;
      this.telemetry.effectiveStrategy = 'cpu-only';
      this.telemetry.fallbackOccurred = true;
      this.telemetry.fallbackReason =
        this.context.reasonNoGPU || 'GPU was requested but llama.rn used CPU';
      this.telemetry.effectiveTargets = this.request.plan.fallback
        ? [this.request.plan.fallback]
        : [{device: 'cpu'}];
    }

    updateMetricsFromResult(this.telemetry, result);
    return result;
  }

  async stop(): Promise<void> {
    await this.context.stopCompletion();
  }

  async unload(): Promise<void> {
    await this.context.release();
  }
}

/** Concrete GGML bridge for the currently installed llama.rn runtime. */
export class LlamaRnBridge implements GGMLBridge {
  async getRuntimeDevices(): Promise<RuntimeDeviceDescriptor[]> {
    const devices = await getBackendDevicesInfo();
    return (devices ?? []).flatMap(device => {
      const mapped = toRuntimeDevice(device);
      return mapped ? [mapped] : [];
    });
  }

  async load(request: RuntimeLoadRequest): Promise<RuntimeSession> {
    const params: ContextParams = {
      model: request.modelPath,
      use_progress_callback: true,
    };

    applyLoadSettings(params, request.settings);
    applyExecutionPlan(params, request);

    const context = await initLlama(params);
    return new LlamaRnRuntimeSession(context, request);
  }
}
