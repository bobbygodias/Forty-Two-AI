# PocketPal Enterprise — Architecture Map

Branch: `enterprise/mega3-vulkan-ui`
Target device: Blackview MEGA 3 / MT6789 / Mali-G57 MC2 / Android 35 / arm64-v8a

## 1. Application shell and navigation

Primary entry point: `App.tsx`

Current structure:

- Provider tree: Safe Area, Keyboard, React Native Paper, localization, Markdown, Navigation.
- Main navigation: `Drawer.Navigator`.
- Chat route intentionally hides the default navigation header and renders its own header.
- Current primary routes: Chat, Pals, Models, Benchmark, Settings, App Info and debug-only tools.

Enterprise direction:

- Keep the provider tree and database/store plumbing.
- Keep drawer navigation available as a secondary route system.
- Make Chat the visual application shell.
- On landscape tablets, open the quick-control surface as an in-place right panel instead of navigating away.
- Preserve existing routes during the first refactor so functionality is not lost while the new shell is introduced.

## 2. Chat composition

Primary screen: `src/screens/ChatScreen/ChatScreen.tsx`

Responsibilities already isolated here:

- Resolves active Pal and active model capabilities.
- Drives send/stop actions through `useChatSession`.
- Handles reasoning/thinking controls.
- Owns model-load and chat warning surfaces.
- Delegates visual rendering to `ChatView`.

Enterprise direction:

- Avoid rewriting session and inference logic.
- Extend the props supplied to `ChatView` with a compact runtime status model.
- Add one quick-controls action without coupling the screen to the presentation implementation.

## 3. Main chat UI

Primary component: `src/components/ChatView/ChatView.tsx`

Current visual composition:

1. `ChatHeader`
2. Inverted message list
3. Pending/tool indicators
4. Input container and contextual banners
5. Suggested prompts overlay
6. Pal/model picker sheet
7. Auxiliary sheets and snackbars

Important existing strengths to preserve:

- Keyboard-safe layout and animated occlusion handling.
- Streaming-aware list behavior.
- Draft persistence by chat session.
- Existing model/Pal picker.
- Context-size upgrade workflow.
- Tool execution indicators.

Enterprise refactor seam:

- Replace only the header presentation first.
- Introduce a tablet-aware quick-control panel as a sibling of the chat surface.
- Keep the message list and input behavior intact during the first UI pass.
- Move advanced controls out of the top-right overflow menu over time, but preserve existing actions until parity is reached.

## 4. Header

Primary component: `src/components/ChatHeader/ChatHeader.tsx`

Current structure:

- Left: drawer button + title.
- Right: new chat, memory usage and overflow menu.

Overflow menu: `src/components/HeaderRight/HeaderRight.tsx`

Current menu owns:

- Generation settings.
- Model selection.
- Duplicate, rename and delete chat.
- Export/import.

Enterprise header target:

- Left: drawer/history action, companion avatar, companion/session title.
- Center/secondary line: active model + active preset.
- Right: compact backend badge, new chat and one quick-controls button.
- Existing management actions remain available under a reduced overflow menu.

## 5. Theme system

Theme entry points:

- `src/hooks/useTheme.ts`
- `src/utils/theme.ts`
- token modules under `src/theme/`

The current theme is already token-based and locale-aware. This means the Enterprise visual language should be implemented by extending tokens rather than scattering literal colors through screens.

Enterprise dark visual direction:

- Background: near-black.
- Elevated surfaces: graphite.
- Primary accent: restrained cyan/teal.
- Secondary accent: restrained violet.
- Thin borders and controlled glow only for active/selected states.
- Large readable typography and touch targets for the MEGA 3 landscape display.

## 6. Model/runtime state

Primary store: `src/store/ModelStore.ts`

Existing exposed data used by Chat:

- Active model and context settings.
- Loading/inferencing/streaming state.
- Memory ceilings and last successful load.
- Context initialization parameters.
- Benchmark ownership guard.

Enterprise additions required:

- Requested backend.
- Effective backend.
- Requested GPU layers.
- Effective offloaded layers.
- Loaded native variant/library.
- GPU device name.
- Fallback reason.
- Runtime memory and thermal summaries.

These fields must describe observed runtime state, not merely the user's requested values.

## 7. Hardware discovery

Current native module:

- `android/app/src/main/java/com/pocketpalai/HardwareInfoModule.kt`

It currently obtains GPU renderer/vendor/version through EGL/OpenGL and classifies Adreno, Mali and PowerVR. It does not expose a Vulkan compute backend.

Enterprise additions required:

- Vulkan physical-device enumeration through JNI.
- Vulkan properties, features, extensions and memory heaps.
- Stable capability object passed to JavaScript.
- Explicit distinction between "GPU detected" and "GPU inference backend available".

## 8. Backend selection

Current utility:

- `src/utils/deviceSelection.ts`

Current Android behavior:

- CPU is the safe default.
- GPU option appears only when `llama.rn` reports an available GPU backend.
- Existing Android GPU path is OpenCL-oriented and does not expose the Mali-G57 as an inference device.

Enterprise target options:

- Automatic
- CPU
- Vulkan / Mali-G57
- Hybrid CPU + Vulkan

Every option must report both requested and effective execution state.

## 9. Safe implementation order inside one development branch

This is one project and one continuous experimental release, not three separate products.

1. Add Enterprise runtime status types and selectors.
2. Build the new tablet-aware header and quick-control panel around the unchanged chat engine.
3. Add explicit requested/effective backend diagnostics to Benchmark and Settings.
4. Integrate a source-built `llama.rn`/`llama.cpp` Vulkan variant for arm64-v8a.
5. Add fallback protection and per-model preset persistence.
6. Validate against the frozen CPU baselines.
7. Remove optional cloud/marketplace dependencies only after inference and UI parity are proven.

## 10. Frozen baseline for regression testing

### SmolLM3 3B

- Context: 2048
- Threads: 6
- Batch: 512
- Microbatch: 512
- Flash Attention: off
- KV cache: f16/f16
- Prompt processing: 24.87 t/s
- Generation: 4.00 t/s
- Peak memory: approximately 4 GB

### Qwen 3.5 4B Q4_K_M

- Context: 1024
- Threads: 6
- Batch: 512
- Microbatch: 512
- Flash Attention: off
- KV cache: f16/f16
- Prompt processing: 12.90 t/s
- Generation: 2.99 t/s
- Peak memory: approximately 6 GB

These settings remain fixed when comparing CPU, partial Vulkan offload and maximum stable Vulkan offload.
