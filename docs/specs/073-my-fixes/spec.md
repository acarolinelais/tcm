# 073. Aba My Fixes e fluxo de correção: Spec

- **Status:** Concluída
- **Data:** 2026-11-11
- **Specs relacionadas:** 072 (SDF Failures e Dev Fix), 023 (ciclo de Status), 066 (Status pela importação do SDF),
  075 (End date e Planned date)

## Problema

O time vai trabalhar em duas sprints separadas: uma de automação e outra de manutenção, para corrigir o que falhou no
SDF. Hoje o KP escolhe o Dev Fix na SDF Failures (spec 072), mas o dev não tem um lugar para ver o que precisa
corrigir. Ele precisa procurar os casos em In Fixes na tabela do projeto, e só vê os casos em que é o responsável ou
o backup, não os que recebeu para corrigir. Quando a correção falha de novo, nada mostra que é a segunda tentativa.

## Objetivo

O projeto ganha a aba **My Fixes**, onde cada pessoa vê os casos que tem para corrigir e anda com eles pelo fluxo de
correção até passarem em todos os devices. Um caso que falha de novo volta para a mesma pessoa, marcado com o número
da tentativa.

## Histórias de usuário

- Como **dev**, quero ver num lugar só os casos que tenho para corrigir, os meus e os que o KP me passou, para
  organizar a sprint de manutenção.
- Como **dev**, quero mudar o Status da correção sem sair da aba, para avisar quando mandei o PR e quando está pronto
  para o SDF.
- Como **dev**, quero ver o histórico de falhas do SDF de um caso, para entender o que falhou antes de corrigir.
- Como **KP**, quero que uma correção que falhou de novo volte para quem corrigiu, marcada como reincidente, para
  decidir se realoco.

## Regras de negócio

**Fluxo de Status**
- RN-01: O ciclo de um caso é To-Do → In Progress → In Review → In Validation. Na importação do SDF, um caso em In
  Validation com falha vai para In Fixes (spec 072, RN-03); passando em todos os devices, vai para Done.
- RN-02: Na correção, o caso sai de In Fixes e segue In Progress → In Review → In Validation. Enquanto não passar em
  todos os devices, cada importação com falha o leva de volta para In Fixes.
- RN-03: Cada volta para In Fixes abre uma nova **tentativa** de correção. A primeira entrada em In Fixes é a
  tentativa 1.

**Quem corrige**
- RN-04: O **corretor** de um caso é o Dev Fix (spec 072). Sem Dev Fix, é o responsável (Dev Owner).
- RN-05: O KP escolhe e troca o Dev Fix pela SDF Failures, como hoje (spec 072, RN-17). Trocar o Dev Fix leva o caso
  para a My Fixes do novo corretor, sem mudar o Status nem a tentativa.
- RN-06: Uma falha nova volta para o mesmo corretor: o Dev Fix não muda quando o caso volta para In Fixes.

**Aba My Fixes**
- RN-07: A página do projeto ganha a aba My Fixes, ao lado de Test Cases e Form Factor, para todos os perfis que
  veem o projeto.
- RN-08: A aba lista os casos do projeto em que a pessoa é o corretor e que estão em correção: com falha na SDF
  Failures e com Status In Fixes, In Progress, In Review ou In Validation. Done, Excluded e Cancelled não aparecem.
- RN-09: Colunas: TC ID, Status, Dev Owner, Dev Fix, Run Date e End Date. A Run Date é a da falha mais recente. A End
  Date é o dia em que a tentativa atual entrou em In Review; vazia até isso acontecer.
- RN-10: O Status na linha só oferece In Fixes, In Progress, In Review e In Validation, na ordem do fluxo. Um caso
  recém-chegado aparece com In Fixes.
- RN-11: O corretor muda o Status pela linha. A gestão do time do projeto também pode. Outra pessoa vê a linha (se a
  vir) sem a ação.
- RN-12: Clicar no TC ID abre um painel lateral com o histórico de falhas do SDF daquele caso: device, SDF ID, Run
  Date, resultado e Description, da mais nova para a mais antiga, agrupado por tentativa.
- RN-13: A tabela segue as regras de tabela do projeto: 20 casos por página, filtros por Status e Dev Owner, estados
  de carregando, vazio e erro. A ordem é a do fluxo (In Fixes primeiro) e, dentro do mesmo Status, a falha mais
  recente primeiro.

**Tentativas (proposta visual)**
- RN-14: A partir da tentativa 2, o TC ID mostra um selo com o número da tentativa ("2ª correção"), na My Fixes e na
  SDF Failures. A cor do selo não é a única informação: o texto diz o número.
- RN-15: A SDF Failures ganha o filtro **Reincidentes**, que mostra só os casos a partir da tentativa 2, para o KP
  decidir se realoca.

## Critérios de aceite

- **CA-01:** Dado um caso de Caio em In Validation, quando a importação do SDF traz uma falha, então o caso vai para
  In Fixes e aparece na My Fixes de Caio com Status In Fixes, tentativa 1 e sem selo.
- **CA-02:** Dado um caso de Caio na My Fixes, quando o KP escolhe Ana como Dev Fix na SDF Failures, então o caso sai
  da My Fixes de Caio e entra na de Ana, com o mesmo Status.
- **CA-03:** Dado um caso na My Fixes de Ana, quando ela muda o Status para In Progress, In Review e In Validation,
  então cada mudança é salva, e em In Review a End Date da linha passa a ser o dia da mudança.
- **CA-04:** Dado um caso de Ana em In Validation na tentativa 1, quando a importação traz falha de novo, então ele
  volta para In Fixes na My Fixes de Ana, com o selo "2ª correção" ali e na SDF Failures.
- **CA-05:** Dado um caso em correção, quando a importação traz PASS em todos os devices, então ele vai para Done e
  sai da My Fixes.
- **CA-06:** Dado um caso na My Fixes, quando a pessoa clica no TC ID, então o painel mostra as falhas do caso
  agrupadas por tentativa, da mais nova para a mais antiga.
- **CA-07 (falha):** Dado um caso em correção cujo corretor é Ana, quando Caio (responsável, sem ser da gestão) abre a
  própria My Fixes, então o caso não aparece.
- **CA-08 (falha):** Dado uma pessoa que não é o corretor nem da gestão, quando tenta mudar o Status de um caso em
  correção de outra pessoa, então o sistema recusa e o Status não muda.
- **CA-09 (falha):** Dado a linha da My Fixes, quando a pessoa abre o Status, então To-Do, Done, Excluded e Cancelled
  não estão entre as opções; uma mudança para eles pela My Fixes é recusada.
- **CA-10 (falha):** Dado uma pessoa sem casos para corrigir no projeto, quando abre a aba, então vê o estado vazio
  explicando que os casos aparecem ali quando falham no SDF.
- **CA-11:** Dado a SDF Failures com casos na tentativa 1 e na 2, quando o KP liga o filtro Reincidentes, então só os
  da tentativa 2 aparecem.

## Fora de escopo

- As datas End date e Planned date da aba Test Cases (spec 075).
- Uma página de correções no menu, juntando todos os projetos.
- Notificar a pessoa quando um caso entra na My Fixes dela (spec 046).
- Mudar o que a SDF Failures guarda ou quando uma falha sai dela (spec 072, RN-06 a RN-08).

## Dúvidas em aberto

- Nenhuma. A proposta visual das tentativas (RN-14 e RN-15) foi aprovada, e a aba aparece vazia para quem não tem nada
  para corrigir (CA-10).
