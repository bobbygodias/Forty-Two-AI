import {
  DeviceCapabilityProfile,
  ModelProfile,
  RuntimeAdapter,
  RuntimeDeviceDescriptor,
  RuntimeLoadRequest,
  RuntimeSession,
  RuntimeSupport,
  RuntimeTarget,
} from '../types';

export interface GGMLBridge {
  /** Devices that this concrete GGML build currently exposes to the app. */
  getRuntimeDevices(): Promise<RuntimeDeviceDescriptor[]>;
  load(request: RuntimeLoadRequest): Promise<RuntimeSession>;
}

/**
 * Adapter for GGUF/GGML-family runtimes.
 *
 * Hardware identity and engine identity are deliberately kept separate. A
 * physical GPU is not offered as a target unless BOTH the hardware probe has
 * verified compute and this concrete GGML bridge exposes a matching runtime
 * device/API.
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
        supportsStrictAcceleration: false,
      };
    }

    const runtimeDevices = await this.bridge.getRuntimeDevices();
    const runtimeCpu = runtimeDevices.find(item => item.device === 'cpu');
    const targets: RuntimeTarget[] = [
      {
        device: 'cpu',
        runtimeDeviceId: runtimeCpu?.id,
        runtimeDeviceName: runtimeCpu?.name ?? 'CPU',
      },
    ];

    for (const runtimeDevice of runtimeDevices) {
      if (runtimeDevice.device === 'cpu' || !runtimeDevice.api) {
        continue;
      }

      const verifiedHardware = device.accelerators.find(
        accelerator =>
          accelerator.kind === runtimeDevice.device &&
          accelerator.api === runtimeDevice.api &&
          accelerator.available &&
          accelerator.computeVerified,
      );

      if (!verifiedHardware) {
        continue;
      }

      targets.push({
        device: runtimeDevice.device,
        api: runtimeDevice.api,
        acceleratorId: verifiedHardware.id,
        runtimeDeviceId: runtimeDevice.id,
        runtimeDeviceName: runtimeDevice.name,
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
      // llama.rn currently reports whether a context is using GPU, but the
      // Forty-Two contract requires proof that unsupported operators did not
      // silently execute on CPU before we advertise strict accelerator mode.
      supportsStrictAcceleration: false,
    };
  }

  load(request: RuntimeLoadRequest): Promise<RuntimeSession> {
    return this.bridge.load(request);
  }
}
