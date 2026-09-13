# Forty-Two AI — Engineering Lineage & Lessons

**Checkpoint:** 2026-08-17 23:18 BRT (UTC-03:00)

This document preserves engineering intent that must survive chat resets, UI freezes and future refactors. It records what Forty-Two AI inherits from its PocketPal lineage, what it learned from the MNN Chat reference APK, and which product/backend decisions were developed during the long MEGA 3 acceleration and UX design work.

## Canonical lineage

The active/canonical project is **`bobbygodias/Forty-Two-AI`**.

`bobbygodias/pocketpal-enterprise` and upstream PocketPal are engineering ancestors. They are sources of useful implementation, tests and history — not the identity or final product definition of Forty-Two AI.

`mnn_chat_0_8_3.apk` is a **reference artifact only**. Forty-Two AI does not become an MNN fork merely because MNN demonstrated useful Android acceleration patterns.

## Reuse from the PocketPal ancestry

Reuse stable, proven pieces when they remain technically appropriate instead of rewriting them for branding reasons:

- local conversation/session pipeline;
- GGUF/model loading plumbing and existing llama.rn integration where maintainable;
- local conversation/history persistence;
- model download/storage management that does not require unwanted cloud identity;
- prompt/template and generation controls that are actually useful;
- benchmark concepts and existing measurement plumbing;
- Android hardware-information module as a base, extended rather than blindly trusted;
- React Native application shell, navigation primitives, state-management patterns and tested utility code when they reduce risk;
- CPU inference path as the non-negotiable safe fallback;
- tests/mocks that remain valid after Forty-Two-specific refactors.

Reuse is based on value, not ancestry. A working component does not need to be rewritten merely to make the fork look different.

## Do not carry forward as product assumptions

Forty-Two AI must not inherit these merely because PocketPal had them:

- PocketPal branding, naming or product identity;
- a UI that exposes engineering controls as the primary conversation experience;
- the assumption that Android GPU acceleration means Qualcomm/Adreno OpenCL;
- treating a requested `GPU layers` value as proof that any layer was actually offloaded;
- hardcoded or misleading GPU labels;
- cloud-only model names inside a local model picker when no provider is actually implemented;
- marketplace/account/social/billing/cloud-sync features that are not part of the Forty-Two AI goal;
- Firebase, Google Sign-In, Supabase or similar dependencies merely because the ancestor used them;
- OpenCL-specific quantization/Flash-Attention restrictions being copied into Vulkan without measurement;
- any hardware capability declaration being shown as execution proof.

Cloud/account/marketplace code may remain temporarily while native acceleration is being stabilized if removing it would add debugging variables. Retention during migration is not endorsement as a final feature.

## What the MNN Chat reference actually demonstrates

Inspection of the preserved `mnn_chat_0_8_3.apk` shows factual implementation patterns worth retaining as lessons:

- the APK is ARM64-oriented and contains native runtime libraries including `libMNN.so`, `libmnnllmapp.so`, `libmnn_tts.so` and `libsherpa-mnn-jni.so`;
- `libMNN.so` contains an OpenCL path, references to `libmali.so` / Mali GLES libraries, FP16 OpenCL kernels and Mali-specific kernel code;
- the runtime contains explicit per-operation fallback messages such as unsupported OpenCL operations falling back to CPU;
- the LLM JNI layer exposes runtime configuration, reset/history control, debug information and native benchmark entry points;
- native load diagnostics explicitly distinguish model/config failure, wrong backend and insufficient memory;
- the APK includes local device/model metadata assets such as `android-devices.db` and `model_market.json`;
- LLM and TTS are separated into native components instead of being forced into one monolithic interface.

These observations are architectural evidence, not a requirement to copy MNN source or switch Forty-Two AI to MNN.

## Lessons taken from MNN without copying the engine

1. **Acceleration belongs in the runtime, not in a cosmetic UI switch.** A backend must be compiled, loaded and used before the UI can claim it is active.
2. **Hybrid execution is legitimate.** An accelerated backend can fall back to CPU for unsupported operations; the application should report this honestly instead of treating fallback as failure or hiding it.
3. **Benchmarking belongs close to the runtime.** Prompt processing, token generation, memory and backend state should be measured where the engine can report them accurately.
4. **Load failures need actionable causes.** Wrong backend, model incompatibility, memory pressure and native-load failure should not collapse into one generic error toast.
5. **Runtime modules can remain separate.** LLM, TTS, speech and other future local capabilities do not need one giant native binary or one giant settings surface.
6. **Mali acceleration is possible on Android outside Qualcomm-specific paths.** MNN demonstrates a Mali/OpenCL route; llama.cpp provides our current Vulkan route. Forty-Two AI should evaluate backends by measured behavior, not vendor folklore.

### Explicit non-decision

MNN's Mali/OpenCL implementation is a useful reference, but Forty-Two AI is currently pursuing a **llama.cpp/llama.rn Vulkan backend** for the GGUF path. Do not introduce a second inference engine merely because it exists. A future MNN backend is only justified if it provides a concrete model-format/capability/performance advantage that outweighs maintenance complexity.

## Product architecture developed during the MEGA 3 work

### Conversation-first surface

The main screen is the conversation, not the laboratory.

