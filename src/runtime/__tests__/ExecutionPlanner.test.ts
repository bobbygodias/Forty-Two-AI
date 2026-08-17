import {planExecution} from '../ExecutionPlanner';
import {
  DeviceCapabilityProfile,
  ModelProfile,
  RuntimeSupport,
} from '../types';

const model: ModelProfile = {
  id: 'test-model',
  format: 'gguf',
  sizeBytes: 2 * 1024 ** 3,
  estimatedRuntimeBytes: 3 * 1024 ** 3,
  layerCount: 32,
};

function device(computeVerified: boolean): DeviceCapabilityProfile {
  return {
    generatedAt: Date.now(),
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
        id: 'gpu-vulkan-0',
        kind: 'gpu',
        name: 'Test GPU',
        api: 'vulkan',
        available: true,
        computeVerified,
      },
    ],
  };
}

const ggmlSupport: RuntimeSupport = {
  adapter: 'ggml',
  canLoad: true,
  targets: [
    {device: 'cpu'},
    {device: 'gpu', api: 'vulkan', acceleratorId: 'gpu-vulkan-0'},
  ],
  supportsLayerSplit: true,
  supportsOperatorSplit: false,
};

describe('ExecutionPlanner', () => {
  it('never treats enumeration alone as verified acceleration', () => {
    const plan = planExecution({
      model,
      device: device(false),
      support: [ggmlSupport],
    });

    expect(plan.strategy).toBe('cpu-only');
    expect(plan.primary.device).toBe('cpu');
  });

  it('uses a verified accelerator in automatic mode', () => {
    const plan = planExecution({
      model,
      device: device(true),
      support: [ggmlSupport],
    });

    expect(plan.strategy).toBe('accelerator-only');
    expect(plan.primary.device).toBe('gpu');
    expect(plan.primary.api).toBe('vulkan');
  });

  it('strict accelerator mode has no fallback', () => {
    const plan = planExecution({
      model,
      device: device(true),
      support: [ggmlSupport],
      policy: 'accelerator-strict',
    });

    expect(plan.strategy).toBe('accelerator-only');
    expect(plan.fallback).toBeUndefined();
  });

  it('strict accelerator mode fails when compute was not verified', () => {
    expect(() =>
      planExecution({
        model,
        device: device(false),
        support: [ggmlSupport],
        policy: 'accelerator-strict',
      }),
    ).toThrow('No verified accelerator runtime is available');
  });

  it('balanced mode produces a real two-target layer split', () => {
    const plan = planExecution({
      model,
      device: device(true),
      support: [ggmlSupport],
      policy: 'balanced',
    });

    expect(plan.strategy).toBe('layer-split');
    expect(plan.primary.device).toBe('gpu');
    expect(plan.fallback?.device).toBe('cpu');
    expect(plan.partition?.acceleratorLayers).toBe(16);
    expect(plan.partition?.cpuLayers).toBe(16);
  });

  it('explicit CPU policy remains CPU even when acceleration is verified', () => {
    const plan = planExecution({
      model,
      device: device(true),
      support: [ggmlSupport],
      policy: 'cpu',
    });

    expect(plan.strategy).toBe('cpu-only');
    expect(plan.primary.device).toBe('cpu');
  });
});
