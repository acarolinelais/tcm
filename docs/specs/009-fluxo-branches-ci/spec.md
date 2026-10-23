# 009. Fluxo de branches e verificação automática: Spec

- **Status:** Aprovada
- **Data:** 2026-10-23
- **ADRs relacionados:** 0002, 0010, 0011, 0027, 0028, 0029

## Problema

Hoje todo commit vai direto para a branch principal, e nada verifica automaticamente se o código ainda
passa no lint e nos testes. Com mais de uma pessoa contribuindo, uma mudança quebrada pode chegar à
branch principal sem ninguém perceber, as mensagens de commit não seguem um padrão e não dá para saber
qual mudança pertence a qual spec. O ADR 0011 deixou o CI pendente "para quando o fluxo de branches for
definido".

## Objetivo

O trabalho acontece em branches de trabalho, é integrado numa branch `dev` e só depois promovido para a
`main`. Nomes de branch e mensagens de commit seguem um padrão verificado no momento do commit e de novo
no servidor, e nada entra em `dev` ou `main` sem a verificação automática verde.

## Histórias de usuário

- Como **pessoa desenvolvedora**, quero trabalhar numa branch isolada por spec para não interferir no
  trabalho de outras pessoas.
- Como **pessoa desenvolvedora**, quero ser avisada na hora do commit quando a mensagem ou a branch estão
  fora do padrão, antes de enviar.
- Como **pessoa desenvolvedora**, quero que lint, testes e build rodem sozinhos no meu pedido de merge
  para saber se quebrei algo antes de integrar.
- Como **pessoa que estuda o histórico**, quero que cada pedido de merge aponte para a spec que
  implementa e que as mensagens digam o tipo de mudança.

## Regras de negócio

- RN-01: Há duas branches de longa duração: `main` (estável) e `dev` (integração). Nenhuma das duas
  aceita commit nem envio direto.
- RN-02: Branches de trabalho saem da `dev`, voltam para a `dev` por pedido de merge e são nomeadas
  `<tipo>/<descricao>`, com os tipos definidos no ADR 0027. Uma branch `feat/` começa com o número da
  spec (`feat/NNN-nome`).
- RN-03: A `main` só recebe pedido de merge vindo da `dev` ou de uma branch de correção urgente
  (`hotfix/<descricao>`), que sai da `main`. Depois que um hotfix entra na `main`, um pedido `main → dev`
  leva a correção para a `dev`.
- RN-04: Mensagens de commit e títulos de pedido seguem `tipo(escopo opcional): descrição`, com os
  mesmos tipos da RN-02. Mensagens automáticas de merge e revert são aceitas.
- RN-05: Uma spec corresponde a uma branch e a um pedido de merge para a `dev`. O número no nome da
  branch (`feat/NNN-...`) identifica a spec, que precisa existir.
- RN-06: Um pedido de merge só pode ser integrado com todas as verificações obrigatórias verdes: backend
  (lint e testes), frontend (lint, testes e build) e convenção (commits, título, nome e origem da branch).
  Aprovação humana é opcional. Enquanto o repositório não suportar bloqueio no servidor (limitação
  aceita, ADR 0028), "não pode ser integrado" significa que o pedido fica marcado como reprovado.
- RN-07: As regras de nome, mensagem e branch protegida também são checadas na máquina local, no momento
  do commit e do envio, para quem ativou a checagem local.
- RN-08: A verificação automática também roda a cada integração em `dev` e `main`.

## Critérios de aceite

- **CA-01:** Dado um pedido de merge para a `dev` com backend e frontend corretos, quando ele é aberto
  ou atualizado, então as verificações de backend e frontend rodam e terminam verdes.
- **CA-02 (falha):** Dado um pedido de merge com um teste de backend quebrado, quando a verificação
  roda, então a verificação de backend falha e o pedido não pode ser integrado (RN-06).
- **CA-03 (falha):** Dado um pedido de merge com erro de lint ou build no frontend, quando a
  verificação roda, então a verificação de frontend falha e o pedido não pode ser integrado (RN-06).
- **CA-04:** Dado um commit `feat(usuarios): filtra por perfil` numa branch `feat/009-x`, quando a
  pessoa commita e abre o pedido, então a checagem local e a do servidor passam.
- **CA-05 (falha):** Dado um commit com mensagem fora da convenção (ex.: `Feat: Abluble`), quando a
  pessoa commita, então a checagem local recusa e mostra o formato esperado. Quando o commit chega ao
  servidor (por exemplo, com a checagem local desativada), então a verificação falha e cita o commit.
- **CA-06 (falha):** Dado uma branch fora do padrão (ex.: `feature/abluble` ou `minha-branch`), quando
  a pessoa commita nela ou abre um pedido a partir dela, então a checagem recusa e mostra o padrão esperado.
- **CA-07 (falha):** Dado alguém na `main` ou na `dev`, quando tenta commitar, então a checagem local
  recusa. Quando tenta enviar direto ao servidor, então a checagem local recusa (e o servidor também,
  quando houver suporte a bloqueio).
- **CA-08 (falha):** Dado um pedido de merge para a `main` vindo de uma branch que não é a `dev` nem
  `hotfix/*` (ex.: `feat/009-x`), quando a verificação roda, então ela falha e informa que a `main` só
  aceita pedidos da `dev` ou de hotfix.
- **CA-09:** Dado uma branch `hotfix/corrige-login` criada a partir da `main` com commits `fix: ...`,
  quando o pedido para a `main` é aberto, então a verificação de convenção passa. Depois do merge, o
  pedido `main → dev` também passa.
- **CA-10 (falha):** Dado um pedido de merge de uma branch `feat/NNN-...` cuja spec `NNN` não existe,
  quando a verificação roda, então ela falha e informa a spec que falta.
- **CA-11:** Dado um pedido `dev → main` verde, quando a pessoa integra, então a mudança entra na `main`
  e a verificação roda de novo sobre a `main`.
- **CA-12:** Dado a documentação do projeto, quando uma pessoa nova lê o README e o `CLAUDE.md`, então
  encontra o passo a passo: ativar a checagem local, criar a branch a partir da `dev`, implementar por
  blocos, abrir o pedido para a `dev` e promover para a `main`, além do caminho do hotfix.

## Fora de escopo

- Testes e2e (Playwright) na verificação automática: ficam para uma spec futura.
- Deploy, publicação de imagens e ambientes (staging/produção).
- Branches `release/*`, versionamento semântico, tags e changelog.
- Abrir automaticamente o pedido `main → dev` depois de um hotfix.
- Aprovação humana obrigatória e CODEOWNERS.
- Reescrever as mensagens dos commits que já existem.

## Dúvidas em aberto

Nenhuma.
