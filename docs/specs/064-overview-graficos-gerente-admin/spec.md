# 064. Overview com gráficos para gerente e admin: Spec

- **Status:** Rascunho
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
- Como **admin da unidade**, quero ver o andamento de cada setor, para acompanhar a unidade inteira.

## Regras de negócio

- RN-01: As regras gerais da spec 063 (RN-01 a RN-06) valem aqui: escopo, `Excluded` fora, períodos de 30 dias
  e 12 semanas, acessibilidade e estados vazios.
- RN-02: Gerente, andamento por time: para cada time do escopo, quantos Test Cases estão em To-Do, em andamento
  (`In Progress`, `In Review`, `In Validation` e `In Fixes`) e `Done`.
- RN-03: Gerente, finalizados por semana: quantos Test Cases do escopo entraram em `Done` em cada uma das últimas
  12 semanas (como a RN-11 da spec 063).
- RN-04: Gerente, retrabalho: para cada projeto do escopo, quantos Test Cases estão em `In Fixes` agora. Projetos
  sem nenhum ficam fora do gráfico.
- RN-05: Admin, andamento por setor: como a RN-02, agrupado por setor da unidade.
- RN-06: Admin, finalizados por semana da unidade inteira, como a RN-03.
- RN-07: Os cards de totais da spec 039 continuam para os dois perfis.

## Critérios de aceite

- **CA-01:** Dado um gerente com dois times, quando abre a Overview, então vê o andamento de cada time separado,
  com To-Do, em andamento e Done.
- **CA-02:** Dado 3 Test Cases em `In Fixes` no projeto X e nenhum no Y, quando o gerente abre o retrabalho,
  então vê X com 3 e não vê Y.
- **CA-03:** Dado um admin com dois setores, quando abre a Overview, então vê o andamento de cada setor separado.
- **CA-04:** Dado 2 Test Cases que entraram em `Done` na semana passada na unidade, quando o admin abre
  Finalizados por semana, então a semana passada mostra 2.
- **CA-05 (falha):** Dado nenhum Test Case em `In Fixes` no escopo, quando o gerente abre a Overview, então o
  retrabalho mostra o estado vazio e os outros gráficos continuam na tela.
- **CA-06 (falha):** Dado um gerente da unidade A, quando abre a Overview, então nenhum time nem projeto da
  unidade B aparece.

## Fora de escopo

- Os gráficos do KP e do dev (spec 063).
- Comparar períodos ou escolher o período.
- Indicadores por pessoa para o gerente ou o admin (a distribuição por dev é do KP, na spec 063).

## Dúvidas em aberto

- Nenhuma. As propostas para o gerente e o admin foram aprovadas na revisão da spec 063 (2026-11-05).
