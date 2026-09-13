# Review checkpoint — 2026-09-13

Estado salvo para evitar retrabalho caso a sessão/plataforma interrompa a análise.

## Forty-Two-AI

- PR #2 `ui/forty-two-chat-shell-v1`: **mergeado em `main`** com merge commit `66e4e9ed7b9dd291054b49eb04ffebffe7fb8456`.
- PR #1 `runtime/orchestrator-v1`: aberto, draft, mergeable; HEAD atual `79a19946d080cac2a958aadaa8751dd75747f36c`.
- O runtime foi reconciliado com o `main` atual, que já contém a UI do Forty-Two.
- A divergência compartilhada em `src/store/EnterpriseRuntimeStore.ts` foi resolvida sem sobrescrever a versão atual da UI/store.
- O diff do PR #1 ficou restrito ao runtime/documentação e está 0 commits atrás de `main`.
- O CI de qualidade fresco do HEAD reconciliado passou validação de localização, fontes, TypeScript, lint e a suíte completa de testes/coverage.
- A falha histórica de `ChatHeaderTitle` no run antigo não representa bug atual do runtime e não deve ser corrigida com workarounds especulativos de MobX/async.
- O PR #1 permanece draft porque ainda falta demonstrar paridade completa entre `LlamaRnBridge` e os caminhos atuais de `ModelStore.initContext()`, incluindo settings resolvidos e casos multimodais/projection.
- O próximo gate relevante é o Android ARM64/Vulkan e, depois, prova de paridade do bridge antes de qualquer cutover de produção.

## PeterDrummer

- PR #3 legado Unity: fechado sem merge.
- PR #9 `MEGA 3 Split Rescue v0.1`: fechado sem merge; era branch temporária de build.
- PR #8 `feature/even-flow-engine-v0.2-public`: preservado, aberto em draft e mergeable.
- Não usar `Shizuku.newProcess()` privado/reflexão como arquitetura permanente. O resgate de tela deve evoluir sem dependência estrutural de API privada do Shizuku.

## vox-tts

- PR #3 revisado para tratar a licença do modelo como metadado verificável, sem impor `noncommercial=true` como política global do motor.
- Testes cobrem `noncommercial=true|false` e rejeitam valor não booleano.
- CI verde em Python 3.12 e 3.13.
- PR #3 squash-merged com commit `ca613e90e7a429b6fd56b0dda25afbacfecbbc96`.

## Próxima ação

1. Verificar o Android ARM64/Vulkan CI do PR #1 no HEAD atual.
2. Se verde, revisar `LlamaRnBridge` versus `ModelStore.initContext()` e mapear qualquer diferença de settings/casos multimodais.
3. Manter PR #1 em draft até a paridade ser demonstrada.
4. Não reabrir investigação sobre os testes históricos de `ChatHeaderTitle` sem nova evidência.
