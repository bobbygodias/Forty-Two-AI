# Review checkpoint — 2026-09-13

Estado salvo para evitar retrabalho caso a sessão/plataforma interrompa a análise.

## Forty-Two-AI

- PR #1 `runtime/orchestrator-v1`: aberto, draft, mergeable.
- PR #2 `ui/forty-two-chat-shell-v1`: aberto, draft, mergeable.
- Interseção conhecida entre os dois PRs: `src/store/EnterpriseRuntimeStore.ts`; a alteração observada nos dois é apenas a mesma formatação de linha, sem divergência lógica conhecida.
- PR #2: último CI verificado está verde no pipeline de qualidade e no Android CI.
- PR #1: Android CI do HEAD está verde; o pipeline de qualidade histórico do mesmo HEAD falhou apenas em `Unit tests`. O próximo passo é identificar o teste exato antes de tocar no código.
- Não aplicar patches de `waitFor`/`mounted` por hipótese. O projeto atual usa React 19.1.1, e `waitFor` não vem do retorno de `render()` no Testing Library usado pelo projeto.

## PeterDrummer

- PR #3 legado Unity: fechado sem merge.
- PR #9 `MEGA 3 Split Rescue v0.1`: fechado sem merge; era explicitamente uma branch temporária de build.
- PR #8 `feature/even-flow-engine-v0.2-public`: preservado, aberto em draft e mergeable.
- Não usar `Shizuku.newProcess()` privado/reflexão como arquitetura permanente. Se o resgate da tela continuar, o desenho precisa evitar dependência estrutural de API privada do Shizuku.

## vox-tts

- PR #3 revisado: licença do modelo permanece metadado verificável, sem impor `noncommercial=true` como política global do motor.
- Testes adicionados para aceitar `noncommercial=true|false` e rejeitar valor não booleano.
- CI verde em Python 3.12 e 3.13.
- PR #3 squash-merged com commit `ca613e90e7a429b6fd56b0dda25afbacfecbbc96`.

## Próxima ação

1. Forty-Two PR #1: obter o erro real do job de testes unitários do run `32087973962`, job `95564333613`.
2. Classificar como falha histórica, teste obsoleto ou bug atual.
3. Só então corrigir e revalidar CI.
4. Reconciliar PR #1 e #2 de forma controlada, sem merge cego.