It should show, without clutter:

- companion identity/avatar;
- active local model;
- active preset;
- effective execution state (CPU / Vulkan / Hybrid, never aspirational state);
- discreet memory/thermal state;
- readable messages;
- comfortable composer with attachment, microphone, stop and send;
- one clear control to open the technical panel.

### Quick side panel on tablet

On landscape tablets, prefer a side sheet/panel that leaves the conversation visible. It contains common controls:

- model;
- companion/pal;
- preset;
- Auto / CPU / Vulkan / Hybrid;
- creativity;
- response length;
- voice;
- current context;
- entry point to Advanced settings.

### Advanced settings

Engineering controls belong here rather than on the chat surface:

- context;
- CPU threads;
- batch/microbatch;
- Flash Attention;
- KV cache;
- mmap;
- repack;
- mlock;
- requested GPU layers;
- **actual/effective GPU layers**;
- requested backend;
- **effective backend**;
- fallback reason;
- estimated memory before model load.

### Models screen

Model cards should carry useful local facts rather than marketing:

- model + quantization;
- file size;
- recommended context;
- estimated runtime memory;
- measured speed on the target tablet when available;
- CPU/Vulkan compatibility;
- available presets;
- load / test / remove actions.

### Lab / Diagnostics

Forty-Two AI should expose evidence when the user wants it:

- prompt-processing speed;
- token-generation speed;
- peak RAM;
- thermal state/headroom where Android exposes it;
- native library loaded;
- physical GPU detected;
- Vulkan loader/device available;
- actual backend/device registered by the inference engine;
- requested versus actual offload;
- fallback reason;
- exportable logs/report.

## Runtime/backend rules

- ARM64 is the primary Android target for the current project.
- Preserve the proven CPU path.
- Vulkan initialization should be lazy/non-destructive so a bad driver cannot prevent the app from launching.
- Do not bundle Android's `libvulkan.so`; use the system Vulkan loader/driver.
- Physical Vulkan detection is **not** proof of successful compute or inference.
- Prefer a minimal compute sanity test before large allocations.
- GPU on Mali uses shared system RAM; do not describe reported Vulkan heap size as dedicated VRAM.
- Estimate model + KV/runtime overhead before load rather than treating GGUF file size as total memory use.
- Dynamic per-model offload is preferred over blindly requesting `99` layers.
- Requested and effective backend/offload are separate values everywhere in state and UI.
- Safe CPU fallback must preserve model selection, settings and conversation.
- Flash Attention remains off until validated for the specific backend/model path.
- `mlock` remains off by default unless measurements justify it.
- `mmap` is useful but its interaction with GPU upload/shared memory must be measured.
- Vision/multimodal support is model/runtime-dependent; Vulkan availability alone does not imply it.

## Benchmark discipline

When comparing CPU versus Vulkan or Hybrid, freeze all other variables: exact model file, quantization, context, cache type, prompt, batch/microbatch, sampling and repetition settings. Change backend/offload only.

Known CPU reference points from the MEGA 3 project should remain available as comparison baselines:

- SmolLM3 3B: approximately 24.87 t/s prompt processing and 4.00 t/s generation under the recorded baseline configuration;
- Qwen3.5 4B Q4_K_M: approximately 12.90 t/s prompt processing and 2.99 t/s generation under the recorded baseline configuration.

Do not promise Vulkan speedups in advance. Mali-G57 MC2 may improve prompt processing, token generation, CPU load or some combination — or regress for a particular model/quantization. Measurements decide.

## MEGA 3 target facts that shaped the design

The current target tablet is the Blackview MEGA 3 / MediaTek MT6789 (Helio G99 family), ARM64, 12 GB nominal RAM and Mali-G57 MC2. Prior device evidence showed Android 35, FP16 and DotProd support, no I8MM/SVE in the PocketPal diagnostic, and a Vulkan device exposed by the system. These are runtime inputs, not reasons to hardcode assumptions for every Android device.

## Forty-Two AI identity decisions

- Product name: **Forty-Two AI**.
- Dark/graphite interface.
- Canonical metallic silver emblem remains itself; cyan/aqua and purple are interface accents rather than arbitrary recolors of the mark.
- Chat-first, friendly interaction; technical depth is progressively disclosed.
- Tablet landscape is the first-class MEGA 3 layout, with responsive portrait behavior rather than a stretched phone UI.
- Touch targets should remain tablet-friendly (approximately 48dp minimum), text scalable, contrast strong and color never the only status signal.
- Reduced motion/glow should be possible.
- Local-first/privacy-first behavior; do not fake cloud features.

## Continuity rule

Future sessions must distinguish three categories explicitly:

**Inherited and kept** — proven ancestor code that still serves Forty-Two AI.

**Learned from** — PocketPal, MNN or other implementations that teach us something without becoming dependencies.

**Rejected/replaced** — assumptions or features intentionally removed from the product direction.

This distinction prevents two opposite failures: rewriting good code merely to feel original, and accidentally carrying old product assumptions forever.

For project checkpoints and continuity documents, include an absolute **date and local time with timezone**. Git commit timestamps remain authoritative for code history; the visible checkpoint time exists to make chat/project chronology human-readable.
