# 037. Kanban do projeto e Board por setor e time: Spec

- **Status:** Em andamento
- **Data:** 2026-10-30
- **ADRs relacionados:** 0013, 0015, 0021, 0026, 0036, 0037

## Problema

Para acompanhar um projeto, gerentes, KPs e devs abrem a aba Test Cases e filtram por Status. Não há uma
visão de quantos casos estão em cada etapa do ciclo da spec 023 nem um jeito rápido de avançar um caso.
A opção Board da navegação lateral ainda mostra "Em breve", e quem gerencia vários setores ou times não tem
um caminho direto até o projeto que quer acompanhar.

## Objetivo

Cada projeto ganha um Kanban, com uma coluna por Status do Test Case. Quem pode mudar o Status de um
caso na aba Test Cases também pode mudá-lo arrastando o card. A opção Board vira o caminho até ele: a pessoa
escolhe, dentro do próprio escopo, o projeto e chega ao Kanban desse projeto. (Revisto em 2026-10-30: o Kanban
deixou de ser uma aba da tela do projeto, porque repetia o que o Board já mostra.)

## Histórias de usuário

- Como **gerente ou KP**, quero ver os casos do projeto distribuídos por Status e mover qualquer caso de etapa.
- Como **dev**, quero ver o Kanban do projeto do meu time e mover os casos dos quais sou o responsável principal.
- Como **gerente de vários setores**, quero escolher setor, time e projeto pelo Board para chegar ao Kanban.
- Como **administrador da unidade**, quero chegar ao Kanban de qualquer projeto da unidade pelo Board.

## Regras de negócio

### Kanban do projeto
- RN-01: O Kanban do projeto se abre só pelo Board e aparece para quem pode consultar os Test Cases do
  projeto. A tela do projeto, aberta por Projects, tem apenas as abas Test Cases e Form Factor. (Revisto em
  2026-10-30: a aba Kanban da tela do projeto saiu, porque repetia o Board.)
- RN-02: O Kanban tem uma coluna por Status, na ordem do ciclo da spec 023: `To-Do`, `In Progress`,
  `In Review`, `In Validation`, `In Fixes`, `Done` e `Excluded`. Cada caso aparece como um card na coluna do
  seu Status, e o cabeçalho de cada coluna mostra o total de casos nela. Os rótulos seguem o idioma da
  interface, como na aba Test Cases.
- RN-03: O card mostra TC ID, Category, Difficulty, TC Situation e o responsável principal, com a esfera de
  avatar na cor que o responsável escolheu nas Configurações (spec 036). Um caso sem responsável mostra "Sem
  responsável".
- RN-04: No Kanban, o dev vê todos os casos do projeto, não só os seus. Isso amplia apenas a leitura no
  Kanban: a aba Test Cases continua mostrando só os casos dele (spec 012).
- RN-04a: O dev do time abre pelo Board o Kanban de qualquer projeto do time, mesmo sem nenhum caso ligado a
  ele (decidido em 2026-10-30). Na tela do projeto, aberta por Projects, vale a spec 012: sem casos no
  projeto, ele vai para a entrada de Projects.
- RN-05: Mover um card para outra coluna muda o Status do caso com as mesmas regras e os mesmos efeitos de
  mudar o Status na aba Test Cases:
  - administrador da unidade, gerente e KP movem qualquer card dentro do próprio escopo (ADR 0036);
  - o responsável principal move os cards dos quais é responsável principal;
  - o backup só pode mover o card para `Excluded`;
  - os demais só visualizam. Um card que a pessoa não pode mover não pode ser arrastado.
- RN-06: Soltar um card em `Excluded` abre a mesma confirmação com justificativa da aba Test Cases (spec
  026). Cancelar a confirmação devolve o card à coluna original sem mudar nada.
- RN-07: O card também pode ser movido sem mouse, pela ação "Mover para" do card. Ela é acessível por
  teclado e lista só os Status para os quais a pessoa pode mover aquele caso.
- RN-08: Se a mudança for recusada (sem permissão, caso inexistente ou falha de comunicação), o card volta à
  coluna original e uma mensagem explica o motivo. O Kanban não mostra um Status que não foi salvo.
- RN-09: Carregamento, falha na consulta e projeto sem casos têm apresentações próprias. Uma falha não
  aparece como "sem casos".
- RN-10: Um projeto com até 1.000 casos abre sem travar a tela, e o total no cabeçalho de cada coluna sempre
  reflete todos os casos dela.
- RN-11: A aba ativa da tela do projeto fica no endereço da página. Um link antigo para a aba Kanban de um
  projeto abre o Kanban desse projeto pelo Board, sem as abas; se o projeto estiver fora do escopo, vale a
  RN-17. (Revisto em 2026-10-30, junto com a RN-01.)

