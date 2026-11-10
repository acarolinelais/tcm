# 072. SDF Failures: Spec

- **Status:** Concluída
- **Data:** 2026-11-10
- **Specs relacionadas:** 070 (Bug Reports, substituída em parte), 066 (Status pela importação do SDF, alterada nas
  RN-02, RN-03 e RN-07), 065 (End date, alterada na condição de "todos passaram"), 060 (relatório SDF com
  Description), 059 (linha que expande por device na General Results), 073 (aba My Fixes, usa o Dev Fix desta spec)

## Problema

Vamos ter duas sprints seguidas. Na de automação, o relatório do SDF é importado todos os dias. Na de manutenção, o
KP distribui as correções do que falhou. A página Bug Reports (spec 070) não serve a esse fluxo:

- a falha some quando chega um PASS depois, então o KP perde o registro do que falhou durante a automação;
- só FAIL conta, mas o SDF também devolve EXCEPTION e None, que são falhas;
- N/A e Check não fecham o caso em Done, embora não sejam falha;
- o KP distribui a correção trocando o responsável do caso, e perde quem é o dono dele.

## Objetivo

A página passa a se chamar **SDF Failures** e guarda toda falha do SDF até a correção terminar. O KP escolhe um
**Dev Fix** para cada caso sem mexer no responsável. O sistema não sabe o que é uma sprint: as regras valem o tempo
todo.

## Histórias de usuário

- Como **KP** ou **gerente**, quero ver todas as falhas do SDF de um projeto, mesmo as que já passaram depois, para
  saber o que precisa de correção na manutenção.
- Como **KP**, quero escolher quem corrige cada caso sem trocar o dono dele, para distribuir o trabalho.
- Como **dev**, quero ver as falhas dos casos que devo corrigir, com o log do SDF, para começar a correção.

## Regras de negócio

**Falha**
- RN-01: Não são falha os resultados PASS, N/A, NA e Check. Todo outro resultado é falha (FAIL, EXCEPTION, None e
  qualquer outro). A comparação ignora maiúsculas, minúsculas e espaços nas pontas.
- RN-02: "Todos passaram" passa a ser: cada device associado ao projeto tem resultado, e o mais recente de cada um
  não é falha. Vale para o caso em In Validation ir para Done (spec 066, RN-02) e para a End date (spec 065).
- RN-03: Na importação do SDF, um caso em In Validation com falha no relatório vai para In Fixes. Substitui a RN-03
  da spec 066, que só olhava FAIL. A RN-07 da spec 066 deixa de valer para N/A e Check, que agora contam pela RN-02.
- RN-04: As RN-02 e RN-03 valem a partir da importação seguinte. Status e End date já gravados não são
  recalculados.

**Página SDF Failures**
- RN-05: A página Bug Reports passa a se chamar SDF Failures no menu e no título.
- RN-06: Toda falha do SDF entra na página, seja qual for o Status do caso, exceto em casos Excluded ou Cancelled e
  em projetos encerrados (spec 069). A página mostra só falhas; todas as execuções continuam na General Results.
- RN-07: Uma falha não sai da página quando chega um resultado que não é falha, nem muda por isso.
- RN-08: As falhas de um caso saem da página todas juntas quando o caso entra em In Validation depois de ter Dev
  Fix e a importação do SDF o fecha em Done (RN-02). Um caso que fecha em Done sem ter passado por isso continua
  com as falhas na página, mesmo se já estava em In Validation quando o Dev Fix foi escolhido.
- RN-09: O usuário escolhe o projeto num seletor no topo, como no Board, na Timeline e em Projects, e vê só as
  falhas dele. O filtro Day or Week limita as falhas pela data da execução.
- RN-10: Uma linha por Test Case, com as colunas TC ID, Form Factor (o device), SDF ID, Run Date, Status,
  Description, Dev Fix e Dev Owner. A linha mostra a falha mais recente do caso.
- RN-11: Um caso com mais de uma falha abre para mostrar cada falha numa sublinha, como a linha que expande na
  General Results. Falhas repetidas no mesmo device são sublinhas separadas; a Run Date diferencia uma da outra.
- RN-12: A Description é o texto do relatório SDF gravado na importação. A célula tem um botão que abre o texto
  inteiro, como a coluna Notes da tabela de Test Cases. Sem Description, a célula mostra "—".
- RN-13: Dev Owner é o identificador do responsável pelo caso, só para leitura.
- RN-14: A tabela segue as regras de tabela do projeto: 20 casos por página, filtros por Form Factor, Dev Fix e Dev
  Owner, estados de carregando, vazio e erro, e ordem pela falha mais recente, da mais nova para a mais antiga.
- RN-15: A gestão (admin da unidade, gerente e KP) vê as falhas do seu escopo. O dev vê as falhas dos casos em que é
  o responsável, o backup ou o Dev Fix.
- RN-16: O TC ID abre o painel de detalhes do caso, como hoje.

