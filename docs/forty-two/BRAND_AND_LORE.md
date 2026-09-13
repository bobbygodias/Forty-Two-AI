# Forty-Two AI — Brand & Lore

## Premissa

Forty-Two AI deve parecer um produto próprio antes de parecer uma referência cultural. O número 42 e os acenos a *O Guia do Mochileiro das Galáxias* funcionam como uma segunda camada: quem não conhece entende a interface; quem conhece sorri.

A regra é simples: **clareza primeiro, piada depois**.

Há também uma regra de experiência: **abrir, usar, fechar e sair um pouco melhor do que entrou**. O produto pode ser tecnicamente rigoroso sem ser sisudo. Humor, familiaridade e pequenas referências culturais existem para produzir humanidade e alegria — nunca para esconder risco, erro ou decisão técnica.

## Identidade visual

Direção visual canônica do projeto:

- preto e grafite como base;
- metal escovado e prata no símbolo;
- luz branca contida no núcleo;
- ciano/aqua e roxo como acentos de interface, não como tinta sobre o logo;
- glow controlado, nunca neon gratuito;
- hierarquia limpa e legível em tablet landscape;
- chat como superfície principal;
- diagnóstico técnico deve parecer instrumento, não decoração;
- logo oficial: **Forty-Two AI canônico**, preservado sem recolorações arbitrárias ou simplificações que destruam o desenho.

O asset de apresentação do repositório vive em `assets/branding/forty-two-ai-logo.webp`. Derivados para ícones, splash, documentação e distribuição devem preservar composição, proporção, contraste e leitura do original.

## Linguagem

A voz do produto pode ser seca, inteligente, humana e discretamente absurda, mas nunca pode atrapalhar uma decisão técnica.

### Referência principal — O Guia do Mochileiro das Galáxias

**NÃO ENTRE EM PÂNICO**  
Para onboarding, erros recuperáveis, estados de espera, Laboratory/Advanced e situações em que a ação correta é clara.

**42**  
Pode surgir como easter egg em versões experimentais, mensagens internas, números de exemplo e pequenos detalhes visuais. Não forçar o número em parâmetros reais só pela piada.

**Majoritariamente inofensivo**  
Boa etiqueta para recursos experimentais, builds de laboratório, páginas About/Diagnostics ou estados que mereçam uma piscadela sem esconder risco real.

**Até mais, e obrigado pelos peixes!**  
Adequado para créditos, About, encerramentos, remoção concluída, despedidas e outros finais leves. Usar com parcimônia para que continue especial.

### Outras referências de cultura pop

Referências clássicas podem aparecer em nomes secundários de presets, frases curtas, tooltips, easter eggs e mensagens de estado. Exemplos de universos adequados incluem *O Exterminador do Futuro*, *De Volta para o Futuro*, *Star Trek*, *Blade Runner* e outros clássicos compatíveis com o tom do projeto.

Elas devem funcionar como uma segunda camada: o nome funcional vem primeiro quando a referência isolada puder confundir.

Exemplo:

```text
Alto desempenho
Modo Exterminador
```

ou, quando o contexto deixar inequívoco:

```text
Modo Exterminador
Máximo desempenho permitido pelo perfil térmico atual.
```

**Star Wars não faz parte do repertório do Forty-Two AI.**

## Princípio de UX — comum e alienígena

O usuário comum não deve precisar aprender runtimes, backends, quantização, Vulkan, OpenCL, NPU ou distribuição de layers para conversar com um modelo.

O usuário avançado deve poder abrir o capô e controlar tudo que seja tecnicamente razoável.

```text
Usuário comum
     │
     ▼
Baixar modelo
     │
     ▼
Automático
     │
     ▼
Pronto

Alien / nerd / laboratório
     │
     ▼
Advanced Runtime Controls
     │
     ├─ presets
     ├─ runtime
     ├─ accelerator
     ├─ partition
     ├─ memória
     ├─ fallback
     └─ telemetria real
```

O produto absorve complexidade; não remove autonomia.

## Onde NÃO usar humor

Não usar lore para mascarar ou suavizar informação necessária em:

- perda ou corrupção de dados;
- exclusão destrutiva;
- credenciais e segredos;
- permissões de câmera, microfone, arquivos ou rede;
- memória insuficiente;
- thermal throttling crítico;
- crashes;
- estado real de execução;
- confirmação de capacidade de hardware;
- envio de conteúdo para a internet ou terceiros.

Nesses casos, primeiro mostrar o fato. O humor, se houver, vem depois e nunca substitui causa, consequência ou consentimento.

## Vocabulário técnico

Distinguir sempre:

- **capacidade detectada** de **capacidade realmente disponível**;
- **backend solicitado** de **backend efetivo**;
- **configuração solicitada** de **configuração realmente aplicada**;
- **capacidade declarada** de **execução comprovada**.

Forty-Two AI deve dizer o que está acontecendo de verdade. Instrumentação existe para reduzir mistério, não para produzir uma animação verde reconfortante.

## Regra final

Se uma referência fizer uma pessoa que conhece o original sorrir sem deixar uma pessoa que não conhece confusa, ela provavelmente está no lugar certo.

Se a referência esconder risco, exigir conhecimento prévio ou prejudicar clareza, está no lugar errado.

**NÃO ENTRE EM PÂNICO.**
