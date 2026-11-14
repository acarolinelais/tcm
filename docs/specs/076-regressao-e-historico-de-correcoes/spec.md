# 076. Regressão em caso Done e histórico de correções: Spec

- **Status:** Concluída
- **Data:** 2026-11-13
- **Specs relacionadas:** 066 (Status pela importação do SDF, alterada), 072 (SDF Failures e Dev Fix),
  073 (My Fixes e tentativas), 022 (rodadas manuais), 067 (desfazer importação), 069 (projetos encerrados),
  063 e 064 (Overview)

## Problema

Hoje só um caso em In Validation muda de Status com o resultado do SDF. Quando um caso já em Done falha numa execução
seguinte, ele continua Done, e a falha fica na SDF Failures sem chegar à My Fixes de ninguém. Numa simulação com 160
Test Cases em duas sprints, 57 casos Done ficaram parados na SDF Failures, escondendo o que realmente precisava de
correção.

Além disso, quando uma correção passa, o caso sai da SDF Failures e da My Fixes. Não há onde ver o que cada dev
corrigiu, quantas tentativas levou e quanto tempo demorou. Hoje isso só se descobre caso a caso, pela Timeline ou
pela Auditoria.

## Objetivo

Uma falha num caso Done reabre a correção, e o caso volta para quem corrige. Cada tentativa de correção fica
registrada com o corretor, as datas e o resultado, e esse histórico aparece na My Fixes e no Overview.

## Histórias de usuário

- Como **KP**, quero que um caso Done que volta a falhar entre sozinho em correção, para não depender de garimpar a
  SDF Failures.
- Como **dev**, quero ver as correções que já terminei, para acompanhar meu trabalho na sprint de manutenção.
- Como **KP** ou **gerente**, quero ver as correções do projeto por dev, com tentativas e tempo, para avaliar a
  sprint e redistribuir o trabalho.

## Regras de negócio

**Regressão em caso Done**
- RN-01: Quando a importação do SDF traz uma falha para um caso em Done, o caso vai para In Fixes e abre uma nova
  tentativa de correção, como a falha de um caso em In Validation (spec 073, RN-03). Falha é o que a spec 072 (RN-02)
  chama de falha; PASS, N/A e Check não reabrem. A rodada manual não entra aqui: ela só inclui casos em In Validation
  (spec 022).
- RN-02: Só reabre se a falha for o resultado mais recente daquele device. Um relatório mais antigo importado depois
  entra no histórico sem mexer no Status.
- RN-03: O caso volta para o corretor (spec 073, RN-04): o Dev Fix, se houver, ou o responsável. O Dev Fix não muda.
- RN-04: Casos Excluded, Cancelled ou de projeto encerrado (spec 069) não reabrem; a falha fica só no histórico de
  execuções.
- RN-05: A End date do caso (primeira entrada em In Review, spec 075) não muda quando ele reabre.
- RN-06: Desfazer a importação que reabriu o caso (spec 067) devolve o caso para Done e apaga a tentativa aberta por
  ela, desde que ninguém tenha mexido no caso depois, como já vale para In Validation.
- RN-07: Reabrir reduz os casos concluídos do projeto no Overview e no burndown. É o comportamento esperado: o caso
  deixou de estar pronto.

**Registro das tentativas**
- RN-08: Cada tentativa de correção guarda: o caso, o número da tentativa, como abriu (falha em validação ou
  regressão em Done), o corretor, o dia da falha que a abriu, a End date da tentativa (primeira entrada em In Review
  nela, spec 073 RN-09), o dia em que fechou e o resultado.
- RN-09: Uma tentativa fecha como **Corrigida** quando o caso passa em todos os devices e vai para Done; como
  **Falhou de novo** quando uma nova falha abre a tentativa seguinte; e como **Encerrada** quando o caso é Excluded ou
  Cancelled durante a tentativa. O tempo até corrigir vai do dia da falha ao dia em que a tentativa fechou.
- RN-10: O corretor de uma tentativa aberta é o corretor atual do caso. Quando a tentativa fecha, fica registrado quem
  era o corretor naquele momento; trocar o Dev Fix depois não muda tentativas já fechadas.
- RN-11: Na publicação, os casos que já estão em correção ganham o registro da tentativa atual, com o dia da falha mais
  recente dela. Tentativas fechadas antes da publicação não são reconstruídas.

**Correções concluídas na My Fixes**
- RN-12: A aba My Fixes ganha a escolha entre **Em correção** (o que existe hoje, e o padrão) e **Concluídas**.
- RN-13: Em Concluídas, o dev vê as tentativas já fechadas em que ele era o corretor. Admin, gerente e KP veem as de
  todos no projeto, dentro do escopo deles (como a RN-08 da spec 073). Isso faz o papel do histórico de correções do
  projeto para a gestão.
