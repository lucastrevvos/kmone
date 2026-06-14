# KM One

Copiloto financeiro para motoristas de aplicativo acompanharem corridas, custos, metas e qualidade das ofertas em uma rotina de trabalho mais inteligente.

## Visão geral

KM One é uma plataforma voltada para motoristas de aplicativo que precisam tomar decisões rápidas durante o dia e, ao mesmo tempo, manter clareza sobre receita, quilometragem, abastecimentos e desempenho operacional.

O projeto reúne um aplicativo mobile, uma landing page pública e uma API backend. A experiência principal está no app, onde o motorista registra corridas, acompanha métricas do dia, controla abastecimentos, consulta histórico e utiliza critérios personalizados para avaliar oportunidades de corrida.

## Problema

Motoristas de aplicativo lidam com muitas variáveis ao mesmo tempo: valor da corrida, distância, tempo estimado, meta diária, combustível, deslocamentos sem passageiro e desempenho por quilômetro. Quando essas informações ficam espalhadas ou são calculadas manualmente, a tomada de decisão fica mais lenta e menos consistente.

O KM One nasce para organizar esse fluxo e transformar dados operacionais do dia a dia em sinais simples para decisão.

## Solução

A solução centraliza os principais controles financeiros e operacionais do motorista em um app mobile. O usuário pode registrar corridas e abastecimentos, acompanhar metas, calcular indicadores como receita por quilômetro e consultar históricos por período.

O projeto também inclui um radar de ofertas com parâmetros configuráveis. A partir de critérios como valor mínimo, R$/km e R$/hora, o app classifica oportunidades e ajuda o motorista a decidir com mais clareza.

## Funcionalidades

- Registro manual de corridas com valor recebido, quilometragem, aplicativo e duração.
- Edição e exclusão de corridas.
- Acompanhamento de métricas do dia, incluindo bruto, quilômetros, R$/km, quantidade de corridas e tempo acumulado.
- Meta diária de faturamento com progresso visual.
- Registro de abastecimentos com valor, litros e tipo de combustível.
- Edição, exclusão e desfazer exclusão de abastecimentos.
- Histórico por data com totais de receita, quilometragem, combustível e líquido estimado.
- Exportação de corridas em CSV por dia, semana e mês.
- Tracking de deslocamentos com GPS para registrar corridas particulares ou períodos livres.
- Entrada por voz para valores de corrida no fluxo manual.
- Radar manual de ofertas com avaliação por valor, distância e tempo.
- Radar Android com overlay, permissões dedicadas e leitura de ofertas via recursos nativos.
- Configuração de meta diária, R$/km mínimo e critérios mínimos para avaliação de ofertas.
- Landing page pública com apresentação do produto e formulário de interesse.
- API HTTP para configuração, cadastro e listagem de corridas.

## Stack

### Mobile

- React Native
- Expo
- TypeScript
- NativeWind / Tailwind CSS
- Zustand
- AsyncStorage
- Expo Location
- Expo FileSystem e Sharing
- Expo Speech Recognition
- Código nativo Android em Kotlin para overlay, acessibilidade, captura de tela e OCR

### Web

- React
- TypeScript
- Vite
- Tailwind CSS
- React Hook Form
- Zod
- Lucide React
- Formspree

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- Neon Serverless/Postgres client
- Serverless Framework
- AWS Lambda / HTTP API
- Docker Compose para banco local

## Arquitetura

O repositório está organizado como um monorepo com três frentes principais:

```text
backend/   API HTTP, acesso a dados e deploy serverless
mobile-v2/ Aplicativo mobile principal em React Native/Expo
mobile/    Versão mobile inicial mantida no repositório
web/       Landing page pública em React/Vite
```

No mobile, a aplicação separa telas, componentes reutilizáveis, estado e regras de domínio. Os dados locais de corridas, abastecimentos, configurações e tracking são persistidos com AsyncStorage por meio de stores e repositórios internos.

A camada Android nativa complementa o app Expo com serviços específicos para o radar de ofertas: Accessibility Service, overlay flutuante, captura de tela, processamento de frames e integração com a ponte JavaScript/React Native.

O backend expõe rotas REST para health check, configuração e corridas, com persistência em PostgreSQL. A API pode rodar localmente via Express e também ser empacotada para execução serverless.

A landing page apresenta a proposta de valor do produto, principais benefícios e formulário de captação de interesse.

