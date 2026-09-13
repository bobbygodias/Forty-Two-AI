# Forty-Two AI — Project Files Audit

**Checkpoint:** 2026-08-18 00:05 BRT (UTC-03:00)

## Canonical project

`bobbygodias/Forty-Two-AI`

## Preservation snapshot

Current cumulative Project Files archive:

- `Forty-Two-AI_Project_Preservation_2026-08-18_v3.zip`
- SHA-256: `2674d43d4e6b9fa0f5e2bacc481c47834197b4ec33a2559fe23884516cdc7c4e`

The archive belongs in Project Files/preservation storage, not normal Git history.

## Important additions after v2

### Forty-Two AI MEGA 3 Vulkan Test-03

- artifact: `Forty-Two-AI-MEGA3-Vulkan-Test-03.apk`
- SHA-256: `c2c6a29a6a803cd76362b379e0ad4f6dee5149f3c3cd172e9fcfbc80e4d01091`
- preserved as a test APK, not source code;
- contains ARM64 `librnllama_v8_2_dotprod.so` with Vulkan symbols/backend code.

### Successful native build log

- archive SHA-256: `258dacac74db6290ca89fed021297b59b262f4acc08deca44bb8e556c60f2fd6`
- `enterprise-build.log` records `BUILD SUCCESSFUL in 27m 57s`.
- distinct from the older failed/historical native-build log preserved for debugging history.

### Design/evidence material

Project Files v3 also preserves:

- the two Gemini UI concepts used as visual-direction references only;
- MEGA 3/AIDA64/PocketPal hardware and benchmark screenshots supporting the recorded device profile and CPU baselines;
- non-canonical branding alternates so design history is not lost.

## Deliberately excluded from product preservation

The ChatGPT usage-limit screenshot is operational conversation context, not a Forty-Two AI product artifact.

## Policy

Project Files: masters, evidence, reference APKs, test APKs and historical logs.

Git: source, build configuration, reproducibility metadata and optimized runtime assets actually consumed by Forty-Two AI.