### Arrasto e filtros (ajuste de 2026-10-30)
- RN-11a: Enquanto um card é arrastado, ele segue o ponteiro inteiro e opaco, com sombra; o lugar de onde
  saiu fica marcado; a coluna sob o ponteiro destaca onde ele vai cair, e as colunas que não aceitam o card
  ficam apagadas. Levar o card perto da borda esquerda ou direita do quadro rola as colunas nessa direção.
- RN-11b: O cabeçalho do Kanban tem filtros por responsável, Status, Category, Difficulty e TC Situation, e uma
  busca por TC ID. Os filtros combinam entre si e valem só para a visualização: não mudam nenhum caso.
- RN-11c: Com filtros ativos, cada coluna mostra só os casos que passam neles, e o total da coluna conta só
  esses. O filtro de Status mostra só as colunas escolhidas. Uma opção "Limpar filtros" volta ao quadro completo.
- RN-11d: Os filtros ficam no endereço da página, como a escolha do Board: recarregar ou compartilhar
  o link mantém o mesmo recorte.

### Board na navegação lateral
- RN-12: Do Board, a pessoa abre uma tela só com o Kanban do projeto, sem as abas Test Cases e Form Factor.
  O título dessa tela troca de projeto entre os projetos do Board. A tela do projeto, aberta por Projects,
  tem só as abas Test Cases e Form Factor (RN-01). (Revisto em 2026-10-30: a escolha em cascata
  Setor → Time → Projeto saiu.)
- RN-13: O Board só oferece times e projetos do escopo da pessoa:
  - administrador da unidade: todos os times da unidade;
  - gerente: os times dos setores que gerencia e os times dos quais participa (ADR 0036);
  - KP e dev: os times dos quais participam ativamente.
- RN-14: O dev, e qualquer pessoa com um time só, entra direto no Kanban: no último projeto que abriu pelo
  Board ou, na primeira vez (ou se ele não existir mais), no primeiro projeto ativo. Sem nenhum projeto nos
  seus times, vê um aviso.
- RN-15: Admin, gerente e KP com mais de um time veem uma tela com um card por time, agrupados por setor. O
  card mostra o nome do time, quantos membros ativos ele tem e os projetos com o status de cada um; um clique
  no projeto abre o Kanban. Uma busca no topo filtra por nome de time ou de projeto.
- RN-16: No card, os projetos ativos vêm primeiro e, depois deles, os `Completed` e `Canceled`, mais apagados.
  Um time sem projetos mostra um aviso de que ainda não há projetos nele.

### Escopo e textos
- RN-17: Nada revela setores, times, projetos ou casos fora do escopo da pessoa, nem de outra unidade. Um
  link para o Kanban de um projeto fora do escopo é tratado como projeto inexistente.
- RN-18: Textos e mensagens acompanham o idioma da interface (inglês, português e coreano).

## Critérios de aceite

- **CA-01:** Dado um projeto com casos em vários Status, quando a pessoa abre o Kanban dele, então vê as sete
  colunas na ordem da RN-02, cada caso na coluna do seu Status e o total certo em cada coluna.
- **CA-02:** Dado um dev do time do projeto, quando abre o Kanban dele pelo Board, então vê todos os casos,
  inclusive os de outras pessoas, enquanto a aba Test Cases continua mostrando só os dele.
- **CA-03:** Dado um KP, quando move um caso de `In Review` para `In Validation`, então o card fica em
  `In Validation`, os totais das duas colunas se atualizam e a aba Test Cases mostra o novo Status.
- **CA-04:** Dado o responsável principal de um caso, quando o move de `To-Do` para `In Progress`, então o
  Status muda.
- **CA-05:** Dado alguém que pode mover um card, quando o solta em `Excluded` e confirma com uma
  justificativa, então o caso passa a `Excluded` com a justificativa gravada.
- **CA-06:** Dado a confirmação de exclusão aberta pelo Kanban, quando a pessoa cancela, então o card volta à
  coluna original e o Status não muda.
- **CA-07:** Dado o backup de um caso, quando abre "Mover para" no card, então só `Excluded` é oferecido; e ao
  tentar arrastar o card para outra coluna que não seja `Excluded`, o Status não muda.
- **CA-08:** Dado um card que a pessoa pode mover, quando ela usa "Mover para" pelo teclado, então o caso
  muda de coluna como no arrasto.
- **CA-09 (falha):** Dado um dev que não é responsável principal nem backup de um caso, quando tenta mover o
  card, então o card não pode ser arrastado nem oferece "Mover para", e o Status não muda.
- **CA-10 (falha):** Dado um card que a pessoa pode mover, quando o sistema recusa a mudança (o caso foi
  removido, a permissão mudou ou a conexão falhou), então o card volta à coluna original e uma mensagem
  explica o motivo.
