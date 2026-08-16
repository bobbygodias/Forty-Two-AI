#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RNLLAMA_JAVA="${ROOT_DIR}/node_modules/llama.rn/android/src/main/java/com/rnllama/RNLlama.java"

if [[ ! -f "${RNLLAMA_JAVA}" ]]; then
  echo "RNLlama.java not found at ${RNLLAMA_JAVA}" >&2
  exit 1
fi

python3 - "${RNLLAMA_JAVA}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = 'FORTY_TWO_DIAGNOSTIC_V2_DISABLE_VULKAN'
if marker in text:
    print('Forty-Two diagnostic v2 Vulkan-disable patch already present')
    raise SystemExit(0)

needle = '    if (libsLoaded) return true;\n\n'
if needle not in text:
    raise SystemExit('Could not locate RNLlama.loadNative() libsLoaded guard')

block = '''    // FORTY_TWO_DIAGNOSTIC_V2_DISABLE_VULKAN\n    // A/B diagnostic build: keep the same DotProd binary with Vulkan compiled in,\n    // but prevent ggml from registering the Vulkan backend at runtime. If model\n    // loading stops crashing on the MEGA 3, the failure is isolated to the\n    // Vulkan registration/initialization path rather than generic CPU loading.\n    try {\n      android.system.Os.setenv("LM_GGML_DISABLE_VULKAN", "1", true);\n      Log.w(TAG, "Forty-Two diagnostic v2: Vulkan backend runtime-disabled");\n    } catch (android.system.ErrnoException e) {\n      Log.e(TAG, "Forty-Two diagnostic v2: failed to disable Vulkan", e);\n    }\n\n'''

path.write_text(text.replace(needle, needle + block, 1))
print('Patched RNLlama.loadNative() to set LM_GGML_DISABLE_VULKAN=1')
PY
