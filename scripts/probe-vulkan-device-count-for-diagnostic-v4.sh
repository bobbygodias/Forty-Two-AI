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
marker = 'FORTY_TWO_DIAGNOSTIC_V4_VULKAN_DEVICE_COUNT_PROBE'
if marker in text:
    print('Forty-Two diagnostic v4 Vulkan device-count probe already present')
    raise SystemExit(0)

# V3 proved that the Vulkan registry factory itself is safe on the MEGA 3.
# V4 advances exactly one API boundary: create the Vulkan registry and ask it
# how many devices it exposes. We deliberately do NOT call register_backend(),
# reg_dev_get(), device init, buffer allocation, or model offload.
pattern = re.compile(
    r'(?P<indent>^[ \t]*)register_backend\((?P<factory>(?P<prefix>lm_)?ggml_backend_vk_reg\(\))\);',
    re.MULTILINE,
)

match = pattern.search(text)
if not match:
    raise SystemExit('Could not locate Vulkan register_backend(...) call for V4 probe')

indent = match.group('indent')
factory = match.group('factory')
prefix = match.group('prefix') or ''
dev_count_fn = f'{prefix}ggml_backend_reg_dev_count'

# Verify the exact function name exists in this vendored/namespace-transformed
# source before patching, so a future llama.rn change fails loudly in CI.
if f'{dev_count_fn}(' not in text:
    raise SystemExit(f'Could not locate {dev_count_fn}(...) in ggml-backend-reg.cpp')

replacement = (
    f'{indent}// FORTY_TWO_DIAGNOSTIC_V4_VULKAN_DEVICE_COUNT_PROBE\n'
    f'{indent}// Factory + device-count only. No backend registration and no\n'
    f'{indent}// device retrieval/initialization/offload.\n'
    f'{indent}auto forty_two_vk_reg = {factory};\n'
    f'{indent}if (forty_two_vk_reg != nullptr) {{\n'
    f'{indent}    volatile size_t forty_two_vk_device_count = {dev_count_fn}(forty_two_vk_reg);\n'
    f'{indent}    (void) forty_two_vk_device_count;\n'
    f'{indent}}}'
)

patched, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Unexpected Vulkan V4 patch count: {count}')

path.write_text(patched)
print(f'Patched Vulkan V4 factory + device-count probe using {factory} and {dev_count_fn}')
PY
