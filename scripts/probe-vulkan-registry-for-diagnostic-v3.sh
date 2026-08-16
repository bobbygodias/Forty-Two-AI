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

# Keep this deliberately tolerant of llama.rn's namespace transform. The
# previous V3 script tried to match the whole preprocessor/env-var block and
# was too brittle. For the A/B experiment we only need to replace the actual
# register_backend(vk_reg()) call with a factory-only call, preserving whatever
# surrounding #ifdef / getenv logic this exact llama.rn source contains.
pattern = re.compile(
    r'(?P<indent>^[ \t]*)register_backend\((?P<factory>(?:lm_)?ggml_backend_vk_reg\(\))\);',
    re.MULTILINE,
)

match = pattern.search(text)
if not match:
    raise SystemExit('Could not locate Vulkan register_backend(...) call for V3 probe')

indent = match.group('indent')
factory = match.group('factory')
replacement = (
    f'{indent}// FORTY_TWO_DIAGNOSTIC_V3_VULKAN_REGISTRY_PROBE\n'
    f'{indent}// Factory-only A/B probe: execute Vulkan registry creation, but do\n'
    f'{indent}// not register it and therefore do not enumerate/expose GPU devices.\n'
    f'{indent}auto forty_two_vk_reg = {factory};\n'
    f'{indent}(void) forty_two_vk_reg;'
)

patched, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Unexpected Vulkan patch count: {count}')

path.write_text(patched)
print(f'Patched Vulkan registry factory-only probe using {factory}')
PY
