# Forty-Two Network Layer

> **NÃO ENTRE EM PÂNICO.** A internet é uma capacidade concedida ao Forty-Two, não um socket entregue ao modelo.

## Objetivo

Permitir pesquisa pública e outras operações de rede úteis sem transformar um modelo local em um processo com acesso irrestrito à internet, credenciais, rede privada ou arquivos do aparelho.

A execução local continua sendo o padrão. Acesso à internet é **opcional, explícito e auditável**.

---

## Separação fundamental

O Forty-Two possui dois tipos diferentes de uso de rede:

```text
APP NETWORK
│
├─ catálogo de modelos
├─ download de modelos
├─ atualização de metadados
└─ serviços explicitamente configurados pelo usuário

MODEL NETWORK
│
└─ solicitações feitas pelo modelo durante uma conversa
   ├─ pesquisar
   ├─ buscar página pública
   └─ outras tools permitidas pela policy
```

Baixar um modelo do catálogo **não concede internet ao modelo**.

---

## Fluxo de pesquisa do modelo

```text
Modelo local
    │
    │ tool request: web_search("...")
    ▼
NetworkBroker
    │
    ├─ policy permite esta capability?
    ├─ precisa perguntar ao usuário?
    ├─ destino é público e permitido?
    ├─ request contém dado sensível?
    ├─ tamanho / timeout / redirects válidos?
    └─ esquema e método são permitidos?
    │
    ▼
SearchProvider / FetchProvider
    │
    ▼
Internet
    │
    ▼
Response Sanitizer
    │
    ├─ limita tamanho
    ├─ remove conteúdo não necessário
    ├─ marca origem externa
    └─ trata conteúdo como NÃO CONFIÁVEL
    │
    ▼
Modelo
```

O modelo nunca recebe socket, cookie jar, credencial do app, token de serviço, acesso ao filesystem ou endereço de rede privada simplesmente por possuir a capability `web_search`.

---

## Modos para o usuário comum

### Offline

Nenhuma solicitação de rede iniciada pelo modelo é permitida.

### Perguntar quando necessário — recomendado inicialmente

```text
modelo pede busca
      │
      ▼
"Permitir pesquisa pública na internet?"
      │
   ┌──┴──┐
   │     │
  não   sim
   │     │
   ▼     ▼
offline  NetworkBroker
```

A confirmação deve dizer **o que será enviado** e **o que pode voltar**, sem linguagem vaga.

### Pesquisa permitida

Permite buscas públicas dentro da policy sem pedir a cada consulta. Permissão pode ser global ou específica por modelo/perfil.

---

## Aviso de consentimento

Um simples “use por sua conta e risco” não é suficiente sozinho. O aviso deve explicar o risco real antes da escolha.

Exemplo de conteúdo funcional:

```text
Acesso à Internet

Ao ativar este recurso, consultas produzidas durante a conversa podem ser
enviadas a serviços externos para realizar pesquisas públicas.

• conteúdo externo pode conter informações incorretas ou instruções maliciosas;
• provedores externos podem registrar metadados de rede conforme suas próprias políticas;
• o Forty-Two não envia automaticamente seus arquivos, histórico completo, credenciais ou dados privados;
• respostas obtidas da internet são tratadas como conteúdo não confiável;
• você pode desligar este acesso a qualquer momento.

Use por sua conta e risco.
```

Depois da informação necessária pode existir uma segunda camada de lore:

```text
NÃO ENTRE EM PÂNICO.
A toalha continua opcional. A política de rede, não.
```

Humor nunca substitui o aviso.

---

## Bloqueios estruturais padrão

Mesmo quando pesquisa pública estiver permitida, o NetworkBroker deve bloquear por padrão:

- loopback (`127.0.0.0/8`, `::1`);
- redes privadas e link-local;
- endpoints de metadata de cloud;
- `file://`, `content://` e esquemas internos;
- envio automático de arquivos;
- cookies, tokens e credenciais do aplicativo;
- métodos com efeito colateral, como POST/PUT/DELETE, salvo capability específica;
- execução de conteúdo baixado;
- redirects que terminem em destinos bloqueados.

O modo avançado pode ampliar capabilities deliberadamente, mas cada capacidade deve permanecer separada e visível.

---

## Advanced / Laboratory

```text
Settings
   │
   ▼
Laboratory
   │
   ▼
Advanced Network Controls
   │
   ├─ Mode
   │    ├ Offline
   │    ├ Ask
   │    ├ Search only
   │    └ Custom
   │
   ├─ Capabilities
   │    ├ Search
   │    ├ Public HTTP GET
   │    ├ Downloads
   │    └ Methods with side effects
   │
   ├─ Domain policy
   ├─ Response size
   ├─ Timeout
   ├─ Redirect limit
   └─ Audit log
```

No modo Custom, o usuário avançado recebe controle. O app não cria botões placebo: capability indisponível na build ou impossível na plataforma deve aparecer como indisponível.

---

## Interface de policy

Estrutura inicial sugerida:

```ts
export interface NetworkPolicy {
  mode: 'offline' | 'ask' | 'search' | 'custom';

  allowSearch: boolean;
  allowPublicFetch: boolean;
  allowDownloads: boolean;
  allowSideEffectMethods: boolean;

  allowedDomains?: string[];
  maxResponseBytes: number;
  timeoutMs: number;
  maxRedirects: number;

  blockPrivateNetworks: boolean;
  redactSensitiveData: boolean;
}
```

Policy descreve permissão. Provider executa rede. Modelo não implementa nenhum dos dois.

---

## Catálogo de modelos

O catálogo de modelos é responsabilidade do aplicativo e deve ser separado do acesso à internet concedido ao modelo.

```text
Usuário
   │
   ▼
Catálogo de Modelos
   │
   ▼
ModelCatalogProvider
   │
   ▼
Hugging Face Model Hub
   │
   ├─ busca
   ├─ filtros
   ├─ metadados
   └─ download
```

O `ModelCatalogProvider` deve permitir que a fonte seja substituível no futuro sem acoplar a UI diretamente a um provedor.

O fluxo padrão continua simples:

```text
Encontrar modelo
      │
      ▼
Baixar
      │
      ▼
Runtime Planner
      │
      ▼
Pronto
```

---

## Estado visível durante uma resposta

Quando uma resposta usar conteúdo externo, a UI deve indicar isso discretamente.

```text
🌐 Pesquisa na internet utilizada
```

O usuário deve conseguir distinguir conhecimento gerado localmente de informação recuperada durante aquela resposta.

---

## Princípio final

```text
O MODELO SOLICITA.
A POLICY DECIDE.
O BROKER EXECUTA.
A TELEMETRIA REGISTRA.
O USUÁRIO CONTROLA.
```

Acesso à internet é uma capability; não é uma transferência de soberania para o modelo.