**Dev Fix**
- RN-17: Quem pode trocar o responsável de um caso (a gestão do time do projeto) escolhe, troca ou remove o Dev Fix
  pela linha. O escolhido precisa ser membro ativo do time. Pode ser o próprio responsável do caso.
- RN-18: Escolher o Dev Fix não muda o Status nem o responsável do caso. O Dev Fix vale para o caso inteiro, em
  todas as sublinhas.
- RN-19: O dev não escolhe Dev Fix. O KP não troca mais o responsável pela página (substitui as RN-08 e RN-09 da
  spec 070); a troca continua pela edição do caso.

## Critérios de aceite

- **CA-01:** Dado Clock_000002 em To-Do com FAIL no SM-S948B em 03/11, quando o KP abre SDF Failures no projeto
  Clock, então vê Clock_000002 com SM-S948B, o SDF ID, 03/11, To-Do, a Description, Dev Fix vazio e o Dev Owner.
- **CA-02:** Dado Clock_000003 com FAIL no SM-S948B em 03/11 e PASS no mesmo device em 04/11, sem Dev Fix, quando
  o KP abre a página, então Clock_000003 continua com a falha de 03/11.
- **CA-03:** Dado Clock_000004 com EXCEPTION num device e None em outro, quando o KP abre a página, então o caso
  aparece com as duas falhas.
- **CA-04 (falha):** Dado Clock_000005 só com resultados N/A, NA, Check e PASS, quando o KP abre a página, então
  Clock_000005 não aparece.
- **CA-05:** Dado Clock_000006 com FAIL no SM-S948B em 03/11, 04/11 e 05/11, quando o KP abre a linha, então vê
  três sublinhas, uma por Run Date, e a linha mostra a de 05/11.
- **CA-06:** Dado Clock_000007 em In Validation, quando o relatório importado traz EXCEPTION para ele, então o caso
  vai para In Fixes e a falha aparece em SDF Failures.
- **CA-07:** Dado Clock_000012 em In Validation com PASS no SM-S948B, quando o relatório do SM-1234 traz N/A (ou
  Check), então o caso vai para Done e ganha a End date.
- **CA-08:** Dado falhas em Clock e Keyboard, quando o KP escolhe Clock no seletor, então só as falhas de Clock
  aparecem.
- **CA-09:** Dado falhas em 03/11 e 06/11, quando o KP filtra o dia 06/11, então só os casos com falha nesse dia
  aparecem.
- **CA-10:** Dado uma Description longa, quando o KP clica no botão da célula, então vê o texto inteiro.
- **CA-11:** Dado Clock_000002 com responsável Ana, quando o KP escolhe Bia como Dev Fix, então a linha mostra Bia
  em Dev Fix, Ana em Dev Owner, e o Status não muda.
- **CA-12:** Dado Clock_000002 com responsável Ana, quando o KP escolhe Ana como Dev Fix, então a escolha é aceita.
- **CA-13 (falha):** Dado um dev que não é membro ativo do time, quando o KP tenta escolhê-lo como Dev Fix, então o
  sistema recusa com a mesma mensagem da troca de responsável.
- **CA-14 (falha):** Dado um dev, quando ele abre SDF Failures, então não tem a ação de escolher Dev Fix, e uma
  tentativa direta é recusada por falta de permissão.
- **CA-15:** Dado Clock_000002 com Dev Fix Bia, que depois entrou em In Validation, quando a importação traz PASS
  em todos os devices e fecha o caso em Done, então as falhas dele saem de SDF Failures.
- **CA-16 (falha):** Dado Clock_000009 sem Dev Fix, em In Validation, quando a importação fecha o caso em Done,
  então as falhas antigas dele continuam em SDF Failures.
- **CA-17 (falha):** Dado Clock_000013 já em In Validation quando o KP escolhe Bia como Dev Fix, quando a
  importação fecha o caso em Done, então as falhas continuam em SDF Failures.
- **CA-18:** Dado a dev Bia, responsável por Clock_000002 e Dev Fix de Clock_000010, sem relação com
  Clock_000011, quando ela abre SDF Failures, então vê Clock_000002 e Clock_000010, e não vê Clock_000011.
- **CA-19 (falha):** Dado um caso Excluded ou Cancelled com FAIL, ou um projeto encerrado com falhas, quando o KP
  abre a página, então essas falhas não aparecem.
- **CA-20:** Dado 25 casos com falha, quando o KP abre a página, então vê 20 e a paginação leva aos outros 5.

## Fora de escopo

- A aba My Fixes, onde o Dev Fix muda o Status do caso (spec 073).
- Sprint como conceito no sistema.
- Escolher o Dev Fix de vários casos de uma vez.
- Notificar o dev quando vira Dev Fix, além do que já existe.
- Recalcular Status e End date de resultados já gravados (RN-04).
- Mudanças na General Results.
- Tirar uma falha da página à mão.

## Decisões (2026-11-10)

- O nome da página é SDF Failures.
- N/A e Check fecham o caso em Done (RN-02).
- Caso Done com falha antiga e sem Dev Fix continua na página até passar por uma correção (RN-08).
