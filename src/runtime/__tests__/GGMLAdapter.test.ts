import {GGMLAdapter, GGMLBridge} from '../adapters/GGMLAdapter';
import {
  DeviceCapabilityProfile,
  ModelProfile,
  RuntimeDeviceDescriptor,
  RuntimeSession,
} from '../types';

const model: ModelProfile = {
  id: 'test.gguf',
  format: 'gguf',
  sizeBytes: 1024,
};

function device(
  api: 'vulkan' | 'opencl',
  computeVerified = true,
): DeviceCapabilityProfile {
  return {
    generatedAt: 1,
    cpu: {
      arch: 'arm64',
      logicalCores: 8,
      fp16: true,
      dotprod: true,
      i8mm: false,
    },
    memory: {
      totalBytes: 12 * 1024 ** 3,
      availableBytes: 8 * 1024 ** 3,
    },
    accelerators: [
      {
        id: `physical-${api}`,
        kind: 'gpu',
        name: 'Physical GPU',
        api,
        available: true,
        computeVerified,
      },
    ],
  };
}

function bridge(runtimeDevices: RuntimeDeviceDescriptor[]): GGMLBridge {
  return {
    getRuntimeDevices: async () => runtimeDevices,
    load: async () => ({}) as RuntimeSession,
  };
}

describe('GGMLAdapter', () => {
  it('offers acceleration only when hardware verification and engine API agree', async () => {
    const adapter = new GGMLAdapter(
      bridge([
        {id: 'cpu', name: 'CPU', device: 'cpu'},
        {
          id: 'ggml-vulkan',
          name: 'Vulkan0',
          device: 'gpu',
          api: 'vulkan',
        },
      ]),
    );

    const support = await adapter.inspectSupport(model, device('vulkan'));
    const gpu = support.targets.find(target => target.device === 'gpu');

    expect(gpu).toEqual({
      device: 'gpu',
      api: 'vulkan',
      acceleratorId: 'physical-vulkan',
      runtimeDeviceId: 'ggml-vulkan',
      runtimeDeviceName: 'Vulkan0',
    });
    expect(support.supportsLayerSplit).toBe(true);
  });

  it('does not infer GGML GPU support from a physical GPU alone', async () => {
    const adapter = new GGMLAdapter(
      bridge([{id: 'cpu', name: 'CPU', device: 'cpu'}]),
    );

    const support = await adapter.inspectSupport(model, device('vulkan'));

    expect(support.targets).toHaveLength(1);
    expect(support.targets[0].device).toBe('cpu');
    expect(support.supportsLayerSplit).toBe(false);
  });

  it('does not cross-match different accelerator APIs', async () => {
    const adapter = new GGMLAdapter(
      bridge([
        {id: 'cpu', name: 'CPU', device: 'cpu'},
        {
          id: 'ggml-opencl',
          name: 'OpenCL0',
          device: 'gpu',
          api: 'opencl',
        },
      ]),
    );

    const support = await adapter.inspectSupport(model, device('vulkan'));

    expect(support.targets.some(target => target.device === 'gpu')).toBe(false);
  });

  it('does not offer strict mode until zero-fallback execution is provable', async () => {
    const adapter = new GGMLAdapter(
      bridge([
        {id: 'cpu', name: 'CPU', device: 'cpu'},
        {
          id: 'ggml-vulkan',
          name: 'Vulkan0',
          device: 'gpu',
          api: 'vulkan',
        },
      ]),
    );

    const support = await adapter.inspectSupport(model, device('vulkan'));

    expect(support.supportsStrictAcceleration).toBe(false);
  });
});