- **CA-11:** Dado um projeto sem casos, quando o Kanban dele é aberto, então mostra as sete colunas vazias e
  um aviso de que o projeto ainda não tem Test Cases.
- **CA-12 (falha):** Dado que a consulta do Kanban falha, quando o Kanban é aberto, então mostra uma mensagem de
  erro com a opção de tentar de novo, e não o aviso de projeto sem casos.
- **CA-13:** Dado um projeto com 1.000 casos, quando o Kanban dele é aberto, então carrega sem travar a tela e
  os totais das colunas somam 1.000.
- **CA-14:** Dado um link antigo para a aba Kanban de um projeto do escopo, quando a pessoa o abre, então vê
  a tela do Kanban desse projeto aberta pelo Board, sem as abas Test Cases e Form Factor.
- **CA-15:** Dado um gerente com times em dois setores, quando abre o Board, então vê um card por time do
  escopo, agrupados por setor, com os membros e os projetos; e um clique num projeto abre a tela do Kanban dele,
  sem as abas Test Cases e Form Factor.
- **CA-16:** Dado a tela de cards, quando a pessoa busca pelo nome de um projeto, então só os times com
  projetos que batem aparecem; e uma busca sem resultado mostra o aviso próprio.
- **CA-17:** Dado um dev, mesmo com mais de um time, quando abre o Board, então entra direto no Kanban, sem a
  tela de cards.
- **CA-18:** Dado alguém que entra direto no Kanban e já abriu outro projeto pelo Board, quando abre o Board de
  novo, então volta a esse projeto; se ele não existir mais, entra no primeiro projeto ativo.
- **CA-19 (falha):** Dado uma pessoa sem nenhum time no escopo, ou um dev cujos times não têm projetos,
  quando abre o Board, então vê o aviso correspondente, sem cards nem Kanban vazio.
- **CA-21:** Dado um card que a pessoa pode mover, quando ela começa a arrastar, então o card acompanha o
  ponteiro com sombra, o lugar de origem fica marcado e só as colunas que aceitam o card ficam em destaque.
- **CA-22:** Dado um arrasto perto da borda direita do quadro, quando o ponteiro fica ali, então as colunas
  rolam para a direita até a coluna de destino ficar visível.
- **CA-23:** Dado casos de responsáveis com cores de avatar diferentes, quando o Kanban abre, então cada card
  mostra a esfera na cor do seu responsável.
- **CA-24:** Dado um Kanban com casos de várias pessoas, quando a pessoa filtra por um responsável e uma
  Difficulty, então cada coluna mostra só os casos que passam nos dois filtros, com o total recalculado.
- **CA-25:** Dado o filtro de Status com `In Review` e `Done`, quando aplicado, então só essas duas colunas aparecem.
- **CA-26:** Dado filtros ativos, quando a pessoa recarrega a página ou abre o link copiado, então vê o mesmo
  recorte; e "Limpar filtros" volta ao quadro completo.
- **CA-27 (falha):** Dado filtros que nenhum caso atende, quando aplicados, então as colunas aparecem vazias
  com o aviso de que nenhum caso corresponde aos filtros, e não o aviso de projeto sem casos.
- **CA-20 (falha):** Dado um gerente, quando abre o link do Kanban de um projeto fora do escopo dele, de outra
  unidade ou inexistente, então vê a mensagem de projeto não encontrado e nenhum caso. O mesmo vale para um
  link antigo para a aba Kanban desse projeto.
- **CA-28:** Dado qualquer perfil que consulta os Test Cases de um projeto, quando abre o projeto por Projects,
  então vê só as abas Test Cases e Form Factor, sem a aba Kanban.
- **CA-29 (falha):** Dado um dev do time sem nenhum caso ligado a ele no projeto, quando abre esse projeto
  por Projects, então vai para a entrada de Projects (spec 012); pelo Board, continua abrindo o Kanban do
  projeto (RN-04a).

## Fora de escopo

- Criar, renomear ou reordenar Status. O catálogo e o ciclo são os da spec 023.
- Impor as transições do ciclo da spec 023 (suspensas desde 2026-10-27). O Kanban segue as mesmas regras da
  aba Test Cases, e qualquer mudança nelas vale para os dois.
- Filtro por semana e por backup no Kanban.
- Reordenar cards dentro da mesma coluna ou guardar uma ordem manual.
- Editar outros campos do caso, abrir o detalhe do caso ou criar casos pelo Kanban.
- Atualização em tempo real quando outra pessoa muda um caso (a mudança aparece ao recarregar).
- Kanban que junte casos de vários projetos ou times.
- Mudar o Status do projeto pelo Kanban.
- Um atalho da tela do projeto para o Kanban dele no Board (a aba saiu em 2026-10-30 e o caminho é o Board).

## Dúvidas em aberto

- Nenhuma.
