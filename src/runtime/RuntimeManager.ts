import {planExecution} from './ExecutionPlanner';
import {
  DeviceCapabilityProfile,
  ExecutionPlan,
  ExecutionPolicy,
  ModelProfile,
  RuntimeAdapter,
  RuntimeAdapterId,
  RuntimeLoadSettings,
  RuntimeSession,
  RuntimeSupport,
} from './types';

export interface RuntimeSelection {
  plan: ExecutionPlan;
  support: RuntimeSupport[];
}

/**
 * Engine-agnostic entry point for local inference.
 *
 * UI/ModelStore should eventually depend on this class rather than importing a
 * concrete native runtime directly. During migration, the existing llama.rn
 * path remains untouched until a GGML adapter reproduces current behavior.
 */
export class RuntimeManager {
  private readonly adapters = new Map<RuntimeAdapterId, RuntimeAdapter>();

  register(adapter: RuntimeAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: RuntimeAdapterId): void {
    this.adapters.delete(id);
  }

  get installedAdapters(): RuntimeAdapterId[] {
    return [...this.adapters.keys()];
  }

  async inspectSupport(
    model: ModelProfile,
    device: DeviceCapabilityProfile,
  ): Promise<RuntimeSupport[]> {
    const results = await Promise.allSettled(
      [...this.adapters.values()].map(adapter =>
        adapter.inspectSupport(model, device),
      ),
    );

    return results.flatMap(result =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
  }

  async select(
    model: ModelProfile,
    device: DeviceCapabilityProfile,
    policy: ExecutionPolicy = 'automatic',
  ): Promise<RuntimeSelection> {
    const support = await this.inspectSupport(model, device);
    const plan = planExecution({model, device, support, policy});
    return {plan, support};
  }

  async load(
    model: ModelProfile,
    modelPath: string,
    device: DeviceCapabilityProfile,
    policy: ExecutionPolicy = 'automatic',
    settings?: RuntimeLoadSettings,
  ): Promise<RuntimeSession> {
    const {plan} = await this.select(model, device, policy);
    const adapter = this.adapters.get(plan.adapter);

    if (!adapter) {
      throw new Error(
        `Runtime adapter disappeared during selection: ${plan.adapter}`,
      );
    }

    return adapter.load({model, modelPath, plan, settings});
  }
}

export const runtimeManager = new RuntimeManager();
