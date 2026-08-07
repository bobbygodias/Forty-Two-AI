# PocketPal Enterprise — Project Specification

## Goal

Create a Blackview MEGA 3–first Android edition of PocketPal AI with:

1. A friendlier, chat-first interface designed primarily for tablet landscape use.
2. Explicit CPU / Vulkan / hybrid inference selection.
3. Real backend reporting: requested backend, effective backend, requested GPU layers, actual offloaded layers, and fallback reason.
4. Model presets that balance quality, speed, memory, and thermals.
5. Preservation of local-first privacy and offline inference.

## Target device

- Device: Blackview MEGA 3
- SoC: MediaTek Helio G99 / MT6789
- CPU: 2× Cortex-A76 @ 2.2 GHz + 6× Cortex-A55 @ 2.0 GHz
- GPU: ARM Mali-G57 MC2
- ABI: arm64-v8a
- RAM: 12 GB nominal / ~11.5 GB visible to Android
- Vulkan: available through Android driver
- CPU features observed by PocketPal: FP16 and DotProd supported; SVE and I8MM unavailable

## Baseline benchmark — CPU

### SmolLM3 3B

- Model size: 1.8 GB
- Parameters: 3.08B
- Context: 2048
- Batch / microbatch: 512 / 512
- CPU threads: 6
- Flash Attention: off
- KV cache: f16 / f16
- Prompt processing: 24.87 tok/s
- Token generation: 4.00 tok/s
- Total time: 40 s
- Peak memory: ~4 GB / 33.2%

### Qwen 3.5 4B Q4_K_M

- Model size: 2.7 GB
- Parameters: 4.21B
- Context: 1024
- Batch / microbatch: 512 / 512
- CPU threads: 6
- Flash Attention: off
- KV cache: f16 / f16
- Prompt processing: 12.90 tok/s
- Token generation: 2.99 tok/s
- Total time: 1 min 3 s
- Peak memory: ~6 GB / 49.3%

These values are the fixed CPU baseline for Vulkan and hybrid comparisons.

## Product structure

### Main screen — Chat

The main screen is conversation-first. It should contain:

- Current companion / Pal name and avatar
- Active model
- Active preset
- Effective backend: CPU, Vulkan, or hybrid
- Compact memory / thermal indicator
- Comfortable message composer
- Attach, microphone, stop-generation, and send controls
- One control to open the quick settings panel

Advanced technical controls must not clutter the main conversation screen.

### Quick settings panel

On tablet landscape, open as a side panel while keeping the chat visible.

- Change model
- Change companion / Pal
- Select preset
- Backend: Auto / CPU / Vulkan / Hybrid
- Creativity
- Response length
- Voice output
- Current context size
- Link to advanced settings

### Model library

Each model card should display:

- Name and quantization
- File size
- Recommended context
- Estimated RAM use
- Measured performance on this device
- CPU / Vulkan compatibility
- Available presets
- Load, benchmark, favorite, and remove actions

### Presets

Initial presets:

- Light
- Balanced
- Quality
- Vulkan Experimental
- Custom

A preset controls context, threads, batch, microbatch, KV cache, Flash Attention, backend, GPU offload, and thermal behavior.

### Advanced settings

- Context size
- CPU threads
- Batch / microbatch
- Flash Attention
- KV cache types
- mmap
- weight repack
- mlock
- requested GPU layers
- actual offloaded GPU layers
- requested backend
- effective backend
- fallback reason
- estimated memory before model load

### Laboratory

- Benchmark runner
- Prompt processing speed
- Token generation speed
- Peak RAM
- Device temperature where available
- Loaded native library
- Detected GPU
- Vulkan availability and capabilities
- Requested versus actual offload
- Exportable diagnostic log

## Visual direction

- Dark graphite / black base
- Cyan / aqua primary accent
- Purple secondary accent
- Restrained glow, not saturated neon
- Rounded cards and message bubbles
- Large, legible typography
- Designed first for Blackview MEGA 3 landscape mode
- Responsive portrait layout
- Friendly companion aesthetic rather than engineering-console-first design

## Native inference plan

Preserve the existing CPU path and add a Vulkan-capable Android native variant for arm64-v8a.

Required behavior:

- Load CPU safely by default
- Probe Vulkan independently of OpenGL / OpenCL detection
- Expose Mali-G57 MC2 as an inference backend only when the Vulkan backend initializes successfully
- Allow CPU, Vulkan, and hybrid offload
- Fail gracefully to CPU without losing the current chat or settings
- Report the effective backend and actual offload
- Store benchmark results per model and preset

## Development branch

Primary work branch:

`enterprise/mega3-vulkan-ui`

All project checkpoints should be committed to this branch until the first testable APK is ready.
