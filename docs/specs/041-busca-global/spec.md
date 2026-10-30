# 041. Busca global na barra superior: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

A barra superior tem um campo de busca que não faz nada. Para achar um caso, a pessoa precisa lembrar o
projeto, abrir a lista e filtrar a coluna. Com vários projetos, isso toma tempo e o campo inútil confunde.

## Objetivo

O campo de busca passa a encontrar Test Cases, projetos e pessoas dentro do escopo de quem busca, e um clique
leva direto ao resultado.

## Histórias de usuário

- Como **dev**, quero digitar um TC ID e abrir o caso, sem lembrar em que projeto ele está.
- Como **gerente**, quero achar um projeto pelo nome.
- Como **KP**, quero achar uma pessoa do meu time pelo nome ou e-mail.

## Regras de negócio

- RN-01: A busca começa a partir de 2 caracteres e procura em: TC ID e Title dos casos, nome dos projetos, e
  nome e e-mail das pessoas.
- RN-02: Os resultados vêm agrupados (Test Cases, Projetos, Pessoas), com até 5 por grupo, e respeitam o escopo
  de leitura de cada perfil (ADR 0015). O dev só encontra os casos que já pode ver.
- RN-03: A busca ignora maiúsculas, minúsculas e acentos.
- RN-04: Um resultado de caso leva à página do caso (spec 040), um de projeto à página do projeto e um de pessoa
  à tela de usuários ou do time, conforme a permissão.
- RN-05: A busca pode ser aberta pelo teclado (atalho) e navegada com as setas e Enter.
- RN-06: Sem resultado, a lista mostra "Nada encontrado para <termo>".

## Critérios de aceite

- **CA-01:** Dado um caso `TC-0123` no escopo do dev, quando ele digita "tc-0123", então o caso aparece no grupo
  Test Cases e o Enter abre o caso.
- **CA-02:** Dado o projeto "Galaxy Fold", quando um gerente digita "fold", então o projeto aparece no grupo
  Projetos.
- **CA-03:** Dado a pessoa "João", quando alguém digita "joao", então ela aparece no grupo Pessoas.
- **CA-04 (falha):** Dado um caso de outro time, quando um dev digita o TC ID dele, então o caso não aparece.
- **CA-05 (falha):** Dado 1 caractere digitado, quando a pessoa para de digitar, então nenhuma busca é feita e
  aparece a dica "Digite ao menos 2 caracteres".
- **CA-06 (falha):** Dado um termo sem correspondência, quando a busca termina, então aparece "Nada encontrado".

## Fora de escopo

- Busca no conteúdo de Precondition, Procedure e Expected Result.
- Busca em rodadas, SDF IDs e modelos de dispositivo.
- Página de resultados completa com paginação.

## Dúvidas em aberto

- Pessoas inativas devem aparecer?
- Incluir os modelos de dispositivo e o SDF ID já nesta spec?
