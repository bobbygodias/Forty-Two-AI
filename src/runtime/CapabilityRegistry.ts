import {
  AcceleratorCapability,
  CpuCapabilityProfile,
  DeviceCapabilityProfile,
} from './types';

export interface CpuProbe {
  probeCpu(): Promise<CpuCapabilityProfile>;
}

export interface MemoryProbe {
  probeMemory(): Promise<{
    totalBytes: number;
    availableBytes: number;
  }>;
}

export interface AcceleratorProbe {
  readonly id: string;
  probe(): Promise<AcceleratorCapability | null>;
}

/**
 * Collects measured hardware capabilities without making an execution choice.
 * Discovery and policy are intentionally separate: seeing a GPU is not the
 * same thing as proving that a compute backend can execute on it.
 */
export class CapabilityRegistry {
  constructor(
    private readonly cpuProbe: CpuProbe,
    private readonly memoryProbe: MemoryProbe,
    private readonly acceleratorProbes: AcceleratorProbe[],
  ) {}

  async profile(): Promise<DeviceCapabilityProfile> {
    const [cpu, memory, acceleratorResults] = await Promise.all([
      this.cpuProbe.probeCpu(),
      this.memoryProbe.probeMemory(),
      Promise.allSettled(this.acceleratorProbes.map(probe => probe.probe())),
    ]);

    const accelerators = acceleratorResults.flatMap(result => {
      if (result.status !== 'fulfilled' || result.value === null) {
        return [];
      }
      return [result.value];
    });

    return {
      generatedAt: Date.now(),
      cpu,
      memory,
      accelerators,
    };
  }
}
