# Forty-Two AI — Project Canon

**Last continuity checkpoint:** 2026-09-02 07:07 BRT (UTC-03:00)

## Canonical project

The active project is **`bobbygodias/Forty-Two-AI`**.

`bobbygodias/pocketpal-enterprise` is predecessor/derivation context only. It may be consulted for engineering history, but it must not be treated as the current canonical project.

The durable project continuity record is split deliberately:

- `docs/forty-two/ENGINEERING_LINEAGE_AND_LESSONS.md` — what is reused, learned, rejected and preserved from PocketPal/PocketPal Enterprise, MNN Chat and the MEGA 3 work;
- `docs/forty-two/JOY_UX_AND_REFERENCES.md` — the human/joy objective, microcopy/easter-egg policy, reference hierarchy, serious-warning rules, internet-access warning policy and explicit **no-Star-Wars** constraint;
- `docs/forty-two/BRAND_AND_LORE.md` — visual language and Forty-Two/Hitchhiker lore.

## Canonical product identity

- Product name: **Forty-Two AI**
- Android launcher icon: metallic Forty-Two emblem without the wordmark
- Main logo/wordmark: metallic Forty-Two emblem + `Forty-Two AI`
- Splash/key visual: cinematic landscape composition with the emblem and wordmark
- Startup intro: `introFortyTwoAI.mp4` master preserved outside normal Git history until/if an optimized runtime derivative is integrated

## Human product objective

Forty-Two AI is not intended to be only a technically competent local inference shell. When appropriate, the experience should leave the user a little lighter, more amused or more curious than when they opened it, without making therapeutic claims, forcing cheerfulness or hiding serious information behind humor.

Cultural references are optional delight, never required knowledge for using the interface.

Star Trek references are welcome. The Hitchhiker’s Guide to the Galaxy is canonical to the Forty-Two identity. **Star Wars references are explicitly excluded.**

## Source masters preserved in Project Files

The current master artifacts are tracked by SHA-256 so they remain identifiable even if filenames change:

- icon master, 1254×1254 PNG: `deac206bf25232d763ad7d0fb34863cee98dd74f24b8e8915c80cd0275056a36`
- logo/wordmark master, 1254×1254 PNG: `b49a78296320da607b2ea61eb17ce14ef33c5fa518085b18a1ff9d0488729738`
- splash master, 1586×992 PNG: `07537b6d6abce8e5d0643fbb00c4139705e384e0aa7b6f4fda12f053594ae786`
- startup intro MP4, 688×752 H.264/AAC, ~12.04 s: `6ba07d556b4026824d333c8f24ad1f35b4f48ac1388f319231961f9756493419`
- Android launcher asset bundle, added to Project Files as `Forty Two AI icons.zip`: `2786a44e36b0572e42041a980d25e85a0bede6f8bfa7f67f9970762847e9c4ca`

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

## Active implementation state

- Canonical `main` observed at `3a311bd36469b2584ae518537b45339bdbbc550a`.
- Draft PR #1, branch `runtime/orchestrator-v1`, remains the isolated runtime-orchestrator foundation; its observed head is `c41e1438440291b8ee34e3a6dd58ee8f814be767`.
- Draft PR #2, branch `ui/forty-two-chat-shell-v1`, is the active UI integration line. The current slice starts from `9cf72644b189965fdec333d93a00607c3fe811c5` and installs the official Android launcher assets, adaptive-icon definitions, Play Store derivative and direct quick-panel access to the existing model/Pal picker and generation parameters.
- The UI slice does not modify the Kotlin/JNI bridge or claim Vulkan execution. Runtime integration remains separate until the branches are reconciled deliberately and effective-backend telemetry is verified on device.

### Verification at this checkpoint

- TypeScript compilation: passed.
- Repository ESLint: passed with 0 errors and 7 pre-existing warnings in unrelated files.
- Localization and bundled-font validation: passed.
- `ChatHeader` and `HeaderRight` callback-routing tests: 13 passed.
- Android launcher dimensions, PNG readability, XML parsing and resource-variant inventory: passed.
- Local Gradle resource processing: not completed because the isolated environment could not reach `services.gradle.org` to download Gradle 9.0.0; repository CI is the authoritative next build check.

## Chronology rule

Human-readable project checkpoints and continuity documents should include an absolute **date + local time + timezone**. Git commit timestamps remain authoritative for code history. This avoids ambiguity when long chats freeze, resume later or are reconstructed from Project Files.

## Preservation rule

When a master is modified, optimized or regenerated, preserve the original in Project Files and document the derivative's role in the repository. Do not rely on chat history as the only record of project state.
