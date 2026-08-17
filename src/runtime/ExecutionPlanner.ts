import {
  DeviceCapabilityProfile,
  ExecutionPlan,
  ExecutionPolicy,
  ExecutionStrategy,
  ModelProfile,
  RuntimeSupport,
  RuntimeTarget,
} from './types';

const GIB = 1024 ** 3;

function memoryBudget(device: DeviceCapabilityProfile): number {
  // Reserve headroom for Android, UI, KV growth and driver allocations. This is
  // intentionally based on available memory, never a device-name allowlist.
  const reserve = Math.max(GIB, device.memory.totalBytes * 0.15);
  return Math.max(0, Math.min(device.memory.availableBytes * 0.85, device.memory.totalBytes - reserve));
}

function isVerifiedAccelerator(
  target: RuntimeTarget,
  device: DeviceCapabilityProfile,
): boolean {
  if (target.device === 'cpu') {
    return false;
  }
  return device.accelerators.some(
    accelerator =>
      accelerator.id === target.acceleratorId &&
      accelerator.available &&
      accelerator.computeVerified,
  );
}

function cpuTarget(support: RuntimeSupport): RuntimeTarget | undefined {
  return support.targets.find(target => target.device === 'cpu');
}

function verifiedAcceleratorTarget(
  support: RuntimeSupport,
  device: DeviceCapabilityProfile,
): RuntimeTarget | undefined {
  return support.targets.find(target => isVerifiedAccelerator(target, device));
}

function chooseHybridStrategy(support: RuntimeSupport): ExecutionStrategy | null {
  if (support.supportsLayerSplit) {
    return 'layer-split';
  }
  if (support.supportsOperatorSplit) {
    return 'operator-split';
  }
  return null;
}

function estimatePartition(model: ModelProfile): ExecutionPlan['partition'] {
  if (!model.layerCount || model.layerCount < 2) {
    return undefined;
  }

  // Initial neutral split. Runtime adapters are expected to refine this from
  // real allocation/telemetry rather than treating 50% as a performance truth.
  const acceleratorLayers = Math.max(1, Math.floor(model.layerCount / 2));
  return {
    acceleratorLayers,
    cpuLayers: model.layerCount - acceleratorLayers,
  };
}

export interface PlanExecutionInput {
  model: ModelProfile;
  device: DeviceCapabilityProfile;
  support: RuntimeSupport[];
  policy?: ExecutionPolicy;
}

/**
 * Select an execution plan from measured capabilities and runtime-adapter
 * support. No commercial device name is part of this decision.
 */
export function planExecution({
  model,
  device,
  support,
  policy = 'automatic',
}: PlanExecutionInput): ExecutionPlan {
  const budget = memoryBudget(device);
  const candidates = support.filter(candidate => candidate.canLoad);

  if (candidates.length === 0) {
    throw new Error(`No installed runtime can load model format: ${model.format}`);
  }

  if (policy === 'cpu') {
    const candidate = candidates.find(item => cpuTarget(item));
    if (!candidate) {
      throw new Error('No CPU-capable runtime can load this model');
    }
    return {
      adapter: candidate.adapter,
      policy,
      strategy: 'cpu-only',
      primary: cpuTarget(candidate)!,
      memoryBudgetBytes: budget,
      reasons: ['CPU execution explicitly requested'],
    };
  }

  const acceleratorCandidates = candidates
    .map(candidate => ({
      support: candidate,
      accelerator: verifiedAcceleratorTarget(candidate, device),
      cpu: cpuTarget(candidate),
    }))
    .filter(candidate => candidate.accelerator);

  if (policy === 'accelerator-strict') {
    const candidate = acceleratorCandidates[0];
    if (!candidate?.accelerator) {
      throw new Error('No verified accelerator runtime is available for this model');
    }
    return {
      adapter: candidate.support.adapter,
      policy,
      strategy: 'accelerator-only',
      primary: candidate.accelerator,
      memoryBudgetBytes: budget,
      reasons: [
        'Strict accelerator mode requested',
        'Fallback is deliberately disabled so accelerator failure is visible',
      ],
    };
  }

  if (policy === 'balanced') {
    for (const candidate of acceleratorCandidates) {
      const strategy = chooseHybridStrategy(candidate.support);
      if (strategy && candidate.accelerator && candidate.cpu) {
        return {
          adapter: candidate.support.adapter,
          policy,
          strategy,
          primary: candidate.accelerator,
          fallback: candidate.cpu,
          partition:
            strategy === 'layer-split' ? estimatePartition(model) : undefined,
          memoryBudgetBytes: budget,
          reasons: [
            'Balanced execution requested',
            `Runtime supports ${strategy}`,
            'CPU fallback/partition is explicit and must be reported by telemetry',
          ],
        };
      }
    }
  }

  // Automatic mode prioritizes a verified accelerator, but never invents one
  // from renderer/device-name detection alone.
  const accelerated = acceleratorCandidates[0];
  if (accelerated?.accelerator) {
    const hybridStrategy = chooseHybridStrategy(accelerated.support);
    const modelFootprint = model.estimatedRuntimeBytes ?? model.sizeBytes;
    const memoryPressure = budget > 0 && modelFootprint > budget * 0.7;

    if (memoryPressure && hybridStrategy && accelerated.cpu) {
      return {
        adapter: accelerated.support.adapter,
        policy: 'automatic',
        strategy: hybridStrategy,
        primary: accelerated.accelerator,
        fallback: accelerated.cpu,
        partition:
          hybridStrategy === 'layer-split' ? estimatePartition(model) : undefined,
        memoryBudgetBytes: budget,
        reasons: [
          'Verified accelerator available',
          'Model memory estimate is high relative to the safe runtime budget',
          `Using explicit ${hybridStrategy} instead of pretending full offload will fit`,
        ],
      };
    }

    return {
      adapter: accelerated.support.adapter,
      policy: 'automatic',
      strategy: 'accelerator-only',
      primary: accelerated.accelerator,
      // Automatic mode may recover to CPU, but telemetry must disclose it.
      fallback: accelerated.cpu,
      memoryBudgetBytes: budget,
      reasons: [
        'Verified accelerator available for this model/runtime pair',
        'Automatic mode prefers the lightest successful acceleration path',
      ],
    };
  }

  const cpuCandidate = candidates.find(item => cpuTarget(item));
  if (!cpuCandidate) {
    throw new Error('Model has no executable target on this device');
  }

  return {
    adapter: cpuCandidate.adapter,
    policy: 'automatic',
    strategy: 'cpu-only',
    primary: cpuTarget(cpuCandidate)!,
    memoryBudgetBytes: budget,
    reasons: [
      'No accelerator has passed a real compute probe for this model/runtime pair',
      'CPU selected as the verified compatible path',
    ],
  };
}
