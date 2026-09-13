# Forty-Two AI — Mobile Inference Runtime Strategy

**Checkpoint:** 2026-08-18 00:46 BRT (UTC-03:00)

This document distills the runtime ideas contributed by Logos and verified against current official documentation. It is a strategy record, not a commitment to bundle every engine.

## Core decision

Forty-Two AI should be **multi-runtime capable, not multi-runtime chaotic**.

The application should expose one internal runtime abstraction and let each task/model select the most appropriate backend/engine. We do **not** replace the current GGUF/llama.cpp path merely because other runtimes exist.

### Current primary LLM path

For GGUF language models, keep `llama.cpp` / `llama.rn` as the primary engine and continue the Vulkan work for Mali/Android, with CPU fallback and truthful requested-vs-effective backend/offload reporting.

### Future auxiliary-runtime path

Add other engines only when they solve a concrete workload better: vision, speech, embeddings, classifiers, segmentation, OCR, TTS, or vendor NPU access.

## Runtime candidates

### ExecuTorch — high strategic value

Current official Android documentation exposes XNNPACK CPU, Vulkan GPU, Qualcomm AI Engine, MediaTek and other hardware backends. ExecuTorch is PyTorch-native and now supports production on-device workloads across Meta products.

**Forty-Two use:** excellent candidate for future PyTorch-native vision/audio/embedding/small-model capabilities and for vendor accelerator experiments.

**Do not do now:** replace the working GGUF/llama.cpp LLM path simply to standardize on ExecuTorch.

### LiteRT — useful, but not the universal Android answer

LiteRT remains mature for `.tflite` models with CPU/GPU delegates and vendor NPU delegates. The simplistic idea that NNAPI will always discover and optimally route to any accelerator is too strong; backend/model/device compatibility still matters and partial delegation can hurt performance.

**Forty-Two use:** good for models already distributed as TFLite and for specific mobile ML tasks where its delegate ecosystem is advantageous.

**Caution:** Google Play Services variants are optional ecosystem choices, not a requirement for a local-first Forty-Two AI build.

### ncnn — very interesting for lightweight Vulkan workloads

ncnn is small, pure C++, optimized for ARM mobile inference and has mature Vulkan support on Android/ARM.

**Forty-Two use:** strong candidate for vision/image pipelines or compact auxiliary models where a tiny native Vulkan runtime matters.

**Do not do now:** convert GGUF LLMs into another format just to force them through ncnn.

### MNN — proven useful reference, possible experimental runtime

Our preserved MNN Chat APK already demonstrated real Mali/OpenCL patterns, runtime fallback, diagnostics and native benchmarking. Current MNN source/CI also covers Android CPU/OpenCL/Vulkan and LLM smoke paths.

**Forty-Two use:** keep as a serious reference and possible experimental backend if a future model/workload shows a measurable advantage.

**Do not do now:** introduce a second LLM engine before the current Vulkan/llama.cpp route is stable and benchmarked.

### TNN — historically interesting, low current priority

Tencent describes TNN as based on ncnn and Rapidnet, with mobile ARM/OpenCL/Metal/NPU optimizations, model compression and graph optimization.

**Forty-Two use:** source of architecture/optimization ideas.

**Priority:** lower than ncnn, MNN, ExecuTorch and ONNX Runtime for our current roadmap, especially for modern local-LLM work.

### ONNX Runtime Mobile — best general-purpose sidecar candidate

ONNX Runtime Mobile supports Android CPU/XNNPACK/NNAPI and Qualcomm QNN paths and provides tooling to analyze whether a model is suitable for mobile execution providers.

**Forty-Two use:** excellent neutral runtime for auxiliary models arriving from heterogeneous ecosystems: vision, audio, embeddings, classifiers, OCR and other ONNX-friendly tasks.

**Design value:** its Execution Provider architecture reinforces our own requested/effective runtime abstraction.

### Qualcomm QNN — future Snapdragon plugin

QNN can directly target Qualcomm acceleration through the Qualcomm AI Engine Direct SDK; ONNX Runtime and ExecuTorch both expose QNN/Qualcomm paths.

