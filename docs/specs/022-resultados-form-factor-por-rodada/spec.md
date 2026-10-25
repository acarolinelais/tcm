# 022. Resultados Form Factor por rodada: Spec

- **Status:** Em andamento
- **Data:** 2026-10-25

## Problema

Hoje não há um fluxo direto para registrar em lote os resultados de Form Factor dos Test Cases que
chegaram a `In Validation`, identificando a rodada com o SDF ID. Quando os casos passam por outra
rodada de validação, é necessário manter os resultados e IDs anteriores para consultar a evolução.

## Objetivo

Em Form Factor, listar os Test Cases com Status `In Validation` e permitir registrar os resultados
deles por rodada, vinculando cada rodada a um SDF ID informado pelo usuário. Preservar as rodadas
anteriores para consulta, mesmo quando uma nova rodada é registrada para o mesmo TC.

## Histórias de usuário

- Como **pessoa autorizada a registrar resultados**, quero informar o SDF ID de uma rodada e lançar
  os resultados dos TCs elegíveis por modelo para manter o histórico da validação.
- Como **DEV responsável por um TC**, quero lançar resultados somente para os TCs atribuídos a mim
  em uma rodada criada pela gestão e disponibilizada em Form Factor.
- Como **membro do projeto**, quero consultar as rodadas anteriores de um TC e seus SDF IDs para
  comparar resultados ao longo do tempo.

## Regras de negócio

- RN-01: Form Factor exibe como elegíveis os Test Cases do projeto cujo Status atual é
  `In Validation`, para que estejam prontos para uma rodada. Ao criar uma rodada, o sistema captura
  todos os elegíveis naquele momento. TCs em outros Status não entram; a rodada guarda sua seleção,
  ainda que o Status do TC mude depois.
- RN-02: Administrador da unidade, gerente ou KP autorizado no escopo do projeto pode iniciar uma
  rodada e informar seu SDF ID em campo de texto livre. O SDF ID é opcional; quando informado, aceita
  espaços e caracteres especiais e tem no máximo 50 caracteres. O SDF ID fica associado aos
  resultados registrados naquela rodada.
- RN-03: Administrador da unidade, gerente ou KP autorizado no escopo pode informar resultados para
  qualquer TC da rodada. Um DEV pode informar resultados somente para TCs da rodada em que seja
  responsável principal ou Backup. O DEV não pode criar a rodada nem alterar seu SDF ID.
- RN-04: Os resultados são informados para modelos associados ao projeto. Valem as opções de
  resultado manual já definidas na spec 020. Não é obrigatório informar resultado para todos os
  modelos. Um lançamento não altera o Status nem os demais dados de gerenciamento do TC.
- RN-05: Criar uma rodada registra o SDF ID e seus TCs no histórico antes da entrada dos resultados.
  Os resultados de cada TC são salvos juntos para os modelos preenchidos; os campos de modelo vazios
  permanecem sem resultado. Essa entrada por TC permite que os DEV responsáveis preencham seus casos
  depois que a gestão cria a rodada. Nenhum resultado de outra rodada é substituído ou apagado.
- RN-06: O histórico apresenta os resultados por TC, modelo, rodada e SDF ID. Um TC que participou de
  mais de uma rodada conserva os IDs de cada uma delas. Os resultados históricos continuam
  consultáveis quando o Status atual do TC deixa de ser `In Validation`.
- RN-07: A capacidade de criar rodada e definir seu SDF ID pertence ao administrador da unidade,
  gerente ou KP autorizado no escopo do projeto. A capacidade de registrar resultados pertence a esses
  mesmos perfis e ao DEV responsável principal ou Backup do TC na rodada. A importação de relatório
  por planilha é restrita a administrador da unidade, gerente e KP autorizados no escopo. Perfis
  personalizados e DEV não podem importar relatórios SDF por planilha, mesmo que tenham permissão de
  registrar resultados manuais. O acesso é validado no servidor por perfil, permissão, escopo e
  atribuição do TC.
- RN-08: Não há limite de quantidade de TCs em uma rodada. A lista inclui todos os TCs do projeto que
  estão em `In Validation` no momento de iniciar a rodada.
- RN-09: O fluxo de Status do TC é `To-Do` → `InProgress` → `InValidation`. O responsável principal
  pode avançar o Status durante o trabalho e, após corrigir um TC em `InReview`, pode colocá-lo
  novamente em `InValidation`, tornando-o elegível para uma rodada futura. Esta spec acrescenta os
  Status `Done` e `Cancelled` ao catálogo de Status de TC. `PASS` e `FAIL` são resultados por modelo,
  não Status do TC: `FAIL` leva a `InReview`, e aprovação leva a `Done` conforme a regra de conclusão.
- RN-10: Ao salvar resultados de um TC na rodada, se algum modelo tiver resultado `FAIL`, o sistema
  altera o Status do TC para `InReview`. O Status passa para `Done` somente quando todos os modelos
  associados ao projeto tiverem resultado `PASS` na rodada. Se ainda houver modelo sem resultado e
  nenhum `FAIL`, o TC permanece em `InValidation`. A mudança de Status e os resultados do TC são
  salvos juntos.
