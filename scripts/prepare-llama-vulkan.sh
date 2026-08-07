#!/usr/bin/env bash
set -euo pipefail

# PocketPal Enterprise / Blackview MEGA 3 Vulkan experiment.
#
# llama.rn 0.12.7 vendors llama.cpp b10054 but deliberately omits the Vulkan
# backend and its generated shaders. This script reconstructs that missing
# backend from the exact matching upstream tag, applies llama.rn's LM_ symbol
# namespace transformation, and enables Vulkan only on the ARM64 dotprod
# variant selected by the Helio G99 / Mali-G57 device.
#
# Nothing here replaces Android's Vulkan loader: libvulkan is resolved from
# the NDK/system just like a normal Android Vulkan application.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RNLLAMA_DIR="${ROOT_DIR}/node_modules/llama.rn"
UPSTREAM_TAG="b10054"
UPSTREAM_SHA="ac2557cb24def295888ef47f1a35b401d978c510"
WORK_DIR="${ROOT_DIR}/.enterprise-vulkan-build"
UPSTREAM_DIR="${WORK_DIR}/llama.cpp"
GEN_BUILD_DIR="${WORK_DIR}/shader-generator"
GEN_OUT_DIR="${WORK_DIR}/generated"
VULKAN_SRC_DIR="${RNLLAMA_DIR}/cpp/ggml-vulkan"
VULKAN_GEN_DIR="${RNLLAMA_DIR}/cpp/ggml-vulkan-generated"
THIRD_PARTY_DIR="${RNLLAMA_DIR}/cpp/enterprise-vulkan-headers"
RN_CMAKE="${RNLLAMA_DIR}/android/src/main/rnllama/CMakeLists.txt"

if [[ ! -f "${RNLLAMA_DIR}/package.json" ]]; then
  echo "llama.rn is not installed at ${RNLLAMA_DIR}" >&2
  exit 1
fi

node -e "const p=require('${RNLLAMA_DIR}/package.json'); if(p.version!=='0.12.7'){throw new Error('Expected llama.rn 0.12.7, found '+p.version)}"

for cmd in git cmake glslc python3; do
  command -v "${cmd}" >/dev/null 2>&1 || { echo "Missing required build tool: ${cmd}" >&2; exit 1; }
done

if [[ ! -f /usr/include/vulkan/vulkan.hpp ]]; then
  echo "Missing /usr/include/vulkan/vulkan.hpp (install libvulkan-dev)" >&2
  exit 1
fi
if [[ ! -f /usr/include/spirv/unified1/spirv.hpp ]]; then
  echo "Missing SPIR-V headers (install spirv-headers)" >&2
  exit 1
fi

rm -rf "${WORK_DIR}"
mkdir -p "${WORK_DIR}" "${GEN_OUT_DIR}" "${VULKAN_SRC_DIR}" "${VULKAN_GEN_DIR}" "${THIRD_PARTY_DIR}"

echo "==> Fetching llama.cpp ${UPSTREAM_TAG}"
git clone --quiet --depth 1 --branch "${UPSTREAM_TAG}" https://github.com/ggml-org/llama.cpp.git "${UPSTREAM_DIR}"
ACTUAL_SHA="$(git -C "${UPSTREAM_DIR}" rev-parse HEAD)"
if [[ "${ACTUAL_SHA}" != "${UPSTREAM_SHA}" ]]; then
  echo "Pinned llama.cpp mismatch: expected ${UPSTREAM_SHA}, got ${ACTUAL_SHA}" >&2
  exit 1
fi

SHADER_DIR="${UPSTREAM_DIR}/ggml/src/ggml-vulkan/vulkan-shaders"
echo "==> Building host Vulkan shader generator"
cmake -S "${SHADER_DIR}" -B "${GEN_BUILD_DIR}" -DCMAKE_BUILD_TYPE=Release >/dev/null
cmake --build "${GEN_BUILD_DIR}" --config Release -j "$(nproc)" >/dev/null
GENERATOR="${GEN_BUILD_DIR}/vulkan-shaders-gen"
if [[ ! -x "${GENERATOR}" ]]; then
  GENERATOR="$(find "${GEN_BUILD_DIR}" -type f -name vulkan-shaders-gen -perm -111 | head -n1)"
fi
[[ -x "${GENERATOR}" ]] || { echo "vulkan-shaders-gen was not produced" >&2; exit 1; }

HEADER="${GEN_OUT_DIR}/ggml-vulkan-shaders.hpp"
SPV_DIR="${GEN_OUT_DIR}/spv"
mkdir -p "${SPV_DIR}"
"${GENERATOR}" --output-dir "${SPV_DIR}" --target-hpp "${HEADER}"

count=0
while IFS= read -r -d '' shader; do
  base="$(basename "${shader}")"
  out_cpp="${GEN_OUT_DIR}/${base}.cpp"
  "${GENERATOR}" \
    --glslc "$(command -v glslc)" \
    --source "${shader}" \
    --output-dir "${SPV_DIR}" \
    --target-hpp "${HEADER}" \
    --target-cpp "${out_cpp}"
  count=$((count + 1))
done < <(find "${SHADER_DIR}" -maxdepth 1 -type f -name '*.comp' -print0 | sort -z)

