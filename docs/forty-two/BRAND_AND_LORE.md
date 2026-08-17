# Forty-Two AI — Brand & Lore

## Premissa

Forty-Two AI deve parecer um produto próprio antes de parecer uma referência cultural. O número 42 e os acenos a *O Guia do Mochileiro das Galáxias* funcionam como uma segunda camada: quem não conhece entende a interface; quem conhece sorri.

A regra é simples: **clareza primeiro, piada depois**.

## Identidade visual

Direção visual canônica do projeto:

- fundo grafite/preto;
- ciano/aqua como cor primária;
- roxo como cor secundária;
- glow contido, nunca neon gratuito;
- hierarquia limpa e legível em tablet landscape;
- chat como superfície principal;
- diagnóstico técnico deve parecer instrumento, não decoração;
- logo oficial: **FortyTwoAI canônico**, sem reaproveitar ou recolorir o ícone do PocketPal.

O logo-fonte deve viver em `assets/branding/` e gerar os derivados de Android, iOS, splash, documentação e distribuição. Não reconstruir de memória quando o asset original puder ser preservado.

## Linguagem

A voz do produto pode ser seca, inteligente e discretamente absurda, mas nunca pode atrapalhar uma decisão técnica.

### Referências aprovadas

**NÃO ENTRE EM PÂNICO**  
Para onboarding, erros recuperáveis, fallback de backend e situações em que a ação correta é clara.

**42**  
Pode surgir como easter egg em versões experimentais, mensagens internas, números de exemplo e pequenos detalhes visuais. Não forçar o número em parâmetros reais de inferência.

**Majoritariamente inofensivo**  
Boa etiqueta para recursos experimentais, builds de laboratório, páginas About/Diagnostics ou estados que mereçam uma piscadela sem esconder risco real.

**E obrigado pelos peixes**  
Adequado para créditos, About, encerramentos, remoção concluída ou despedidas. Usar com parcimônia.

## Onde NÃO usar humor

Não usar lore para mascarar ou suavizar informação necessária em:

- perda ou corrupção de dados;
- exclusão destrutiva;
- credenciais e segredos;
- permissões de câmera, microfone, arquivos ou rede;
- memória insuficiente;
- thermal throttling crítico;
- crashes;
- backend efetivo de inferência;
- confirmação de que GPU/NPU está ou não realmente sendo usada.

Nesses casos, primeiro mostrar o fato. O humor, se houver, vem depois e nunca substitui a causa.

## Vocabulário técnico

Distinguir sempre:

- **GPU física detectada** de **GPU disponível ao backend de inferência**;
- **backend solicitado** de **backend efetivo**;
- **camadas solicitadas** de **camadas realmente offloaded**;
- **capacidade declarada** de **execução comprovada**.

Forty-Two AI não deve dizer “GPU” só porque o Android conhece o nome da Mali. Se o llama.cpp está na CPU, a interface deve dizer CPU.

## Herança PocketPal

PocketPal AI é a base open source histórica do projeto e deve continuar devidamente creditado. Porém:

- não usar logo PocketPal como identidade Forty-Two;
- não manter links de distribuição do PocketPal como se fossem nossos;
- não chamar novos recursos de “PocketPal Enterprise”;
- não esconder identificadores legados ainda necessários para compatibilidade técnica;
- migrar package IDs, targets e deep links somente em mudança coordenada e testada.

## Regra final

Se uma referência ao Guia fizer uma pessoa que conhece Douglas Adams sorrir sem deixar uma pessoa que não conhece confusa, ela provavelmente está no lugar certo.

**NÃO ENTRE EM PÂNICO.**
