# 064. Overview com gráficos para gerente e admin: Spec

- **Status:** Aprovada
- **Data:** 2026-11-05
- **Depende de:** spec 063 (as regras gerais RN-01 a RN-06 valem aqui)

## Problema

O gerente e o admin da unidade veem na Overview os mesmos números soltos de todo mundo. O gerente não vê qual
time está mais atrasado nem onde há retrabalho. O admin não tem uma visão da unidade por setor.

## Objetivo

O gerente e o admin abrem a Overview e veem o andamento dos times ou dos setores e o ritmo de entregas do seu
escopo, no mesmo visual da spec 063.

## Histórias de usuário

- Como **gerente**, quero ver o andamento de cada time, para saber onde agir primeiro.
- Como **gerente**, quero ver onde há Test Cases voltando para correção, para achar os projetos com retrabalho.
- Como **gerente**, quero ver quantos Test Cases cada projeto já tem em Done e como os projetos estão passando
  nos testes de Form Factor, para saber quais estão perto de fechar e quais estão com problema.
- Como **admin da unidade**, quero ver o andamento de cada setor e como os projetos da unidade estão passando nos
  testes, para acompanhar a unidade inteira.

## Regras de negócio

- RN-01: As regras gerais da spec 063 (RN-01 a RN-06) valem aqui: escopo, `Excluded` fora, períodos de 30 dias
  e 12 semanas, acessibilidade e estados vazios.
- RN-02: Gerente, andamento por time: para cada time do escopo, quantos Test Cases estão em To-Do, em andamento
  (`In Progress`, `In Review`, `In Validation` e `In Fixes`) e `Done`.
- RN-03: Gerente, finalizados por semana: quantos Test Cases do escopo entraram em `Done` em cada uma das últimas
  12 semanas (como a RN-11 da spec 063).
- RN-04: Gerente, retrabalho: para cada projeto do escopo, quantos Test Cases estão em `In Fixes` agora. Projetos
  sem nenhum ficam fora do gráfico.
- RN-05: Gerente, Done por projeto: para cada projeto do escopo, quantos Test Cases estão em `Done` e quanto isso
  é do total do projeto (como a RN-12 da spec 063, mostrando também a quantidade).
- RN-06: Gerente, Pass Rate por projeto: para cada projeto do escopo, a porcentagem de resultados `PASS` na rodada
  de Form Factor mais recente do projeto, somando todos os modelos. Projetos sem rodada ficam fora do gráfico.
- RN-07: Gerente, Pass Rate por modelo: o mesmo gráfico do KP (spec 063, RN-08), para o projeto escolhido num
  seletor, com as mesmas regras de escolha (spec 063, RN-04).
- RN-08: Admin, andamento por setor: como a RN-02, agrupado por setor da unidade.
- RN-09: Admin, finalizados por semana da unidade inteira, como a RN-03.
- RN-10: Admin, Pass Rate por projeto: como a RN-06, com todos os projetos da unidade.
- RN-11: Os cards de totais da spec 039 continuam para o gerente.
- RN-12 (ajuste de 2026-11-06, protótipo do Figma, frame 2580-4911): o admin abre a Overview com uma saudação
  ("Hi Caroline, you are almost done."), uma frase com quantos Test Cases da unidade ainda não estão em `Done`
  e, abaixo, um seletor de projeto. Embaixo do seletor, três cards mostram o projeto escolhido: Completed
  (`Done`), In Progress (`In Progress`, `In Review`, `In Validation` e `In Fixes`) e All (total, sem `Excluded`).
  Os gráficos do admin continuam com a unidade inteira. Sem nada a fazer, a frase diz que está tudo pronto.
  Ampliado no mesmo dia para todos os perfis, cada um com o seu escopo: gerente e KP têm o mesmo seletor e os
  mesmos cards, com o geral do projeto escolhido (o seletor também troca o burndown e o Pass Rate por modelo); o
  dev tem o seletor quando é o responsável principal em dois ou mais projetos (com um só, vê o nome do projeto) e
  os cards mostram Completed, In Progress e Assigned dele no projeto escolhido; os gráficos do dev continuam com
  todos os projetos dele. Um perfil sem visão própria mostra Completed, In Progress e All do escopo. O cartão de
  topo da spec 039 sai.

## Critérios de aceite

- **CA-01:** Dado um gerente com dois times, quando abre a Overview, então vê o andamento de cada time separado,
  com To-Do, em andamento e Done.
- **CA-02:** Dado 3 Test Cases em `In Fixes` no projeto X e nenhum no Y, quando o gerente abre o retrabalho,
  então vê X com 3 e não vê Y.
- **CA-03:** Dado um projeto com 10 Test Cases, 4 em `Done` e 1 `Excluded`, quando o gerente abre Done por projeto,
  então o projeto mostra 4 Test Cases, 44% de 9.
- **CA-04:** Dado a rodada mais recente de um projeto com 10 resultados, 8 deles `PASS`, e uma rodada antiga só com
  `FAIL`, quando o gerente abre o Pass Rate por projeto, então o projeto mostra 80%.
- **CA-05:** Dado dois projetos no escopo, quando o gerente escolhe o segundo no seletor, então o Pass Rate por
  modelo passa a mostrar só esse projeto.
- **CA-06:** Dado um admin com dois setores, quando abre a Overview, então vê o andamento de cada setor separado.
- **CA-07:** Dado 2 Test Cases que entraram em `Done` na semana passada na unidade, quando o admin abre
  Finalizados por semana, então a semana passada mostra 2.
- **CA-08:** Dado dois setores com um projeto cada, quando o admin abre o Pass Rate por projeto, então vê os dois
  projetos, cada um com a porcentagem da sua rodada mais recente.
- **CA-12:** Dado uma unidade com 400 Test Cases, 57 em `Done`, e o projeto Clock com 230 (26 `Done` e 16 em
  andamento), quando o admin abre a Overview com o Clock escolhido, então vê "only 343 test cases left" e os
  cards 26, 16 e 230.
- **CA-13:** Dado dois projetos, quando o admin escolhe o segundo, então os três cards passam a mostrar só ele.
- **CA-09 (falha):** Dado nenhum Test Case em `In Fixes` no escopo, quando o gerente abre a Overview, então o
  retrabalho mostra o estado vazio e os outros gráficos continuam na tela.
- **CA-10 (falha):** Dado um projeto sem nenhuma rodada de Form Factor, quando o gerente abre a Overview, então
  ele não aparece no Pass Rate por projeto e, escolhido no seletor, o Pass Rate por modelo mostra o estado vazio.
- **CA-11 (falha):** Dado um gerente da unidade A, quando abre a Overview, então nenhum time nem projeto da
  unidade B aparece.

## Fora de escopo

- Os gráficos do KP e do dev (spec 063).
- Comparar períodos ou escolher o período.
- Indicadores por pessoa para o gerente ou o admin (a distribuição por dev é do KP, na spec 063).

## Decisões (2026-11-06)

- As propostas para o gerente e o admin foram aprovadas na revisão da spec 063 (2026-11-05).
- "Finalizados por semana" (RN-03 e RN-09) conta a entrada em `Done`, como na spec 063. As datas da spec 065
  (Code done e End date) ficam fora dos gráficos.
- Sem gráfico de Code done. No lugar, o gerente ganha o Done por projeto e o Pass Rate, por projeto e por modelo
  (RN-05 a RN-07).

- O admin também tem o Pass Rate por projeto, com todos os projetos da unidade (RN-10).

## Dúvidas em aberto

- Nenhuma.
