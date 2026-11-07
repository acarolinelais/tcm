# 069. Projetos encerrados fora das telas de trabalho: Spec

- **Status:** Aprovada
- **Data:** 2026-11-07

## Problema
Um projeto concluído ou cancelado continua aparecendo no Board, na Timeline e na General Results junto com os
projetos em andamento. Com o tempo, essas listas ficam cheias de projetos que ninguém mais acompanha. Além disso,
dá para concluir um projeto com Test Cases ainda em andamento, e o status Completed passa uma informação falsa.

## Objetivo
Board, Timeline e General Results mostram só os projetos abertos, e os encerrados aparecem quando a pessoa liga
um filtro. Um projeto só pode ser concluído quando todos os Test Cases estiverem terminados.

## Histórias de usuário
- Como **qualquer usuário**, quero ver só os projetos em andamento no Board, na Timeline e na General Results,
  para achar mais rápido o que estou acompanhando.
- Como **qualquer usuário**, quero ligar a exibição dos projetos encerrados quando precisar consultar um deles.
- Como **quem gerencia o projeto**, quero ser impedido de concluir um projeto com Test Cases pendentes, e saber
  quantos faltam, para corrigir antes de concluir.

## Regras de negócio
- RN-01: Um projeto está **encerrado** quando o status é Completed ou Canceled. Os outros status (Created,
  To Do e InProgress) são **abertos**.
- RN-02: Board, Timeline e General Results listam só os projetos abertos.
- RN-03: Cada uma dessas três telas tem o filtro "Show closed projects", desligado sempre que a tela abre.
  Ligado, a tela lista também os projetos encerrados.
- RN-04: A tela Projects continua listando todos os projetos, encerrados ou não, porque é nela que se muda o status.
- RN-05: Um projeto só passa para Completed quando todos os Test Cases ativos dele estão em Done ou Cancelled.
  Os Test Cases excluídos não contam. Um projeto sem Test Cases pode ser concluído.
- RN-06: Quando algum Test Case impede a conclusão, o sistema recusa, mantém o status anterior e avisa quantos
  Test Cases ainda não estão em Done ou Cancelled.
- RN-07: Cancelar o projeto (Canceled) não depende do status dos Test Cases, como hoje.
- RN-08: A pessoa que abre um projeto encerrado por um link direto continua vendo o projeto. O filtro só
  muda as listas e a escolha automática de projeto.
- RN-09: Desligar o filtro com um projeto encerrado aberto leva direto ao primeiro projeto aberto. Sem nenhum
  aberto, a tela mostra o aviso de que não há projeto aberto.

## Critérios de aceite
- **CA-01:** Dado um time com um projeto InProgress e um Completed, quando a pessoa abre o Board, então só o
  projeto InProgress aparece nos cards do time.
- **CA-02:** Dado o mesmo time, quando a pessoa liga "Show closed projects" no Board, então os dois projetos
  aparecem.
- **CA-03:** Dado um dev cujo último projeto aberto no Board foi concluído, quando ele abre o Board, então vai para
  o Kanban de um projeto aberto. Se não houver nenhum projeto aberto, vê o estado vazio com o filtro disponível.
- **CA-04:** Dado um projeto Canceled, quando a pessoa abre o seletor de projeto da Timeline, então ele não está
  na lista. Com o filtro ligado, está.
- **CA-05:** Dado um projeto Completed, quando a pessoa abre o seletor de projeto da General Results, então ele não
  está na lista. Com o filtro ligado, está.
- **CA-06:** Dado que a pessoa ligou o filtro na Timeline, quando sai da tela e volta, então o filtro está
  desligado.
- **CA-07:** Dado um projeto Completed, quando a pessoa abre a tela Projects, então ele aparece na lista, sem filtro.
- **CA-08:** Dado um projeto InProgress com todos os Test Cases em Done ou Cancelled, quando alguém muda o status para
  Completed, então o projeto fica Completed.
- **CA-09:** Dado um projeto sem Test Cases, quando alguém muda o status para Completed, então o projeto fica
  Completed.
- **CA-10 (falha):** Dado um projeto com 3 Test Cases em Done e 2 fora de Done ou Cancelled, quando alguém muda o
  status para Completed, então o sistema recusa, o projeto continua no status anterior e a pessoa vê o aviso de que
  2 Test Cases ainda não estão em Done.
- **CA-11:** Dado um projeto em que o único Test Case fora de Done foi excluído, quando alguém muda o status para
  Completed, então o projeto fica Completed.
- **CA-12:** Dado um projeto com Test Cases em andamento, quando alguém muda o status para Canceled, então o projeto
  fica Canceled.
- **CA-13:** Dado um projeto Completed, quando a pessoa abre o link direto do Kanban dele, então vê o projeto
  normalmente, sem erro de acesso.
- **CA-14:** Dado o filtro ligado e um projeto Canceled aberto no Kanban ou na Timeline, quando a pessoa desliga o
  filtro, então a tela passa para o primeiro projeto aberto.

## Fora de escopo
- Guardar o filtro entre visitas ou entre dispositivos.
- Esconder projetos encerrados na Overview, nos gráficos ou na tela Projects.
- Impedir que um projeto concluído volte para outro status, ou travar a edição dos Test Cases de um projeto encerrado.
- Listar, no aviso de recusa, quais Test Cases estão pendentes (o aviso traz só a quantidade).
- Concluir o projeto automaticamente quando o último Test Case chega em Done.

## Dúvidas em aberto
- Nenhuma no momento.
