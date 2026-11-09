# 059. Redesign da General Results: Spec

- **Status:** Em andamento
- **Data:** 2026-11-04
- **Specs relacionadas:** 021 (Resultados gerais), 032 (Resultados Gerais por projeto), 033 (paginação),
  053 (seletor de projeto), 058 (histórico de execuções por linha)
- **Design:** imagens exportadas do Figma em [`figma/`](figma/)

## Problema

O dev não abre a General Results: ela é só de admin, gerente e KP. Para ver os resultados do projeto do time,
ele precisa entrar no projeto e abrir a aba Form Factor. Já quem gerencia tem que sair da General Results e
entrar em cada projeto para criar uma rodada ou importar um relatório SDF, mesmo estando na tela em que
acompanha os resultados.

A tabela também mostra um device por vez em cada linha, escolhido numa lista. Para comparar os devices de um
caso, a pessoa precisa trocar a escolha várias vezes.

## Objetivo

Todos os perfis acompanham os resultados na General Results, cada um no seu escopo. Quem gerencia cria rodadas e
importa relatórios SDF nessa tela. Cada linha expande e mostra todos os devices do caso, com o SDF ID e os
resultados de cada um.

## Histórias de usuário

- Como **dev**, quero ver os resultados dos projetos do meu time sem entrar em cada projeto.
- Como **gerente** ou **KP**, quero criar uma rodada ou importar um relatório SDF na tela em que acompanho os
  resultados.
- Como **qualquer perfil**, quero expandir um caso e ver todos os devices dele de uma vez.
- Como **qualquer perfil**, quero abrir o histórico completo de execuções de um caso.

## Regras de negócio

**Acesso e escopo**
- RN-01: A General Results aparece na navegação para admin, gerente, KP e dev, desde que a pessoa tenha a
  permissão de consultar resultados Form Factor. Substitui a RN-01 da spec 021.
- RN-02: Cada perfil vê os projetos ativos do seu escopo: o admin, a unidade inteira; o gerente, os setores que
  gerencia e os times de que participa; o KP, os projetos do próprio time; e o dev, os projetos dos times de
  que é membro. Projetos de outra unidade nunca aparecem. Para os perfis de gerência, continua a RN-02 da spec 021.

**Ações de gerência**
- RN-03: Os botões **Import SDF Report** e **Create test round** ficam no topo da tabela e valem para o projeto
  aberto. Eles aparecem só para admin, gerente e KP que tenham a permissão correspondente: importar relatório
  SDF para o primeiro e registrar resultados Form Factor para o segundo. O dev nunca os vê, mesmo tendo a
  permissão de registrar, que ele usa para lançar o resultado dos próprios casos.
- RN-04: Criar uma rodada ou importar um relatório pela General Results funciona como na aba Form Factor hoje:
  as mesmas validações, as mesmas mensagens e o mesmo resultado. Depois de uma importação, a tabela já mostra os
  resultados novos, sem recarregar a página. Uma rodada nova só aparece na tabela quando ganha resultados.
  O formato novo do relatório SDF fica para a spec 060.
