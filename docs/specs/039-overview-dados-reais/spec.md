# 039. Overview com dados reais: Spec

- **Status:** Concluída
- **Data:** 2026-10-30

## Problema

A Overview é a primeira tela depois do login, mas os números e gráficos dela são fixos e iguais para todo
mundo, mesmo fora do modo de demonstração. A pessoa toma uma tela de exemplo por um retrato real do trabalho.

## Objetivo

Os cards e gráficos da Overview passam a refletir os Test Cases que a pessoa logada pode ver, de acordo com o
seu perfil e o seu escopo.

## Histórias de usuário

- Como **gerente**, quero ver quantos casos dos meus times estão concluídos, em andamento e a fazer.
- Como **KP**, quero acompanhar o desempenho do meu time mês a mês.
- Como **dev**, quero ver quantos casos estão comigo e quantos já concluí.
- Como **administrador da unidade**, quero a visão consolidada da unidade inteira.

## Regras de negócio

- RN-01: Os números consideram só os casos no escopo do perfil: a unidade inteira para o admin; os times dos
  setores geridos e dos times em que participa para o gerente (ADR 0036); os próprios times para o KP; para o
  dev, os casos em que ele é responsável principal ou Backup.
- RN-02: Os cards mostram: total de casos, concluídos (`Done`), em andamento (`In Progress`, `In Review`,
  `In Validation` e `In Fixes`) e atribuídos (casos do escopo em que a pessoa logada é o responsável
  principal; ser Backup não conta). Os casos `Excluded` não entram em nenhum card.
- RN-03: A distribuição por Status mostra a porcentagem de concluídos, a fazer (`To-Do`) e em andamento.
- RN-04: O desempenho do time mostra, para cada um dos últimos 6 meses, quantos casos passaram para `Done`
  naquele mês, a partir do histórico da spec 038. É uma série só, com o total do escopo, sem separar por time.
- RN-05: Sem casos no escopo, a tela mostra um estado vazio explicando que ainda não há dados, em vez de zeros
  soltos.
- RN-06: O modo de demonstração (spec 010) continua mostrando dados de exemplo.

## Critérios de aceite

- **CA-01:** Dado um gerente com 10 casos no escopo, 4 deles `Done`, quando abre a Overview, então o card de
  concluídos mostra 4 e o total mostra 10.
- **CA-02:** Dado um dev responsável por 3 casos em um projeto com 50, quando abre a Overview, então os números
  consideram apenas os casos dele.
- **CA-03:** Dado 2 casos movidos para `Done` em setembro, quando a pessoa abre o desempenho, então setembro
  mostra 2.
- **CA-04:** Dado um caso `Excluded`, quando a Overview é calculada, então ele não entra no total.
- **CA-05 (falha):** Dado um KP sem time, quando abre a Overview, então vê o estado vazio e nenhum erro.
- **CA-06 (falha):** Dado um gerente da unidade A, quando a Overview é calculada, então nenhum caso da unidade B
  é contado.

## Fora de escopo

- Filtros por projeto, time ou período na Overview.
- Novos gráficos ou cards além dos que já existem.
- Desempenho dos meses anteriores ao histórico (spec 038, RN-08).

## Decisões (2026-10-30)

- "Atribuídos" conta os casos do escopo em que a pessoa logada é o responsável principal. Todo caso já nasce
  com responsável principal, então a regra antiga repetiria o total (RN-02).
- O desempenho é uma série só, com o total do escopo (RN-04).
- O desempenho mensal sai da auditoria da spec 038 (ADR 0044), já na `dev`. Conta os casos que entraram em
  `Done` no mês. Um caso excluído hoje não entra, como nos cards.
