# 029. Avatar do usuário logado na barra superior: Spec

- **Status:** Aprovada
- **Data:** 2026-10-28

## Problema

O ícone do usuário logado, no canto direito da barra superior, mostra só a primeira letra do nome. Pessoas
com o mesmo primeiro nome ou a mesma inicial ficam com ícones iguais, e o ícone foi feito à mão, fora da base
de interface que o projeto adotou. Isso pesa para qualquer pessoa logada, de qualquer papel.

## Objetivo

O ícone do usuário logado passa a ser um avatar com as iniciais do nome, no mesmo tamanho e cor do layout
atual. O menu do usuário (e-mail e sair) continua igual.

## Histórias de usuário

- Como **pessoa logada**, quero ver as minhas iniciais no canto da barra para confirmar de relance com qual
  conta estou.

## Regras de negócio

- RN-01: As iniciais são a primeira letra do primeiro nome e a primeira letra do último nome, em maiúsculas
  (`Ana Carolina Lais` → `AL`).
- RN-02: Com um nome só, o avatar mostra uma letra (`Ana` → `A`).
- RN-03: Espaços nas pontas e espaços repetidos entre os nomes são ignorados no cálculo.
- RN-04: Com o nome vazio ou só com espaços, o avatar mostra um ícone genérico de pessoa, nunca fica em
  branco nem quebra a barra.
- RN-05: O avatar mantém o tamanho, a cor de fundo e a cor do texto do layout atual (Figma), e a barra não
  muda de altura.
- RN-06: O avatar é decorativo: o nome já aparece em texto ao lado, então leitores de tela não o anunciam.
- RN-07: Não há foto de perfil. O avatar mostra sempre iniciais (ou o ícone da RN-04).

## Critérios de aceite

- **CA-01:** Dado uma pessoa logada com o nome `Ana Carolina Lais`, quando a barra superior aparece, então o
  avatar mostra `AL` e o primeiro nome `Ana` aparece ao lado.
- **CA-02:** Dado uma pessoa logada com o nome `Ana`, quando a barra aparece, então o avatar mostra `A`.
- **CA-03:** Dado uma pessoa logada com o nome `  ana   lais  `, quando a barra aparece, então o avatar
  mostra `AL`.
- **CA-04 (falha):** Dado uma pessoa logada com o nome vazio ou só com espaços, quando a barra aparece, então
  o avatar mostra o ícone genérico de pessoa e a barra continua com a mesma altura e o menu funcionando.
- **CA-05:** Dado a barra superior aberta, quando a pessoa clica no avatar ou no nome, então o menu abre com
  o e-mail e a opção de sair, como hoje; clicando fora, ele fecha.
- **CA-06:** Dado um leitor de tela, quando ele percorre a barra, então anuncia o botão do menu do usuário e
  não lê as iniciais do avatar.

## Fora de escopo

- Foto de perfil (upload, URL vinda do backend ou serviço externo).
- Avatar em outras telas (tabelas de times, responsáveis de Test Case, administração de usuários).
- Mudanças no conteúdo ou no comportamento do menu do usuário.
- Cor do avatar escolhida pela pessoa em Settings (persistida na conta). Fica para a próxima spec, que deve
  seguir o mesmo caminho da preferência de idioma (`PATCH /api/auth/preferencias`).

## Dúvidas em aberto

- Hoje o ícone mostra **uma** letra. Esta spec passa para **duas** iniciais (RN-01). Se o Figma exigir uma
  letra só, a RN-01 vira "primeira letra do nome" e o CA-01 passa a esperar `A`.
