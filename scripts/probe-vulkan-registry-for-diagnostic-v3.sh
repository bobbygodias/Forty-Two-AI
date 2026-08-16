#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY_CPP="${ROOT_DIR}/node_modules/llama.rn/cpp/ggml-backend-reg.cpp"

if [[ ! -f "${REGISTRY_CPP}" ]]; then
  echo "ggml-backend-reg.cpp not found at ${REGISTRY_CPP}" >&2
  exit 1
fi

python3 - "${REGISTRY_CPP}" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = 'FORTY_TWO_DIAGNOSTIC_V3_VULKAN_REGISTRY_PROBE'
if marker in text:
    print('Forty-Two diagnostic v3 Vulkan registry probe already present')
    raise SystemExit(0)

pattern = re.compile(
    r'#ifdef LM_GGML_USE_VULKAN\s*\n'
    r'\s*if \(getenv\("LM_GGML_DISABLE_VULKAN"\) == nullptr\) \{\s*\n'
    r'\s*register_backend\(lm_ggml_backend_vk_reg\(\)\);\s*\n'
    r'\s*\} else \{\s*\n'
    r'\s*LM_GGML_LOG_DEBUG\("Vulkan backend disabled by LM_GGML_DISABLE_VULKAN environment variable\\n"\);\s*\n'
    r'\s*\}\s*\n'
    r'#endif'
)

replacement = r'''#ifdef LM_GGML_USE_VULKAN
        // FORTY_TWO_DIAGNOSTIC_V3_VULKAN_REGISTRY_PROBE
        // Binary-search the Android/Mali crash path. V2 proved that skipping
        // Vulkan entirely makes the same DotProd build stable. V3 executes
        // only the Vulkan registry factory, but intentionally does NOT add the
        // returned registry to ggml's backend list and therefore does not call
        // reg_dev_count/reg_dev_get or expose a GPU device to model loading.
        //
        // Result interpretation on the MEGA 3:
        //   - crash: lm_ggml_backend_vk_reg() / its static initialization is enough
        //   - stable: failure is later, in register_backend/device enumeration/use
        LM_GGML_LOG_WARN("Forty-Two V3: entering Vulkan registry-factory probe\n");
        lm_ggml_backend_reg_t forty_two_vk_reg = lm_ggml_backend_vk_reg();
        if (forty_two_vk_reg != nullptr) {
            LM_GGML_LOG_WARN("Forty-Two V3: Vulkan registry factory returned non-null; device enumeration intentionally skipped\n");
        } else {
            LM_GGML_LOG_WARN("Forty-Two V3: Vulkan registry factory returned null\n");
        }
#endif'''

patched, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not locate the llama.rn Vulkan registry block for V3 probe')

path.write_text(patched)
print('Patched ggml backend registry for Forty-Two diagnostic v3 factory-only Vulkan probe')
PY
