# 068. Aba Form Factor com a visão da General Results: Spec

- **Status:** Aprovada
- **Data:** 2026-11-07
- **Specs relacionadas:** 059 (redesign da General Results), 032 (janela de detalhe do resultado), 033 (paginação),
  022 (registro de resultado numa rodada), 067 (desfazer importação)

## Problema

A aba Form Factor do projeto tem duas visões, Results e Summary, cada uma com colunas, filtros e textos de ajuda
próprios. A General Results já mostra os resultados SDF de um projeto numa tabela só, que o time usa no dia a dia.
Ter duas formas de ler o mesmo dado confunde, e a pessoa precisa trocar de visão para achar o que quer.

## Objetivo

A aba Form Factor passa a mostrar a mesma tabela da General Results, só do projeto aberto. As visões Results e
Summary somem. O dev vê só os casos dele; a gestão vê todos os casos do projeto.

## Histórias de usuário

- Como **dev**, quero ver na aba Form Factor os resultados SDF só dos meus casos, para conferir o que preciso
  corrigir sem procurar no meio do time.
- Como **KP**, **gerente** ou **admin**, quero ver os resultados de todos os casos do projeto na mesma tabela da
  General Results, para não aprender duas telas.
- Como quem lança resultado à mão, quero registrar o resultado de um caso pela linha da tabela, como faço hoje no
  Summary.

## Regras de negócio

- RN-01: A aba Form Factor não tem mais o seletor Results/Summary nem os textos de ajuda de cada visão.
- RN-02: A tabela é a da General Results (spec 059, RN-09 a RN-16): as colunas **TC ID**, **Assignee**,
  **Form Factor**, **SDF ID**, as datas e **Actions**; a linha que expande por device; os filtros no cabeçalho; a
  janela de detalhe ao clicar num resultado; o histórico do caso em Actions; a paginação de 20 e a exportação.
- RN-03: Quem vê a aba continua o mesmo de hoje (permissão de consultar resultados Form Factor).
- RN-04: O **dev** vê só os casos do projeto em que é o responsável ou o backup. Os casos dos colegas não aparecem
  nem pelo filtro de Assignee, que lista só os responsáveis desses casos.
- RN-05: **KP**, **gerente** e **admin** veem todos os casos ativos do projeto, dentro do seu escopo de sempre.
- RN-06: O registro manual de resultado vira uma ação na coluna Actions, ao lado do histórico. Ela aparece só nas
  linhas em que o registro existe hoje (o caso tem uma rodada esperando resultado) e só para quem pode registrar
  hoje (gestão, ou o dev dono ou backup do caso). O registro funciona como hoje (spec 022).
- RN-07: Os botões Import SDF report e Undo last import continuam só na General Results.
- RN-08: O seletor de semana do topo da aba continua filtrando as datas da tabela.
- RN-09: Os textos novos acompanham o idioma da interface (inglês, português e coreano).

## Critérios de aceite

- **CA-01:** Dado um projeto aberto na aba Form Factor, quando qualquer perfil a abre, então não vê o seletor
  Results/Summary e vê a tabela com TC ID, Assignee, Form Factor, SDF ID, as datas e Actions.
- **CA-02:** Dado um dev dono do Clock_000001 e backup do Clock_000002, num projeto com o Clock_000003 de outra
  pessoa, quando ele abre a aba, então vê só o Clock_000001 e o Clock_000002.
- **CA-03 (falha):** Dado esse dev, quando ele filtra por Assignee, então a lista não oferece a dona do
  Clock_000003 e a tabela nunca mostra o Clock_000003.
- **CA-04:** Dado um KP, um gerente ou um admin no mesmo projeto, quando abre a aba, então vê os três casos.
- **CA-05:** Dado um caso com quatro devices, quando a pessoa expande a linha, então vê um device embaixo do outro,
  como na General Results.
- **CA-06:** Dado um resultado na tabela, quando a pessoa clica nele, então abre a janela de detalhe; e o ícone de
  histórico em Actions abre o histórico do caso.
- **CA-07:** Dado um caso com rodada esperando resultado, quando o dev dono abre a aba, então vê a ação de registrar
  na linha e, ao registrar, o resultado entra como hoje.
- **CA-08 (falha):** Dado um caso sem rodada esperando resultado, ou um dev que não é dono nem backup, então a ação
  de registrar não aparece na linha.
- **CA-09 (falha):** Dado qualquer perfil na aba Form Factor, então ela não mostra os botões Import SDF report nem
  Undo last import.
- **CA-10:** Dado uma semana escolhida no topo da aba, então a tabela mostra só as datas dessa semana.
- **CA-11 (falha):** Dado um projeto sem nenhum resultado SDF, quando a pessoa abre a aba, então vê o estado vazio
  da tabela, e não uma tabela em branco.

## Fora de escopo

- Mudar a General Results: ela continua com o escopo do time para o dev (spec 059).
- Criar rodadas: o botão Create test round saiu na spec 067 e não volta aqui.
- Importar ou desfazer importação pela aba Form Factor.
- Os ajustes visuais da tabela que não forem aprovados nesta spec.

## Dúvidas em aberto

- Sem o Create test round, só as rodadas que já existem ficam esperando resultado; a ação de registrar (RN-06)
  some sozinha quando elas acabarem. Fica assim, ou o registro manual deve ganhar outra entrada?
