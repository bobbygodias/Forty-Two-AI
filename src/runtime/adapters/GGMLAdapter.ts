import {
  AcceleratorApi,
  DeviceCapabilityProfile,
  ModelProfile,
  RuntimeAdapter,
  RuntimeLoadRequest,
  RuntimeSession,
  RuntimeSupport,
  RuntimeTarget,
} from '../types';

export interface GGMLBridge {
  /** Accelerator APIs actually compiled/registered in this GGML build. */
  getCompiledAcceleratorApis(): Promise<AcceleratorApi[]>;
  load(request: RuntimeLoadRequest): Promise<RuntimeSession>;
}

/**
 * Adapter for GGUF/GGML-family runtimes.
 *
 * This class deliberately knows nothing about React Native stores or UI. The
 * concrete llama.rn bridge will be introduced separately so existing initLlama
 * behavior can be reproduced before ModelStore is switched over.
 */
export class GGMLAdapter implements RuntimeAdapter {
  readonly id = 'ggml' as const;

  constructor(private readonly bridge: GGMLBridge) {}

  async inspectSupport(
    model: ModelProfile,
    device: DeviceCapabilityProfile,
  ): Promise<RuntimeSupport> {
    if (model.format !== 'gguf') {
      return {
        adapter: this.id,
        canLoad: false,
        reason: `GGML adapter expects GGUF, received ${model.format}`,
        targets: [],
        supportsLayerSplit: false,
        supportsOperatorSplit: false,
      };
    }

    const compiledApis = await this.bridge.getCompiledAcceleratorApis();
    const targets: RuntimeTarget[] = [{device: 'cpu'}];

    for (const accelerator of device.accelerators) {
      if (
        !accelerator.available ||
        !accelerator.computeVerified ||
        !compiledApis.includes(accelerator.api)
      ) {
        continue;
      }

      targets.push({
        device: accelerator.kind,
        api: accelerator.api,
        acceleratorId: accelerator.id,
      });
    }

    const hasAccelerator = targets.some(target => target.device !== 'cpu');

    return {
      adapter: this.id,
      canLoad: true,
      targets,
      // GGML-family runtimes can deliberately split model layers when the
      // concrete accelerator backend exposes offload. Actual effective layer
      // counts still have to come back through telemetry.
      supportsLayerSplit: hasAccelerator,
      supportsOperatorSplit: false,
    };
  }

  load(request: RuntimeLoadRequest): Promise<RuntimeSession> {
    return this.bridge.load(request);
  }
}
