# 037. Kanban do projeto e Board por setor e time: Spec

- **Status:** Aprovada
- **Data:** 2026-10-30
- **ADRs relacionados:** 0013, 0015, 0021, 0026, 0036, 0037

## Problema

Para acompanhar um projeto, gerentes, KPs e devs abrem a aba Test Cases e filtram por Status. Não há uma
visão de quantos casos estão em cada etapa do ciclo da spec 023 nem um jeito rápido de avançar um caso.
A opção Board da navegação lateral ainda mostra "Em breve", e quem gerencia vários setores ou times não tem
um caminho direto até o projeto que quer acompanhar.

## Objetivo

Cada projeto ganha uma aba Kanban, com uma coluna por Status do Test Case. Quem pode mudar o Status de um
caso na aba Test Cases também pode mudá-lo arrastando o card. A opção Board vira um atalho: a pessoa escolhe
setor, time e projeto dentro do próprio escopo e chega ao Kanban desse projeto.

## Histórias de usuário

- Como **gerente ou KP**, quero ver os casos do projeto distribuídos por Status e mover qualquer caso de etapa.
- Como **dev**, quero ver o Kanban do projeto do meu time e mover os casos dos quais sou o responsável principal.
- Como **gerente de vários setores**, quero escolher setor, time e projeto pelo Board para chegar ao Kanban.
- Como **administrador da unidade**, quero chegar ao Kanban de qualquer projeto da unidade pelo Board.

## Regras de negócio

### Aba Kanban do projeto
- RN-01: A tela do projeto ganha a aba Kanban, ao lado de Test Cases e Form Factor. Ela aparece para quem
  pode consultar os Test Cases do projeto.
- RN-02: O Kanban tem uma coluna por Status, na ordem do ciclo da spec 023: `To-Do`, `In Progress`,
  `In Review`, `In Validation`, `In Fixes`, `Done` e `Excluded`. Cada caso aparece como um card na coluna do
  seu Status, e o cabeçalho de cada coluna mostra o total de casos nela. Os rótulos seguem o idioma da
  interface, como na aba Test Cases.
- RN-03: O card mostra TC ID, Category, Difficulty, TC Situation e o responsável principal. Um caso sem
  responsável mostra "Sem responsável".
- RN-04: No Kanban, o dev vê todos os casos do projeto, não só os seus. Isso amplia apenas a leitura no
  Kanban: a aba Test Cases continua mostrando só os casos dele (spec 012).
- RN-04a: O dev do time abre o Kanban de qualquer projeto do time, mesmo sem nenhum caso ligado a ele
  (decidido em 2026-10-30). Nas outras abas continua valendo a spec 012: sem casos no projeto, ele vai para a
  entrada de Projects.
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
- RN-11: A aba ativa fica no endereço da página: um link para o Kanban de um projeto abre direto nessa aba.

### Board na navegação lateral
- RN-12: A opção Board abre uma escolha em cascata: Setor → Time → Projeto. Ao escolher o projeto, a pessoa
  vai para uma tela só com o Kanban desse projeto, sem as abas Test Cases e Form Factor (decidido em
  2026-10-30). A tela do projeto, aberta por Projects, continua com as três abas.
- RN-13: Cada seletor só oferece opções do escopo da pessoa:
  - administrador da unidade: todos os setores da unidade;
  - gerente: os setores que gerencia e os setores dos times dos quais participa (ADR 0036);
  - KP e dev: os setores dos times dos quais participam ativamente; no seletor de time, só esses times.
- RN-14: Quando um seletor tem uma única opção, ela é escolhida automaticamente. Um gerente de um só setor
  começa pelo time; quem tem um só time com um só projeto vai direto para o Kanban dele.
- RN-15: Trocar o setor limpa time e projeto; trocar o time limpa o projeto.
- RN-16: O seletor de projeto lista primeiro os projetos ativos e, depois deles, os `Completed` e `Canceled`.
  Um time sem projetos mostra um aviso de que ainda não há projetos nele.

### Escopo e textos
- RN-17: Nada revela setores, times, projetos ou casos fora do escopo da pessoa, nem de outra unidade. Um
  link para o Kanban de um projeto fora do escopo é tratado como projeto inexistente.
- RN-18: Textos e mensagens acompanham o idioma da interface (inglês, português e coreano).

## Critérios de aceite

- **CA-01:** Dado um projeto com casos em vários Status, quando a pessoa abre a aba Kanban, então vê as sete
  colunas na ordem da RN-02, cada caso na coluna do seu Status e o total certo em cada coluna.
- **CA-02:** Dado um dev do time do projeto, quando abre a aba Kanban, então vê todos os casos do projeto,
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
- **CA-11:** Dado um projeto sem casos, quando a aba Kanban é aberta, então mostra as sete colunas vazias e
  um aviso de que o projeto ainda não tem Test Cases.
- **CA-12 (falha):** Dado que a consulta do Kanban falha, quando a aba é aberta, então mostra uma mensagem de
  erro com a opção de tentar de novo, e não o aviso de projeto sem casos.
- **CA-13:** Dado um projeto com 1.000 casos, quando a aba Kanban é aberta, então carrega sem travar a tela e
  os totais das colunas somam 1.000.
- **CA-14:** Dado um link para a aba Kanban de um projeto do escopo, quando a pessoa o abre, então a tela do
  projeto já abre nessa aba.
- **CA-15:** Dado um gerente de dois setores, quando abre o Board, então escolhe setor, time e projeto, cada
  seletor lista só opções do escopo dele, e ao escolher o projeto ele vai para a tela do Kanban do projeto,
  sem as abas Test Cases e Form Factor.
- **CA-16:** Dado um gerente de um só setor, quando abre o Board, então o setor já vem escolhido e ele começa
  pelo time.
- **CA-17:** Dado um dev de um só time com um só projeto, quando abre o Board, então vai direto para a tela
  do Kanban desse projeto.
- **CA-18:** Dado setor, time e projeto escolhidos no Board, quando a pessoa troca o setor, então time e
  projeto são limpos.
- **CA-19 (falha):** Dado uma pessoa sem nenhum time no escopo, quando abre o Board, então vê um aviso de que
  não há times disponíveis, sem seletores vazios.
- **CA-20 (falha):** Dado um gerente, quando abre o link do Kanban de um projeto fora do escopo dele, de outra
  unidade ou inexistente, então vê a mensagem de projeto não encontrado e nenhum caso.

## Fora de escopo

- Criar, renomear ou reordenar Status. O catálogo e o ciclo são os da spec 023.
- Impor as transições do ciclo da spec 023 (suspensas desde 2026-10-27). O Kanban segue as mesmas regras da
  aba Test Cases, e qualquer mudança nelas vale para os dois.
- Filtros e busca dentro do Kanban (por responsável, Category, Difficulty, semana).
- Reordenar cards dentro da mesma coluna ou guardar uma ordem manual.
- Editar outros campos do caso, abrir o detalhe do caso ou criar casos pelo Kanban.
- Atualização em tempo real quando outra pessoa muda um caso (a mudança aparece ao recarregar).
- Kanban que junte casos de vários projetos ou times.
- Mudar o Status do projeto pelo Kanban.

## Dúvidas em aberto

- Nenhuma.