**Forty-Two use:** optional hardware plugin for Snapdragon devices, not a core dependency for the current MediaTek target.

### MediaTek NeuroPilot — strategically relevant, but do not assume MEGA 3 support

MediaTek NeuroPilot exposes tools/APIs for CPU/GPU/VPU/MDLA/NPU-class acceleration depending on platform. Official documentation explicitly says not all MediaTek platforms contain all accelerators and support depends on the platform/operator set.

The public Helio G99 specification confirms the Mali-G57 MC2 GPU but does not provide enough evidence to claim a generally accessible NeuroPilot NPU path on the current Blackview MEGA 3.

**Forty-Two rule:** do not advertise or design around G99 NPU/APU acceleration until device-level probing and supported-platform documentation prove it is accessible to our application.

## Architectural lesson from Logos

The strongest idea is not “choose a different engine.” It is **separate the product from the engine**.

Forty-Two AI should eventually have an internal adapter contract resembling:

- `RuntimeProvider.id`
- `RuntimeProvider.supports(task, modelFormat, deviceCapabilities)`
- `prepare(model, options)`
- `run(input)` / task-specific streaming interface
- `benchmark()`
- `release()`
- `describeEffectiveBackend()`
- `fallbackReason`
- `estimatedMemory`
- `measuredMemory`

The UI talks to the Forty-Two runtime layer, not directly to `llama.rn`, MNN, ncnn or ONNX Runtime.

## Model registry

Each locally installed model should eventually record:

- model format (`GGUF`, `ONNX`, `PTE`, `TFLite`, MNN, etc.);
- compatible runtime providers;
- preferred runtime for this device;
- safe fallback runtime;
- supported tasks/modalities;
- quantization/precision;
- measured latency/throughput;
- measured memory;
- measured thermal impact when available;
- effective backend/device from the last successful run.

Do not convert models between formats merely to satisfy architectural aesthetics. Preserve the format/runtime combination that gives the best real result.

## Device-local runtime selection

Future Auto mode should be evidence-driven rather than a hardcoded vendor table.

Possible policy:

1. Detect CPU/GPU/Vulkan/vendor capabilities.
2. Filter runtimes that can actually load the model/task.
3. Use a known safe default on first launch.
4. Run a short local benchmark when appropriate.
5. Persist a per-device/per-model profile.
6. Select the best profile for the user's requested mode: Eco / Balanced / Performance.
7. Re-evaluate after model/runtime/app updates or if the previous backend starts failing.

This stays local and does not require a cloud compatibility service.

## Power/thermal lesson

Raw token/s is not the only metric for mobile inference. Forty-Two AI should eventually consider:

- prompt latency;
- generation latency;
- peak RAM;
- sustained thermal state;
- battery/power impact where measurable;
- UI responsiveness during inference.

A backend that is 8% faster but thermally throttles hard or destroys battery life may be a worse default.

## Roadmap implication

### Now

Finish and validate the current `llama.cpp`/Vulkan GGUF path on the MEGA 3, preserve CPU fallback, and finish the Forty-Two chat-first UX.

### Next architecture step

Introduce the runtime-provider abstraction **without adding a second engine yet**. Wrap the existing llama runtime behind it first.

### First auxiliary-engine experiments

Best candidates:

1. ONNX Runtime Mobile for general auxiliary models;
2. ExecuTorch for PyTorch-native/voice/vision workloads;
3. ncnn for very lightweight Vulkan-centric vision workloads;
4. MNN as an experimental comparison where its Android backend coverage may provide measurable advantages.

### Vendor-specific later

- Qualcomm QNN plugin on Snapdragon hardware;
- MediaTek NeuroPilot only on hardware where accessible platform support is verified.

## Final rule

Forty-Two AI should not become a museum of inference frameworks.

An engine earns a place only if it provides at least one of:

- a capability the current runtime cannot provide;
- materially better performance;
- materially better power efficiency;
- materially better model compatibility;
- materially better access to hardware acceleration.

Every additional runtime pays rent in APK size, maintenance, testing and failure modes. Measure first; integrate second.