## Como rodar

### Pré-requisitos

- Node.js 20+
- npm
- Docker e Docker Compose para o banco local do backend
- Expo CLI/EAS quando for executar builds mobile nativos
- Ambiente Android configurado para `expo run:android`, quando necessário

### Backend

```bash
cd backend
npm install
cat > .env.local <<'ENV'
DATABASE_URL="postgres://dev:dev@localhost:5432/kmone"
NODE_ENV="development"
ENV
npm run dev:db
npm run dev
```

Com a API em execução, os endpoints principais ficam disponíveis no servidor local do Express.

### Mobile principal

```bash
cd mobile-v2
npm install
npm start
```

Para executar com código nativo Android:

```bash
cd mobile-v2
npm run android
```

### Landing page

```bash
cd web
npm install
npm run dev
```

### Mobile inicial

```bash
cd mobile
npm install
npm start
```

## Configuração

Crie arquivos de ambiente locais conforme a necessidade de cada módulo e mantenha valores sensíveis fora do versionamento.

### Backend

```env
DATABASE_URL="postgres://usuario:senha@host:porta/banco"
NODE_ENV="development"
```

`DATABASE_URL` é obrigatória para conexão com PostgreSQL. Em ambientes de staging ou produção, a aplicação também usa essa variável para configurar conexão SSL quando apropriado.

### Web

A landing page utiliza integração com Formspree para envio de formulário. Caso o identificador do formulário seja parametrizado no futuro, mantenha-o em variável de ambiente pública do Vite, por exemplo:

```env
VITE_FORMSPREE_FORM_ID="seu_form_id"
```

### Mobile

O app mobile principal utiliza persistência local e permissões do dispositivo. Para recursos nativos do radar Android, as permissões de overlay, acessibilidade e captura de tela são solicitadas no próprio fluxo do aplicativo.

## Decisões técnicas

- **Monorepo por produto**: backend, mobile e web convivem no mesmo repositório para facilitar evolução coordenada da plataforma.
- **Mobile-first**: a experiência principal fica no app, alinhada ao contexto de uso do motorista durante a jornada de trabalho.
- **Persistência local no app**: corridas, abastecimentos e configurações são armazenados no dispositivo para uma experiência rápida e independente de conexão constante.
- **Critérios configuráveis**: metas e parâmetros do radar ficam sob controle do usuário, permitindo que a avaliação de ofertas reflita sua estratégia de trabalho.
- **Separação de domínio e interface**: stores, utilitários e casos de uso ajudam a manter regras de cálculo fora dos componentes visuais.
- **Backend serverless**: a API foi estruturada para rodar localmente durante o desenvolvimento e em ambiente serverless para entrega na nuvem.
- **Camada nativa Android dedicada**: recursos como overlay, acessibilidade e captura de tela foram implementados nativamente para viabilizar uma experiência integrada ao fluxo real de decisão do motorista.

## Status

O projeto está em desenvolvimento ativo, com foco no aplicativo mobile principal, na experiência de decisão para motoristas e na base de dados operacional. A versão atual já reúne os fluxos centrais de registro, acompanhamento de métricas, histórico, abastecimentos, configurações e landing page pública.

## Roadmap

- Evoluir indicadores comparativos por turno, região e aplicativo.
- Aprimorar visualizações de histórico com filtros e agrupamentos adicionais.
- Expandir recursos de metas, alertas e acompanhamento de progresso.
- Fortalecer recursos de backup, importação e exportação de dados.
- Ampliar acessibilidade e refinamentos de experiência no app mobile.
- Consolidar fluxos de build, versionamento e distribuição mobile.
- Explorar integrações e parcerias voltadas à redução de custos do motorista.

## O que este projeto demonstra

- Construção de produto mobile com React Native, Expo e TypeScript.
- Modelagem de fluxos reais de usuário com foco em decisão operacional e controle financeiro.
- Implementação de estado local, persistência offline e organização por domínio.
- Desenvolvimento de componentes reutilizáveis e interfaces orientadas a métricas.
- Integração com APIs nativas Android em um projeto Expo.
- Uso de GPS, exportação de arquivos, compartilhamento e entrada por voz no mobile.
- Criação de backend REST com TypeScript, Express, PostgreSQL e deploy serverless.
- Desenvolvimento de landing page moderna com React, Vite e Tailwind CSS.
- Organização de monorepo com múltiplas superfícies de produto.
