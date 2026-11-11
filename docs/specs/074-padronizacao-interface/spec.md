# 074. Padronização da interface: Spec

- **Status:** Concluída
- **Data:** 2026-11-11
- **Specs relacionadas:** 039 (Overview vazia), 055 (estado vazio do redesign), 007 (idiomas), 072 (nomes SDF Failures e
  Dev Fix)

## Problema

Três pontos da interface fogem do padrão das outras telas:

- a Overview sem Test Cases mostra só a mensagem de vazio no meio do cartão. As outras páginas vazias (Board,
  Timeline, General Results, SDF Failures) mostram antes o título da página e a frase que explica o que ela faz;
- o KP vê Teams e Users soltos no menu, fora de Administration, onde já fica o catálogo de modelos dele;
- a interface em português tem termos em inglês (SDF Failures, Dev Fix, Automation Level...) sem regra escrita.
  Quem cria uma tela não sabe o que traduzir, e o seletor de idioma mostra "Portuguese" para quem está em português.

## Objetivo

Toda página vazia abre com o mesmo título e a mesma frase de apoio. O menu do KP agrupa as telas de cadastro em
Administration. Os termos que ficam em inglês passam a ter uma lista oficial, e cada idioma aparece com o próprio nome.

## Histórias de usuário

- Como **usuário sem Test Cases no escopo**, quero ver o nome da Overview e o que ela mostra, para entender onde
  estou mesmo sem dados.
- Como **KP**, quero Teams e Users dentro de Administration, para achar as telas de cadastro num lugar só.
- Como **pessoa que lê em português**, quero a interface toda em português, exceto os nomes que o time usa em inglês,
  e quero achar meu idioma pelo nome que eu conheço.

## Regras de negócio

**Overview vazia**
- RN-01: Sem Test Cases no escopo, a Overview mostra no topo o título da página e uma frase sobre o que ela mostra,
  no mesmo lugar e estilo das outras páginas. A mensagem de vazio continua no centro, abaixo deles.
- RN-02: Com Test Cases no escopo, a Overview não muda.

**Menu do KP**
- RN-03: Para o KP, Teams e Users ficam dentro de Administration, junto dos itens que ele já tem ali. Cada item
  continua aparecendo nas mesmas condições de hoje (permissão e, no Teams, ter time).
- RN-04: Administration abre sozinho quando o KP está em Teams ou em Users, e o item da tela atual fica destacado,
  como já acontece com as outras telas da pasta.
- RN-05: Sem nenhum item para mostrar, o KP não vê Administration.
- RN-06: O menu do gerente, do dev e do admin não muda.

**Idioma**
- RN-07: Os termos da lista oficial ficam em inglês em todos os idiomas da interface que a lista cobrir. No
  português: SDF Failures, Dev Fix, Dev Owner, Automation Level, SDF Result, Pass Rate, Test Case(s), Form Factor,
  Status, Backup, App, Device e Pull Requests.
- RN-08: Fora da lista, todo texto da interface em português está em português.
- RN-09: O seletor de idioma mostra cada idioma no próprio idioma (Português, English, 한국어), seja qual for o idioma
  em uso.

## Critérios de aceite

- **CA-01:** Dado um usuário sem Test Cases no escopo, quando abre a Overview, então vê no topo o título da página e a
  frase de apoio, e a mensagem de vazio abaixo, como no Board vazio.
- **CA-02:** Dado um usuário com Test Cases no escopo, quando abre a Overview, então vê a saudação, os cards e os
  gráficos como hoje, sem o título da página vazia.
- **CA-03:** Dado um KP com time e com permissão de consultar usuários, quando abre o menu, então Teams e Users estão
  dentro de Administration e não aparecem soltos.
- **CA-04:** Dado um KP em Teams ou em Users, quando a página carrega, então Administration está aberto e o item da
  página está destacado.
- **CA-05 (falha):** Dado um KP sem time, quando abre o menu, então Teams não aparece em lugar nenhum. Dado um KP sem
  permissão de consultar usuários, então Users não aparece.
- **CA-06 (falha):** Dado um KP sem nenhum item de Administration, quando abre o menu, então Administration não
  aparece.
- **CA-07:** Dado um gerente, quando abre o menu, então Teams e Users continuam soltos, como hoje.
- **CA-08:** Dado a interface em português, quando um texto é igual ao do inglês, então ele é um termo da lista
  oficial (RN-07) ou não tem palavra a traduzir (um número, um ID).
- **CA-09:** Dado a interface em qualquer idioma, quando o usuário abre o seletor de idioma, então vê Português,
  English e 한국어.

## Fora de escopo

- Traduzir os termos da lista oficial ou mudar a lista do coreano.
- Mudar o menu do gerente, do dev ou do admin.
- Renomear a rota e o módulo `bug-reports` para SDF Failures (só código e endereço; o nome na tela já é SDF Failures).
- Mudar a Overview com dados.

## Dúvidas em aberto

- A frase de apoio da Overview vazia. Proposta: "Os números e gráficos dos projetos do seu escopo." (en: "The numbers
  and charts of the projects in your scope.").
