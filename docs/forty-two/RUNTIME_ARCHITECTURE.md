# Forty-Two Runtime Layer

> **NÃO ENTRE EM PÂNICO.** O usuário não deveria precisar saber o que é um backend para obter o melhor backend disponível.

## Objetivo

O Forty-Two AI deve escolher a forma de execução a partir de **capacidade comprovada do hardware + compatibilidade real do modelo + suporte real da engine**, e não pelo nome comercial do aparelho nem por um botão genérico de “GPU”.

O modo padrão do usuário é **Automático**. Controles de CPU, accelerator-strict e balanced pertencem ao painel avançado/diagnóstico.

---

## Fluxo principal

```text
Usuário escolhe/baixa um modelo
              │
              ▼
       Model Profiler
   formato / quantização /
   tamanho / layers / RAM
              │
              ├─────────────────────┐
              │                     │
              ▼                     ▼
     Hardware Profiler       Runtime Adapters
   CPU / RAM / GPU / NPU     GGML / MNN / ...
   Vulkan / OpenCL / etc.           │
              │                     │
              └──────────┬──────────┘
                         ▼
                 Execution Planner
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   CPU-only       Accelerator-only      Hybrid
                                         │
                                layer/operator split
                                         │
                                         ▼
                                  Runtime Adapter
                                         │
                                         ▼
                                  Native Runtime
                                         │
                                         ▼
                                      Tokens
```

A UI não escolhe a engine. Ela pede uma sessão ao RuntimeManager.

---

## Regra fundamental

```text
DETECÇÃO ≠ DISPONIBILIDADE ≠ EXECUÇÃO
```

Exemplo:

```text
GPU física encontrada
        │
        ▼
API encontrada (Vulkan/OpenCL)
        │
        ▼
microprobe de compute passou?
        │
       não ───────────────► NÃO É BACKEND EXECUTÁVEL
        │
       sim
        ▼
engine suporta modelo + API?
        │
       não ───────────────► escolha outra engine/CPU
        │
       sim
        ▼
criar plano
        │
        ▼
carregar modelo
        │
        ▼
telemetria confirma trabalho real?
        │
       não ───────────────► não chamar de GPU/híbrido
        │
       sim
        ▼
backend efetivo confirmado
```

O nome da GPU pode ser exibido no diagnóstico. **Nunca deve ser a condição lógica que escolhe o backend.**

---

## Funções centrais

### `CapabilityRegistry.profile()`

```text
profile()
   │
   ├── probeCpu()
   │      ├─ arch
   │      ├─ cores
   │      ├─ fp16
   │      ├─ dotprod
   │      └─ i8mm
   │
   ├── probeMemory()
   │      ├─ total
   │      └─ available
   │
   └── accelerator probes (paralelo)
          ├─ VulkanProbe
          ├─ OpenCLProbe
          ├─ NpuProbe
          └─ outros
                │
                ▼
       DeviceCapabilityProfile
```

O probe de accelerator deve distinguir:

```text
enumerou dispositivo ────────► available = true
executou microkernel válido ─► computeVerified = true
```

Somente `computeVerified=true` autoriza o planner a preferir aquele accelerator automaticamente.

### `RuntimeManager.inspectSupport(model, device)`

```text
                  model + device
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 GGMLAdapter       MNNAdapter       Outros...
 inspectSupport    inspectSupport    inspectSupport
       │               │               │
       └───────────────┼───────────────┘
                       ▼
              RuntimeSupport[]
```

Cada adapter responde apenas pelo que realmente sabe executar.

### `planExecution()`

```text
model + capability profile + runtime support + policy
                         │
                         ▼
                há runtime compatível?
                    │          │
                   não        sim
                    │          │
                   erro        ▼
                         policy = CPU?
                           │       │
                          sim     não
                           │       │
                           ▼       ▼
                         CPU    accelerator
                                verificado?
                                  │     │
                                 não   sim
                                  │     │
                                  ▼     ▼
                                 CPU   política?
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                     strict       balanced      automatic
                         │            │            │
                         ▼            ▼            ▼
                   GPU/NPU only   split real   accelerator
                   sem fallback   se suportado  + recovery
```

