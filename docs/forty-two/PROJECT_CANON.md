# Forty-Two AI — Project Canon

**Last continuity checkpoint:** 2026-08-17 23:18 BRT (UTC-03:00)

## Canonical project

The active project is **`bobbygodias/Forty-Two-AI`**.

`bobbygodias/pocketpal-enterprise` is predecessor/derivation context only. It may be consulted for engineering history, but it must not be treated as the current canonical project.

The durable record of what is reused, learned, rejected and preserved from PocketPal/PocketPal Enterprise, MNN Chat and the MEGA 3 work lives in:

- `docs/forty-two/ENGINEERING_LINEAGE_AND_LESSONS.md`

## Canonical product identity

- Product name: **Forty-Two AI**
- Android launcher icon: metallic Forty-Two emblem without the wordmark
- Main logo/wordmark: metallic Forty-Two emblem + `Forty-Two AI`
- Splash/key visual: cinematic landscape composition with the emblem and wordmark
- Startup intro: `introFortyTwoAI.mp4` master preserved outside normal Git history until/if an optimized runtime derivative is integrated

The visual language and lore remain defined in `docs/forty-two/BRAND_AND_LORE.md`.

## Source masters preserved in Project Files

The current master artifacts are tracked by SHA-256 so they remain identifiable even if filenames change:

- icon master, 1254×1254 PNG: `deac206bf25232d763ad7d0fb34863cee98dd74f24b8e8915c80cd0275056a36`
- logo/wordmark master, 1254×1254 PNG: `b49a78296320da607b2ea61eb17ce14ef33c5fa518085b18a1ff9d0488729738`
- splash master, 1586×992 PNG: `07537b6d6abce8e5d0643fbb00c4139705e384e0aa7b6f4fda12f053594ae786`
- startup intro MP4, 688×752 H.264/AAC, ~12.04 s: `6ba07d556b4026824d333c8f24ad1f35b4f48ac1388f319231961f9756493419`
- Android launcher asset bundle: `6a9d522241cbd5dd18a30f45e8bb3bf43ca8fac40731831c550dd40331a85153`

## What belongs in Git

Version only artifacts required to build/reproduce the application:

- source code and build configuration;
- documentation and reproducibility metadata;
- optimized Android launcher resources actually consumed by builds;
- final runtime splash resource;
- final optimized intro asset if Forty-Two AI ships the video;
- small deterministic generated metadata when needed.

## What does NOT belong in normal Git history

Keep these in Project Files, release storage or CI artifacts instead:

- original/high-resolution branding masters when an optimized runtime derivative is enough;
- generated APK/AAB outputs;
- reference APKs from other applications;
- CI/build-log ZIP archives;
- redundant intermediates and experiments.

Current preserved reference-only artifacts:

- `mnn_chat_0_8_3.apk`, SHA-256 `eb249cabbf73b8b1567d7611715cad8f1cbf4df7be75cb447ea206f12f94ab14` — **reference only, not Forty-Two AI source or build output**;
- historical PocketPal Enterprise native build log, SHA-256 `5a473e425bb4a388b126a4dcb0417a93c05ad2197cd370d0b73ba465a2b7c9b7` — debugging/history only.

## Engineering continuity

Forty-Two AI is local-first and chat-first. The current acceleration target is the Blackview MEGA 3 / Mali-G57 MC2. CPU fallback must remain valid. Hardware capability detection must never be presented as proof that an inference backend is actually active: requested backend, effective backend and effective offload must be reported separately.

## Chronology rule

Human-readable project checkpoints and continuity documents should include an absolute **date + local time + timezone**. Git commit timestamps remain authoritative for code history. This avoids ambiguity when long chats freeze, resume later or are reconstructed from Project Files.

## Preservation rule

When a master is modified, optimized or regenerated, preserve the original in Project Files and document the derivative's role in the repository. Do not rely on chat history as the only record of project state.
