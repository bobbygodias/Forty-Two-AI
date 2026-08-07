# PocketPal Enterprise — Vulkan Integration Plan

## Status

This document records the verified gap between GPU discovery and GPU inference
in the upstream Android stack, plus the implementation route for the
Blackview MEGA 3 (Helio G99 / Mali-G57 MC2).

## Verified current state

PocketPal can identify the physical GPU through an EGL/OpenGL probe. That does
not make the GPU an inference backend.

The application asks `llama.rn` for registered backend devices. In the pinned
`llama.rn` 0.12.7 Android build, the native libraries are assembled manually
for:

- generic CPU;
- ARMv8 CPU variants;
- ARMv8.2 + dot-product / i8mm CPU variants;
- a Qualcomm-focused Hexagon + OpenCL variant.

The backend registry contains a conditional `LM_GGML_USE_VULKAN` hook, but the
Android CMake configuration does not build a Vulkan target, does not add the
Vulkan implementation sources, and does not generate/embed the required SPIR-V
shaders. Enabling a define alone would therefore fail at compile or link time.

## Design rule

The Enterprise UI must always distinguish:

1. physical GPU detected;
2. Vulkan loader/device available;
3. inference backend compiled and registered;
4. backend requested by the user;
5. backend actually used by the loaded model;
6. requested versus actually offloaded layers.

No inference claim may be inferred from an EGL renderer string or from
`n_gpu_layers = 99`.

## Phase A — native Vulkan diagnostics (in this application repository)

Implemented in the app-owned `HardwareInfo` JNI shim:

- create a minimal Vulkan instance;
- enumerate physical devices;
- select a GPU-class device;
- report loader/device API versions;
- report device name, type, vendor and driver identifiers;
- report shared/device-local heaps and unified-memory capability;
- report max storage-buffer and compute limits;
- report subgroup size;
- query shader FP16, shader INT8 and integer dot-product support when exposed;
- fail safely as JSON when Vulkan is unavailable.

This probe does not initialize or claim an inference backend.

## Phase B — maintainable `llama.rn` variant

Use a dedicated fork of `mybigday/llama.rn`, pinned by commit rather than a
floating branch. Do not paste a large generated patch into the application
repository.

Required fork changes:

1. Vendor/sync the complete matching `llama.cpp` Vulkan implementation.
2. Add a Vulkan-enabled ARM64 native target, initially named:

   `rnllama_v8_2_dotprod_vulkan`

3. Add its matching JSI/JNI wrapper target:

   `rnllama_jni_v8_2_dotprod_vulkan`

4. Link against Android's `libvulkan` loader.
5. Add shader-generation tooling and deterministic generated artifacts.
6. Register `LM_GGML_USE_VULKAN` only in the Vulkan target.
7. Update Android native-library selection so MediaTek/Mali devices may load
   the Vulkan variant without requiring Qualcomm, Adreno or i8mm.
8. Preserve CPU variants as an unconditional fallback.
9. Expose runtime telemetry through the React Native bridge:
   - loaded native variant;
   - registered backend devices;
   - selected backend/device;
   - model layers assigned to each backend;
   - initialization/fallback error.
10. Add an environment/runtime kill switch for driver failures.

## Phase C — application integration

Point `package.json` to the pinned Enterprise `llama.rn` fork commit and enable
source or prebuilt native artifacts for ARM64 only.

The application will then:

- expose CPU / Vulkan / hybrid presets;
- validate that the Vulkan backend is actually registered before enabling it;
- reload the model transactionally;
- fall back to CPU after a Vulkan initialization failure;
- retain the prior working preset;
- surface the failure reason and exportable diagnostics;
- benchmark identical model parameters across CPU and Vulkan.

## Initial MEGA 3 validation matrix

### SmolLM3 3B baseline

- context: 2048
- threads: 6
- batch: 512
- microbatch: 512
- flash attention: off
- KV cache: f16/f16
- CPU baseline: 24.87 prompt t/s, 4.00 generation t/s

### Qwen3.5 4B Q4_K_M baseline

- context: 1024
- threads: 6
- batch: 512
- microbatch: 512
- flash attention: off
- KV cache: f16/f16
- CPU baseline: 12.90 prompt t/s, 2.99 generation t/s

Each model will be measured with CPU, conservative partial offload, half-layer
offload and maximum stable Vulkan offload. The winning preset is determined by
repeatable measurements, memory pressure and thermal stability—not by whether
a GPU logo appears in the UI.

## Safety and recovery

- The application must boot without Vulkan.
- CPU mode must remain loadable even after a Vulkan crash/failure.
- Vulkan selection is never persisted as known-good until a model load and a
  short inference smoke test complete.
- Driver errors must not delete the model, chat history or the previous preset.
- A startup safe-mode path must bypass all accelerator initialization.
