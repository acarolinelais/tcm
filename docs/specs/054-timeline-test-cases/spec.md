# 054. Timeline dos Test Cases: Spec

- **Status:** Concluída
- **Data:** 2026-11-01
- **Depende de:** spec 038 (histórico gravado no banco) e [ADR 0044](../../adr/0044-auditoria-por-triggers-no-postgresql.md)
- **Referência visual:** [Figma, Timeline](https://www.figma.com/design/Klnf2iLbJVqC3X09ammwyL/Test-Case-Manager?node-id=2321-345)

## Problema

Desde a spec 038, toda mudança em Test Cases e links de PR fica registrada. Mas o histórico só aparece caso a
caso, no painel de detalhes. Quem acompanha um projeto não consegue ver o andamento dele no tempo: o que
mudou nesta semana, em que dias o time trabalhou em certos casos, o que uma pessoa fez desde segunda-feira.
O item Timeline do menu existe, mas leva a uma tela "Em breve".

## Objetivo

A tela Timeline mostra, para o projeto escolhido, as mudanças nos Test Cases distribuídas em uma grade de
dias, com visão por dia, semana ou mês, e filtros por pessoa e por Test Case.

## Histórias de usuário

- Como **gerente**, quero ver o que mudou nos casos de um projeto nesta semana, para acompanhar o andamento
  sem abrir caso por caso.
- Como **KP**, quero filtrar a timeline por uma ou mais pessoas do meu time, para saber em que cada uma
  trabalhou.
- Como **dev**, quero ver a linha do tempo de um ou mais casos, para entender o que aconteceu com eles.

## Regras de negócio

- RN-01: A tela Timeline abre pelo item do menu, para todos os perfis. Cada pessoa só escolhe projetos que
  pode ver (ADR 0015) e só vê mudanças desses projetos. Mudanças de outra unidade nunca aparecem.
- RN-02: O projeto é escolhido em um seletor com busca, no mesmo padrão da General Results (spec 053). Sem
  projeto no endereço, a tela abre no primeiro da lista. Sem nenhum projeto visível, avisa que não há projetos.
- RN-03: Há três visões:
  - **Dia:** um dia, com as mudanças distribuídas pelas horas.
  - **Semana:** sete dias, de segunda a domingo.
  - **Mês:** o mês do calendário.

  A tela abre na visão Semana, na semana atual. As setas avançam e voltam um período inteiro, e o intervalo
  exibido aparece entre elas (ex.: "22 Dec - 4 Jan"). Um atalho "Hoje" volta ao período atual.
- RN-04: Um card agrupa as mudanças de **um Test Case em um dia**, feitas por qualquer pessoa. Ele mostra o
  identificador do caso, o nome e o avatar do **responsável atual do caso** e, quando há mais de uma mudança,
  a quantidade (ex.: "3 mudanças"). Quem fez cada mudança aparece no painel (RN-05). Na visão Dia, o card fica
  na hora da primeira mudança do grupo. (Alterado em 2026-11-01: antes o card mostrava quem fez a mudança.)
- RN-05: Ao clicar em um card, abre um painel com as mudanças do grupo, da mais recente para a mais antiga,
  no mesmo formato do histórico do Test Case ("campo: antes → depois", data e hora, perfil e origem), e um
  atalho para abrir o Test Case.
- RN-06: Os valores aparecem como no resto do sistema: opções com o rótulo traduzido, responsável e Backup
  pelo nome. No painel, nome e perfil do autor são os do momento da mudança (spec 038, RN-02), e mudança sem
  autor (seed ou script) aparece como "Sistema". O responsável do card aparece com o nome de hoje.
- RN-07: Filtros:
  - responsável, com um ou vários valores;
  - Test Case, com um ou vários valores, buscando pelo identificador ou pelo título.

  As opções são os responsáveis e os casos com mudanças no período exibido. Uma escolha que não tem mudanças no
  novo período continua marcada. Combinar os dois filtros mostra só o que atende aos dois. Os filtros continuam ao trocar de visão ou de período, e voltam ao vazio ao trocar de projeto.
- RN-08: No topo, uma pilha de avatares mostra os responsáveis dos casos com mudanças no período exibido (até 5 avatares e "+N"
  para o restante). Passar o mouse sobre um avatar mostra o nome.
- RN-09: Uma linha vertical marca o momento atual quando ele está dentro do período exibido.
- RN-10: A tela só lê. Nada nela altera o histórico (spec 038, RN-05).
- RN-11: Um período sem mudanças mostra a grade vazia com a mensagem "Nenhuma mudança neste período". Com
  filtros aplicados, a mensagem tem o atalho "Limpar filtros".

## Critérios de aceite

- **CA-01:** Dado um gerente com acesso ao projeto Clock, quando abre a Timeline e escolhe Clock, então vê a
  semana atual, de segunda a domingo, com as mudanças daquela semana nos dias certos.
- **CA-02:** Dado o Clock_00046, com a Raquel como responsável, em que a Raquel mudou o Status e um KP mudou a
  Category na segunda, quando a semana aparece, então há um único card na segunda com "Clock_00046", "Raquel"
  e "2 mudanças". Ao clicar, o painel mostra as duas, com antes e depois e quem fez cada uma.
- **CA-03:** Dado casos com Ana, Bia e Caio como responsáveis, quando o usuário filtra Ana e Bia, então só os
  cards dos casos das duas aparecem. Ao filtrar só a Ana, somem os da Bia.
- **CA-04:** Dado mudanças em Clock_00001, Clock_00046 e Clock_00050, quando o usuário filtra Clock_00001 e
  Clock_00046, então só os cards desses dois casos aparecem.
- **CA-05:** Dado a visão Semana, quando o usuário troca para Mês, então vê o mês que contém a semana exibida,
  e os filtros continuam aplicados.
- **CA-06:** Dado a semana atual, quando o usuário clica na seta de voltar, então vê a semana anterior e o
  intervalo exibido muda. "Hoje" volta à semana atual.
- **CA-07:** Dado casos de seis responsáveis com mudanças na semana, quando a semana aparece, então o topo mostra cinco
  avatares e "+1".
- **CA-08:** Dado uma mudança feita pela Ana, com perfil Key Person, que depois é renomeada, quando o card
  abre, então mostra "Ana" e "Key Person".
- **CA-09 (falha):** Dado um dev, quando abre o seletor de projetos, então só aparecem projetos que ele pode
  ver. Ao tentar consultar a timeline de outro projeto pelo endereço, recebe o mesmo erro de projeto
  inexistente.
- **CA-10 (falha):** Dado mudanças de outra unidade, quando qualquer perfil consulta a timeline, então elas
  nunca aparecem, nem com filtros.
- **CA-11 (falha):** Dado uma semana sem mudanças, quando ela aparece, então a grade mostra "Nenhuma mudança
  neste período". Com filtros, aparece também "Limpar filtros", que volta aos cards sem filtro.
- **CA-12 (falha):** Dado uma consulta com período inválido (fim antes do início ou mais longo que um mês),
  quando chega ao sistema, então é recusada com uma mensagem e nada é retornado.

## Fora de escopo

- Mudanças em projetos, rodadas de Form Factor, usuários e times. Só entra o que a spec 038 registra (Test
  Cases e links de PR).
- Eventos futuros e marcos planejados ("upcoming tasks" do texto do Figma): o histórico só tem o passado.
- Timeline de vários projetos ao mesmo tempo.
- Filtro por tipo de mudança, por perfil ou por origem (isso fica na tela de Auditoria, spec 052).
- Exportar a timeline.
- Arrastar cards ou editar o caso pela timeline.
- Atualização em tempo real; a tela mostra o que havia ao carregar.

## Dúvidas em aberto

- Nenhuma. Acesso por escopo do perfil, card por caso e dia com o responsável do caso, e item próprio no menu
  com seletor de projeto foram definidos com o usuário em 2026-11-01.
