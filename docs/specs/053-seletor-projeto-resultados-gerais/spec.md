# 053. Seletor de projeto na General Results: Spec

- **Status:** Aprovada
- **Data:** 2026-10-30
- **Specs relacionadas:** 032 (Resultados Gerais por projeto), 033 (paginação)

## Problema

A General Results mostra uma aba por projeto, numa linha só (spec 032, RN-01). Com muitos projetos no escopo,
as abas passam da borda da tela: as últimas ficam cortadas ou escondidas, e o contorno de foco da primeira
aparece cortado. Quem gerencia vários times não consegue chegar a um projeto do fim da lista nem saber quantos
projetos existem. O problema cresce com o número de projetos da unidade.

## Objetivo

A pessoa escolhe o projeto num seletor com busca, no título da tela, como já faz na tela do projeto. A tela
mostra um projeto por vez, e a lista de projetos cabe na tela com qualquer quantidade.

## Histórias de usuário

- Como **gerente de vários times**, quero achar um projeto pelo nome sem rolar uma fileira de abas.
- Como **KP**, quero abrir direto o projeto que acompanho e voltar a ele ao recarregar a tela.

## Regras de negócio

- RN-01: O título da tela mostra o nome do projeto aberto. Com mais de um projeto no escopo, o título abre um
  seletor com os mesmos projetos e na mesma ordem das abas de hoje (todos os projetos ativos acessíveis).
  Substitui a RN-01 da spec 032 (uma aba por projeto).
- RN-02: O seletor tem uma busca por nome de projeto. Uma busca sem resultado mostra um aviso próprio.
- RN-03: Ao abrir a tela, o projeto aberto é o do endereço da página. Sem projeto no endereço, ou com um projeto
  fora do escopo, inativo ou inexistente, a tela abre o primeiro projeto da lista, sem mensagem de erro.
- RN-04: Trocar de projeto atualiza o endereço da página e limpa os filtros, a busca de caso, a página e os
  modelos escolhidos por linha, como a troca de aba faz hoje (spec 032, RN-03; spec 033).
- RN-05: A barra de busca de caso, o filtro Day or Week e a exportação continuam na tela, valendo para o projeto
  aberto.
- RN-06: Sem nenhum projeto no escopo, a tela mostra o estado vazio de hoje, sem seletor.
- RN-07: O seletor funciona por teclado e por leitor de tela, e os textos acompanham o idioma da interface
  (inglês, português e coreano).
- RN-08: O seletor nunca mostra projetos fora do escopo da pessoa nem de outra unidade (spec 021, RN-02).

## Critérios de aceite

- **CA-01:** Dado um gerente com 40 projetos no escopo, quando abre a General Results, então vê o primeiro
  projeto da lista, o nome dele no título, e nenhum elemento da tela passa da borda.
- **CA-02:** Dado o seletor aberto, quando a pessoa digita parte do nome de um projeto e o escolhe, então a
  tela mostra os casos desse projeto e o nome dele no título.
- **CA-03 (falha):** Dado o seletor aberto, quando a busca não bate com nenhum projeto, então aparece o aviso de
  que nenhum projeto foi encontrado, e o projeto aberto não muda.
- **CA-04:** Dado um projeto escolhido, quando a pessoa recarrega a tela ou abre o link copiado, então volta ao
  mesmo projeto.
- **CA-05 (falha):** Dado um link com um projeto fora do escopo, inativo ou inexistente, quando a pessoa o abre,
  então vê o primeiro projeto do seu escopo, e nada do projeto do link.
- **CA-06:** Dado filtros, busca de caso e página 2 ativos, quando a pessoa troca de projeto, então o novo
  projeto abre sem filtros, na página 1.
- **CA-07:** Dado uma pessoa com um projeto só, quando abre a tela, então vê o nome do projeto no título, sem
  seletor.
- **CA-08 (falha):** Dado uma pessoa sem projetos no escopo, quando abre a tela, então vê o estado vazio, sem
  seletor.
- **CA-09:** Dado só o teclado, quando a pessoa abre o seletor, busca e escolhe um projeto, então o projeto
  muda e o foco volta ao título.

## Fora de escopo

- Mudar as colunas, os filtros, a exportação ou a paginação da tabela (specs 032 e 033).
- Ver dois projetos ao mesmo tempo ou juntar projetos numa lista só.
- Agrupar projetos por setor ou time no seletor.
- Mudar quais projetos aparecem ou a ordem deles.
- Mudar as abas de outras telas.

## Dúvidas em aberto

- Nenhuma. O projeto aberto fica só no endereço da página, sem lembrar o último entre sessões (decidido em
  2026-10-30).