if [[ "${count}" -lt 1 ]]; then
  echo "No Vulkan shaders were generated" >&2
  exit 1
fi

echo "==> Installing Vulkan backend + ${count} generated shader translation units"
rm -rf "${VULKAN_SRC_DIR}" "${VULKAN_GEN_DIR}" "${THIRD_PARTY_DIR}"
mkdir -p "${VULKAN_SRC_DIR}" "${VULKAN_GEN_DIR}" "${THIRD_PARTY_DIR}/vulkan" "${THIRD_PARTY_DIR}/spirv"
cp "${UPSTREAM_DIR}/ggml/src/ggml-vulkan/ggml-vulkan.cpp" "${VULKAN_SRC_DIR}/ggml-vulkan.cpp"
cp "${UPSTREAM_DIR}/ggml/include/ggml-vulkan.h" "${RNLLAMA_DIR}/cpp/ggml-vulkan.h"
cp "${HEADER}" "${VULKAN_GEN_DIR}/ggml-vulkan-shaders.hpp"
cp "${GEN_OUT_DIR}"/*.comp.cpp "${VULKAN_GEN_DIR}/"
cp -a /usr/include/vulkan/. "${THIRD_PARTY_DIR}/vulkan/"
cp -a /usr/include/spirv/. "${THIRD_PARTY_DIR}/spirv/"

# llama.rn namespaces its vendored ggml symbols so it can coexist with other
# RN native modules. Apply the same transformations bootstrap.sh uses.
python3 - "${RNLLAMA_DIR}/cpp/ggml-vulkan.h" "${VULKAN_SRC_DIR}" "${VULKAN_GEN_DIR}" <<'PY'
from pathlib import Path
import sys

roots = [Path(p) for p in sys.argv[1:]]
files = []
for root in roots:
    if root.is_file():
        files.append(root)
    else:
        files.extend(p for p in root.rglob('*') if p.is_file() and p.suffix in {'.c', '.cc', '.cpp', '.h', '.hpp'})

for path in files:
    text = path.read_text()
    text = text.replace('GGML_', 'LM_GGML_')
    text = text.replace('ggml_', 'lm_ggml_')
    text = text.replace('GGUF_', 'LM_GGUF_')
    text = text.replace('gguf_', 'lm_gguf_')
    path.write_text(text)
PY

# Add a narrowly-scoped Vulkan block to llama.rn's source-build CMake. It is
# attached only to rnllama_v8_2_dotprod, which is the variant Android already
# selects on the MEGA 3 (DotProd yes, I8MM no). CPU remains compiled into the
# same library and remains selectable/fallback-safe.
python3 - "${RN_CMAKE}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = '# POCKETPAL_ENTERPRISE_VULKAN_BEGIN'
if marker in text:
    print('Vulkan CMake patch already present')
    raise SystemExit(0)

needle = '    # Optimize for size and performance\n'
if needle not in text:
    raise SystemExit('Could not locate llama.rn optimization block for Vulkan patch')

block = r'''    # POCKETPAL_ENTERPRISE_VULKAN_BEGIN
    # llama.rn 0.12.7 does not ship an Android Vulkan target. For the MEGA 3
    # experiment we add Vulkan to the existing dotprod ARM64 variant instead
    # of inventing a second runtime ABI. CPU is still compiled in this target.
    if (RNLLAMA_ENABLE_VULKAN AND "${target_name}" STREQUAL "rnllama_v8_2_dotprod")
        find_library(VULKAN_SYSTEM_LIB vulkan)
        if (NOT VULKAN_SYSTEM_LIB)
            message(FATAL_ERROR "Android system Vulkan loader was not found")
        endif()

        file(GLOB ENTERPRISE_VULKAN_SHADER_CPP CONFIGURE_DEPENDS
            ${RNLLAMA_LIB_DIR}/ggml-vulkan-generated/*.comp.cpp)
        if (NOT ENTERPRISE_VULKAN_SHADER_CPP)
            message(FATAL_ERROR "PocketPal Enterprise Vulkan shader sources were not generated")
        endif()

        target_sources(${target_name} PRIVATE
            ${RNLLAMA_LIB_DIR}/ggml-vulkan/ggml-vulkan.cpp
            ${ENTERPRISE_VULKAN_SHADER_CPP}
        )
        target_include_directories(${target_name} PRIVATE
            ${RNLLAMA_LIB_DIR}
            ${RNLLAMA_LIB_DIR}/ggml-vulkan-generated
            ${RNLLAMA_LIB_DIR}/enterprise-vulkan-headers
        )
        target_compile_options(${target_name} PRIVATE -DLM_GGML_USE_VULKAN)
        target_link_libraries(${target_name} PRIVATE ${VULKAN_SYSTEM_LIB})
        message(STATUS "PocketPal Enterprise: Vulkan enabled for ${target_name}")
    endif()
    # POCKETPAL_ENTERPRISE_VULKAN_END

'''
path.write_text(text.replace(needle, block + needle, 1))
PY

echo "==> Vulkan preparation complete"
echo "    llama.cpp: ${UPSTREAM_TAG} (${UPSTREAM_SHA})"
echo "    target: rnllama_v8_2_dotprod"
echo "    shaders: ${count}"