- RN-14: Uma linha por tentativa, com as colunas TC ID (com o selo da tentativa), Corretor, Origem, Falha em,
  End date, Fechada em, Resultado e Dias até corrigir. A mais recente primeiro.
- RN-15: Filtros por Corretor, Resultado e período (Day or Week, pelo dia em que fechou), com 20 linhas por página,
  estados de carregando, vazio e erro, e exportação como nas outras tabelas.

**Overview**
- RN-16: KP e gerente ganham o gráfico **Correções por dev**, com os últimos 30 dias do escopo deles (os times do KP,
  os setores do gerente): por corretor, as tentativas corrigidas, as que falharam de novo e a média de dias até
  corrigir. Como os outros gráficos, ele tem um resumo em texto e o estado vazio.

## Critérios de aceite

- **CA-01:** Dado o caso Clock_000007 em Done, de Caio, sem Dev Fix, quando a importação do SDF traz FAIL no
  SM-F966B, então o caso vai para In Fixes, abre a tentativa 1 como regressão e aparece na My Fixes de Caio.
- **CA-02:** Dado Clock_000009 em Done, com Dev Fix Ana e já na tentativa 1 fechada como Corrigida, quando a
  importação do SDF traz FAIL, então o caso vai para In Fixes na tentativa 2, com o selo "2ª correção", na My Fixes de
  Ana.
- **CA-03 (falha):** Dado Clock_000007 em Done, quando chega um relatório com PASS, N/A ou Check, então o Status não
  muda e nenhuma tentativa abre.
- **CA-04 (falha):** Dado Clock_000007 em Done com PASS no SM-F966B em 12/11, quando é importado um relatório de 10/11
  com FAIL nesse device, então o caso continua Done.
- **CA-05 (falha):** Dado um caso Cancelled ou de projeto encerrado, quando chega uma falha, então o Status não muda e a
  falha só aparece no histórico de execuções.
- **CA-06:** Dado que a importação reabriu Clock_000007, quando o KP desfaz essa importação sem ninguém ter mexido no
  caso, então ele volta para Done e a tentativa aberta some.
- **CA-07:** Dado a tentativa 1 de Clock_000007 aberta pela falha de 10/11, quando o caso passa em todos os devices em
  14/11, então a tentativa fecha como Corrigida em 14/11, com 4 dias até corrigir.
- **CA-08:** Dado a tentativa 1 em In Validation, quando a importação traz falha de novo, então a tentativa 1 fecha
  como Falhou de novo e a tentativa 2 abre com o mesmo corretor.
- **CA-09:** Dado uma tentativa fechada com Ana como corretora, quando o KP troca o Dev Fix do caso para Bia, então a
  tentativa fechada continua com Ana.
- **CA-10:** Dado Ana com duas tentativas corrigidas e uma que falhou de novo, quando ela abre My Fixes e escolhe
  Concluídas, então vê as três linhas com resultado, datas e dias até corrigir.
- **CA-11 (falha):** Dado tentativas fechadas de Ana e de Bia no mesmo projeto, quando Bia abre Concluídas, então não
  vê as de Ana.
- **CA-12:** Dado o KP no projeto, quando abre Concluídas e filtra pela corretora Ana e pela semana atual, então só as
  tentativas de Ana fechadas nessa semana aparecem, e a exportação traz as mesmas linhas.
- **CA-13:** Dado o KP com correções de Ana e Bia nos últimos 30 dias, quando abre o Overview, então o gráfico
  Correções por dev mostra, para cada uma, as corrigidas, as que falharam de novo e a média de dias.
- **CA-14 (falha):** Dado nenhuma tentativa fechada nos últimos 30 dias no escopo, quando o gerente abre o Overview,
  então o gráfico mostra o estado vazio e os outros continuam na tela.
- **CA-15:** Dado um caso em In Fixes na tentativa 2 antes da publicação, quando a versão é publicada, então ele tem o
  registro da tentativa 2 aberta, e as tentativas anteriores não aparecem em Concluídas.

## Fora de escopo

- Reabrir só depois de N falhas seguidas, ou pedir confirmação do KP antes de reabrir (opções B e C da análise).
- Reconstruir tentativas fechadas antes da publicação.
- Uma página com as correções de todos os projetos juntos.
- Gráfico de correções no Overview do dev e do admin.
- Notificar o corretor quando um caso reabre (spec 046).

## Decisões

- Casos Done que já estão na SDF Failures na publicação não reabrem; só falhas novas reabrem (2026-11-13).
- A regressão vem só da importação do SDF: a rodada manual só inclui casos em In Validation (2026-11-13).
- A visão Concluídas da My Fixes faz o papel do histórico de correções para a gestão, sem página nova (2026-11-13).
