<div align="center">

# Forty-Two AI

**A resposta para a Grande Pergunta da Vida, o Universo e Tudo Mais — rodando no seu próprio dispositivo.**

Local-first · offline · privado · auditável · aberto

> **NÃO ENTRE EM PÂNICO.** Ainda estamos ensinando o Android a conversar civilizadamente com Vulkan.

</div>

---

## O que é o Forty-Two AI

Forty-Two AI é um projeto de inteligência artificial local para celulares e tablets, construído para que modelo, dados, conversas e execução permaneçam sob controle do usuário sempre que tecnicamente possível.

Este repositório nasceu de uma base PocketPal AI, mas **não pretende ser apenas uma skin, um fork de marca ou um PocketPal modificado**. A base está sendo progressivamente reconstruída em torno de uma experiência própria: chat-first, interface para tablet, seleção explícita de backend, diagnóstico real de hardware, aceleração local, controles avançados e uma identidade visual própria.

O foco imediato é fazer a camada nativa funcionar de forma verificável antes de embelezar o que ainda não consegue sair da garagem.

## Estado atual

O alvo de validação inicial é o **Blackview MEGA 3**, com MediaTek Helio G99 / MT6789 e Mali-G57 MC2. O caminho CPU já foi validado e a investigação Vulkan está sendo avançada em etapas deliberadamente pequenas para separar:

1. descoberta física da GPU;
2. criação do registry Vulkan;
3. contagem e enumeração de dispositivos do backend;
4. registro do backend no llama.cpp / llama.rn;
5. criação do dispositivo de inferência;
6. offload real de camadas e execução de tensores.

Os scripts de diagnóstico ficam em [`scripts/`](scripts/) e o workflow Android dedicado está em [`.github/workflows/enterprise-android-ci.yml`](.github/workflows/enterprise-android-ci.yml).

## Princípios do projeto

- **Local primeiro.** A rede deve ser opção, não requisito para pensar.
- **Privacidade por arquitetura.** Dados locais não deveriam precisar de promessa de marketing para continuar locais.
- **Fallback honesto.** Se a GPU não estiver executando inferência, a interface deve dizer CPU — não exibir um ícone verde e torcer pelo melhor.
- **Hardware observável.** Diagnóstico físico e backend de inferência são coisas diferentes e aparecem separadamente.
- **Controle do usuário.** Modelos, contexto, threads, backend e parâmetros devem ser compreensíveis e configuráveis.
- **Código aberto e auditável.** O projeto deve poder ser estudado, adaptado e continuado sem depender de uma caixa-preta central.
- **Sem magia falsa.** Primeiro causalidade; depois brilho, animação e grandeza.

## Identidade Forty-Two

A referência a *O Guia do Mochileiro das Galáxias* é intencional, mas não queremos transformar o aplicativo numa fantasia temática. Ela aparece como humor seco e pequenos sinais para quem reconhecer:

- **42** — naturalmente.
- **NÃO ENTRE EM PÂNICO** — falhas recuperáveis, onboarding e diagnóstico.
- **Majoritariamente inofensivo** — estados experimentais que já não parecem capazes de incendiar o dispositivo.
- **E obrigado pelos peixes** — encerramentos, créditos e despedidas apropriadas.

As regras estão documentadas em [`docs/forty-two/BRAND_AND_LORE.md`](docs/forty-two/BRAND_AND_LORE.md).

## Construção

O projeto continua sendo React Native e, durante a migração, alguns identificadores técnicos legados ainda contêm `PocketPal` (`com.pocketpalai`, projeto iOS, deep links e nomes internos). **Isso é deliberado por enquanto.** Renomear package IDs, targets e símbolos nativos no meio da investigação JNI/Vulkan adicionaria variáveis inúteis ao problema.

A identidade que o usuário vê já é Forty-Two AI; os identificadores internos serão migrados em uma etapa própria, com testes e sem quebrar o histórico de diagnóstico.

### Android — diagnóstico MEGA 3

```bash
yarn install --frozen-lockfile
bash scripts/prepare-llama-vulkan.sh
bash scripts/probe-vulkan-device-count-for-diagnostic-v4.sh
cd android
./gradlew assembleProdDebug \
  -PrnllamaBuildFromSource=true \
  -PreactNativeArchitectures=arm64-v8a
```

Consulte [`docs/enterprise/PROJECT_SPEC.md`](docs/enterprise/PROJECT_SPEC.md) para o histórico técnico e os critérios do projeto em andamento.

## Marca e assets

O launcher herdado no histórico ainda é o ícone original do PocketPal e **não será apresentado como se fosse o logo Forty-Two AI**. O asset canônico FortyTwoAI será mantido em `assets/branding/` e propagado para Android, iOS, splash e documentação assim que a fonte original estiver no repositório.

Isso é melhor do que redesenhar de memória um logo que já existe.

## Origem, crédito e licença

Forty-Two AI é derivado de **PocketPal AI**, de Asghar Ghorbani e colaboradores. O histórico importado e o arquivo [`LICENSE`](LICENSE) preservam essa origem e os termos MIT aplicáveis à base.

As modificações, experimentos de hardware, UX e identidade Forty-Two AI vivem neste repositório; a atribuição do trabalho anterior permanece onde deve permanecer.

## Status

**Experimental.** O caminho CPU funciona; o backend Vulkan Android está em investigação controlada. Não confunda “a GPU existe” com “a GPU está fazendo inferência”. Nós também não confundimos.

<div align="center">

**Forty-Two AI**  
*Majoritariamente inofensivo.*

_E obrigado pelos peixes._

</div>