- RN-05: Os dois botões saem da aba Form Factor do projeto. O lançamento de resultado por linha ("Record
  result") continua lá, para quem já o vê.
- RN-06: Uma pessoa sem permissão que tente criar uma rodada ou importar um relatório por fora da tela é
  recusada, e nada é gravado. O KP também é recusado em projetos de outros times.

**Abas de projeto**
- RN-07: Os projetos voltam a ser abas abaixo do título, e cada aba mostra só o nome do app, sem a versão (ex.:
  "Clock"). Substitui o seletor da spec 053 (RN-01 e RN-02). Continuam valendo da 053: o projeto aberto fica no
  endereço da página (RN-03), a troca de projeto limpa os filtros e volta à página 1 (RN-04), e o estado vazio
  aparece sem abas (RN-06).
- RN-08: Com mais abas do que cabem na largura, nenhuma fica escondida nem cortada: a pessoa chega a todas pelo
  mouse e pelo teclado (o problema da spec 053).

**Tabela**
- RN-09: As colunas são, nesta ordem: **TC ID**, **Assignee**, **Form Factor**, **SDF ID**, uma coluna por data
  de execução e **Actions**. A tabela mostra no máximo as **5 datas mais recentes**, da mais nova à esquerda.
  Substitui o limite de 7 da spec 032 (RN-06) e do ADR 0039 (ADR 0046); o resto das regras de data
  continua (as mais antigas só aparecem pelo filtro de dia ou semana).
- RN-10: Recolhida, a linha mostra o primeiro device da lista do projeto, o SDF ID da última execução desse
  device e os resultados dele em cada data.
- RN-11: Expandida, a linha mostra um device embaixo do outro (todos os devices do projeto), cada um com o
  SDF ID da própria última execução e os próprios resultados por data. Um device sem execução mostra as células
  vazias.
- RN-12: Uma seta no começo da linha, ao lado do número, expande e recolhe aquela linha, sem mexer nas outras,
  pelo mouse e pelo teclado. A seta indica se a linha está aberta ou fechada. Trocar de página, de projeto ou de
  filtro recolhe todas.
- RN-13: TC ID, Assignee, Form Factor e SDF ID têm filtro no cabeçalho. Filtrar por Form Factor ou SDF ID mostra
  os casos que têm aquele device ou aquele SDF ID em qualquer device, não só no primeiro. A busca de caso dentro
  da tela sai (a barra de busca do topo continua).
- RN-14: Clicar num resultado abre a janela de detalhe de hoje (spec 032, RN-09).
- RN-15: A coluna **Actions** tem um ícone de histórico por caso, na primeira linha, mesmo com a linha expandida.
  O ícone é o do design ([`figma/history-icon.svg`](figma/history-icon.svg)). Ele abre o histórico completo de
  execuções do caso, com o SDF ID, a data e o resultado de cada execução, de todos os devices (o mesmo histórico
  da aba Form Factor, spec 058). Todo perfil que vê o caso pode abrir o histórico.
- RN-16: A paginação (20 por página) e a exportação continuam como hoje (spec 033 e ADR 0045).

**Aparência e texto**
- RN-17: Título, subtítulo, abas, botões, tabela, estado vazio e o ícone da General Results na navegação seguem
  o design novo. O estado vazio é o mesmo para todos os perfis: "No projects to show".
- RN-18: Os textos novos acompanham o idioma da interface (inglês, português e coreano).

## Critérios de aceite

- **CA-01:** Dado um dev membro de um time com dois projetos ativos, quando ele abre a navegação, então vê a
  General Results e, ao abri-la, vê uma aba para cada um dos dois projetos.
- **CA-02 (falha):** Dado um dev, quando ele tenta abrir pelo endereço da página um projeto de um time do qual
  não é membro, então vê o primeiro projeto do próprio escopo e nada do outro projeto.
- **CA-03 (falha):** Dado um KP, quando abre a tela, então não vê aba de projeto de outro time.
- **CA-04:** Dado um admin, quando abre a tela, então vê abas de todos os projetos ativos da unidade.
- **CA-05:** Dado um gerente ou KP com as duas permissões, quando abre um projeto, então vê os botões Import SDF
  Report e Create test round.
- **CA-06 (falha):** Dado um dev com a permissão de registrar resultados, quando abre a tela, então não vê
  nenhum dos dois botões.
- **CA-07 (falha):** Dado um dev, quando tenta criar uma rodada ou importar um relatório por fora da tela, então
  é recusado e nada é gravado.
- **CA-08:** Dado um gerente na General Results, quando cria uma rodada válida, então ela é criada como na aba
  Form Factor, com a mesma mensagem de sucesso, e aparece na aba Form Factor do projeto.
- **CA-09:** Dado um gerente na General Results, quando importa um relatório SDF válido, então os resultados
  aparecem na tabela sem recarregar a página.
- **CA-10 (falha):** Dado um relatório SDF inválido, quando é importado pela General Results, então a importação
  é recusada com a mesma mensagem da aba Form Factor, e nada é gravado.
- **CA-11:** Dado a aba Form Factor de um projeto, quando qualquer perfil a abre, então ela não tem os botões
  Import SDF Report nem Create test round, e quem já lançava resultado por linha continua lançando.
- **CA-12:** Dado um projeto "Clock" na versão 2.0, quando a tela mostra as abas, então a aba diz só "Clock".
- **CA-13:** Dado mais projetos do que cabem na largura, quando a pessoa navega pelas abas com o teclado, então
  chega à última, e ela fica visível ao receber o foco.
- **CA-14:** Dado um caso com quatro devices, quando a linha está recolhida, então mostra só o primeiro device,
  com o SDF ID da última execução dele; quando a pessoa expande a linha, então vê os quatro devices, cada um
  com o seu SDF ID e os seus resultados por data.
- **CA-15:** Dado um projeto com execuções em 8 datas diferentes, quando a tela abre sem filtro, então mostra
  só as colunas das 5 datas mais recentes, da mais nova à esquerda.
- **CA-16:** Dado uma linha expandida, quando a pessoa a recolhe pelo teclado, então volta a mostrar só o
  primeiro device, e as outras linhas não mudam.
- **CA-17:** Dado um filtro de SDF ID que bate só com o terceiro device de um caso, quando a pessoa filtra, então
  o caso aparece.
- **CA-18:** Dado qualquer perfil com um caso na tela, quando ele usa a ação de histórico da linha, então vê
  todas as execuções do caso, com SDF ID, data e resultado.
- **CA-19 (falha):** Dado um caso de um projeto fora do escopo da pessoa, quando ela tenta abrir o histórico por
  fora da tela, então não vê nada do caso.
- **CA-20:** Dado uma pessoa sem projetos no escopo, quando abre a tela, então vê o estado vazio "No projects
  to show", sem abas e sem os botões de gerência.

## Fora de escopo

- Mudar o que a criação de rodada ou a importação fazem, suas validações ou suas mensagens (só muda onde ficam
  os botões). O formato novo do relatório SDF é a spec 060.
- Mudar o filtro de dia ou semana, a paginação ou a exportação.
- Navegar para datas anteriores às 5 mais recentes sem usar o filtro.
- Mudar quem lança resultado por linha na aba Form Factor.
- Dar ao gerente o escopo da unidade inteira (exigiria mudar os ADRs 0021 e 0036).
- Mudar o tema escuro além do que o design novo pede.
- Mudar as abas e a navegação de outras telas, além do ícone da General Results.

## Dúvidas em aberto

- Nenhuma. Decidido em 2026-11-04: o gerente mantém o escopo atual (RN-02), a tabela mostra 5 datas (RN-09), a
  linha abre por uma seta (RN-12) e o histórico usa o ícone do design, um por caso (RN-15). A importação no
  formato novo saiu para a spec 060.