- RN-11: Um DEV pode alterar diretamente para `Cancelled` o Status dos TCs atribuídos a ele. Admin da
  unidade, gerente e KP autorizados no escopo também podem cancelar diretamente qualquer TC do
  projeto. O cancelamento não apaga o TC, seus resultados ou seu histórico de rodadas.

## Critérios de aceite

> Use o formato Dado / Quando / Então. Inclua cenários de **falha**.

- **CA-01:** Dado um projeto com 500 TCs, 250 em `In Validation` e os outros em `To-Do`, `In Progress`,
  `In Review` ou outro Status, quando alguém consulta Form Factor, então os 250 em `In Validation`
  aparecem como elegíveis; quando a gestão cria a rodada, somente esses 250 são capturados nela.
- **CA-02:** Dado um administrador, gerente ou KP com permissão e escopo sobre o projeto, quando inicia
  uma rodada com TCs em `In Validation`, então pode informar ou deixar vazio o SDF ID.
- **CA-03:** Dado um administrador, gerente ou KP autorizado no escopo, quando informa resultados da
  rodada, então pode fazê-lo para qualquer TC nela; dado um DEV, quando informa resultados, então só
  pode fazê-lo para TCs da rodada em que seja responsável principal ou Backup.
- **CA-04:** Dado que a gestão criou uma rodada com seu SDF ID opcional, quando um usuário autorizado
  informa resultados para um TC nela, então os resultados dos modelos preenchidos são salvos juntos,
  os outros modelos ficam vazios e todos os TCs da rodada continuam no histórico com o SDF ID da rodada.
- **CA-05:** Dado que 250 TCs participaram de uma primeira rodada e depois os 500 TCs estão em
  `In Validation`, quando o usuário registra uma segunda rodada, então os resultados dos 500 são
  acrescentados e, para os 250 da primeira rodada, o histórico mantém os dois SDF IDs e os resultados
  de ambas as rodadas.
- **CA-06:** Dado um TC com resultados em mais de uma rodada ou cujo Status atual já não seja
  `In Validation`, quando um usuário consulta o histórico, então consegue distinguir os resultados e
  o SDF ID de cada rodada sem perda dos dados anteriores.
- **CA-07:** Dado um projeto com mais TCs em `In Validation` do que uma página comporta, quando a
  gestão cria uma rodada, então todos esses TCs são incluídos, sem limite fixo de quantidade por rodada.
- **CA-08 (falha):** Dado um SDF ID com mais de 50 caracteres, quando a gestão tenta salvar a rodada,
  então a entrada é recusada e nenhum resultado é gravado.
- **CA-09 (falha):** Dado um DEV, quando tenta criar uma rodada, alterar o SDF ID ou lançar resultado
  para um TC em que não seja responsável principal nem Backup, então a operação é recusada e nenhum
  dado não autorizado é alterado.
- **CA-10 (falha):** Dado um usuário sem permissão ou fora do escopo do projeto, quando tenta iniciar
  uma rodada, importar uma planilha ou lançar resultado, então a operação é recusada e nenhum dado é
  gravado.
- **CA-11 (falha):** Dado um resultado inválido ou uma referência a modelo não associado ao projeto,
  quando o usuário registra resultados para um TC, então os dados inválidos são recusados e resultados
  anteriores permanecem intactos.
- **CA-12 (falha):** Dado um DEV ou usuário de perfil personalizado, quando tenta importar um relatório
  SDF por planilha, então a API recusa a operação e nenhum resultado é gravado.
- **CA-13:** Dado um TC novo, quando o DEV inicia o trabalho e o conclui para validação, então o Status
  segue `To-Do` → `InProgress` → `InValidation` e o caso aparece entre os elegíveis do Form Factor.
- **CA-14:** Dado um TC em uma rodada, quando algum modelo recebe `FAIL`, então o resultado é salvo e
  o Status muda para `InReview`; depois da correção, o DEV pode mudar o Status para `InValidation` e
  o TC fica elegível para uma nova rodada, sem perder os resultados anteriores.
- **CA-15:** Dado um TC com `PASS` em todos os modelos associados ao projeto na rodada, quando os
  resultados são salvos, então o Status muda para `Done` junto com o salvamento dos resultados.
- **CA-16:** Dado um TC com resultados `PASS` em apenas parte dos modelos e sem nenhum `FAIL`, quando
  os resultados são salvos, então os campos restantes continuam vazios e o Status permanece
  `InValidation`.
- **CA-17:** Dado um TC que precisa ser cancelado, quando o DEV atribuído ou uma pessoa de gestão
  autorizada no escopo muda seu Status para `Cancelled`, então o Status é salvo e o histórico do TC
  permanece consultável.
- **CA-18 (falha):** Dado um DEV sem atribuição ao TC, quando tenta mudar seu Status para `Cancelled`,
  então a operação é recusada e o Status permanece inalterado.

## Fora de escopo

- Alterar Status, Assignee, Backup ou outros dados de gerenciamento dos Test Cases ao registrar
  resultados.
- Editar ou excluir resultados de rodadas já salvas.
- Definir métricas agregadas ou percentuais de aprovação.

## Dúvidas em aberto

- Nenhuma dúvida bloqueante conhecida nesta fase.