---

## O que “Hybrid” significa

Hybrid **não é um número de layers escolhido pela UI**.

Ele só existe quando a engine realmente executa trabalho em mais de um tipo de dispositivo.

```text
Plano solicitado: Balanced
          │
          ▼
adapter suporta partition?
    │                  │
   não                sim
    │                  │
    ▼                  ▼
melhor caminho     criar split
único disponível      │
                      ▼
                 executar sessão
                      │
                      ▼
             telemetria confirma:
             CPU trabalhou?  ✓
             GPU/NPU trabalhou? ✓
                      │
                      ▼
                HYBRID REAL
```

Se a GPU falhar e tudo cair para CPU, a UI deve dizer **CPU (fallback)** — nunca “Hybrid”.

---

## Políticas do usuário

### Automático — padrão

```text
Usuário
  │
  └── escolhe modelo
          │
          ▼
Forty-Two decide sozinho
```

Objetivo: menos botões, menos conhecimento obrigatório, menor carga cognitiva.

### CPU

Compatibilidade/diagnóstico. Força CPU.

### Accelerator Strict

Modo de laboratório:

```text
GPU/NPU requerida
      │
operador/backend falhou
      │
      ▼
     ERRO
```

**Zero fallback silencioso.** Serve para provar que o accelerator está realmente funcionando.

### Balanced

Permite divisão deliberada de trabalho quando o adapter suporta partition e ela fizer sentido para memória/compatibilidade.

---

## Adapters

A camada superior nunca chama uma engine diretamente.

```text
                 Forty-Two Runtime API
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     GGMLAdapter     MNNAdapter    ExecuTorchAdapter
          │              │              │
          ▼              ▼              ▼
    llama.cpp/...       MNN          ExecuTorch
```

Contrato inicial:

```text
RuntimeAdapter
 ├─ inspectSupport(model, device)
 └─ load(request)
       │
       ▼
 RuntimeSession
 ├─ complete()
 ├─ stop()
 ├─ unload()
 └─ telemetry
```

A UI conversa com `RuntimeSession`, não com `LlamaContext`, `MNN::Interpreter` ou qualquer implementação específica.

---

## Telemetria obrigatória

Toda sessão local deve poder responder:

```text
qual adapter foi usado?
qual estratégia foi solicitada?
qual estratégia realmente aconteceu?
quais devices realmente trabalharam?
houve fallback?
por quê?
quanto de memória foi usado?
prefill/decode?
```

Isso torna impossível confundir intenção com execução.

---

## Migração sem quebrar o que funciona

```text
FASE 0 (agora)
main atual continua funcionando
          │
          └── branch runtime/orchestrator-v1

FASE 1
interfaces + planner + probes
SEM alterar inferência existente

FASE 2
GGMLAdapter envolve o caminho atual
          │
          ▼
mesmo comportamento / mesma performance
          │
          ▼
regression tests passam

FASE 3
ModelStore deixa de importar runtime concreto
          │
          ▼
RuntimeManager vira fronteira única

FASE 4
segundo adapter experimental
(MNN / ExecuTorch / outro escolhido após estudo)

FASE 5
microprobes + planner automático

FASE 6
UI simplificada:
Automático por padrão
capô técnico opcional
```

Não removeremos o caminho atual antes que o `GGMLAdapter` reproduza seu comportamento conhecido.

---

## Princípio de UX

```text
complexidade do hardware
        +
complexidade das engines
        +
complexidade dos formatos
        │
        ▼
     Forty-Two
        │
        ▼
   uma decisão simples
        │
        ▼
      funciona
```

O usuário quer conversar com o modelo, não escolher entre quinze APIs de compute.

**A complexidade deve existir dentro do produto para desaparecer da frente do usuário.**
