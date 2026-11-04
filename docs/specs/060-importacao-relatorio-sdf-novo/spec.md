# 060. Importação do relatório SDF no formato novo: Spec

- **Status:** Em andamento
- **Data:** 2026-11-04
- **Specs relacionadas:** 021 (importação do relatório SDF), 025 (SDF ID único), 059 (redesign da General
  Results, que leva o botão de importar para essa tela)
- **Exemplo real:** [`123456-789012_0_Test_1_Detail.xlsx`](123456-789012_0_Test_1_Detail.xlsx)

> Separada da 059 em 2026-11-04 para o redesign sair primeiro (a 059 entrou na `dev` no PR #71).

## Problema

O SDF mudou o formato do relatório que exporta. Hoje o sistema espera uma tabela com TC ID, SDF ID, data, One UI
e uma coluna por modelo. O relatório novo traz um device por arquivo, o SDF ID no nome do arquivo e a data no
cabeçalho, e o sistema não consegue importá-lo. Quem gerencia teria que montar a planilha antiga à mão.

## Objetivo

Quem gerencia importa o arquivo do jeito que o SDF exporta, e os resultados aparecem com o SDF ID, a data, o
device e a descrição de cada caso.

## Histórias de usuário

- Como **gerente** ou **KP**, quero importar o relatório do jeito que o SDF exporta, sem montar uma planilha à mão.
- Como **qualquer perfil**, quero ver a descrição que o SDF deu para um resultado.

## Regras de negócio

- RN-01: O relatório aceito é o formato novo que o SDF exporta. O formato antigo (uma tabela com TC ID, SDF ID,
  data, One UI e uma coluna por modelo) deixa de ser aceito.
- RN-02: O **SDF ID** é o trecho do nome do arquivo antes do primeiro "_" (`123456-789012_0_Test_1_Detail.xlsx`
  dá `123456-789012`). Ele vale para todos os resultados do arquivo e aparece onde o SDF ID já aparece hoje (a
  coluna SDF ID e o histórico). Segue o limite de tamanho do SDF ID que já existe.
- RN-03: Um SDF ID já usado no projeto, por uma rodada ou por outra importação, recusa o arquivo inteiro. A
  comparação ignora maiúsculas, minúsculas e espaços nas pontas, como na spec 025.
- RN-04: O **device** é a célula C4 (ex.: `SM-S948B`). Ele é comparado com o nome dos modelos associados ao
  projeto, ignorando maiúsculas, minúsculas e espaços nas pontas, como a importação já faz hoje. Um device que
  não está associado ao projeto recusa o arquivo inteiro.
- RN-05: A **data da execução** é a célula F4 (Start Time), no formato mês/dia/ano com hora de 12 horas
  (`10/21/2026 6:43:35 PM`). A célula pode vir com espaços a mais e uma quebra de linha entre a data e a hora, e
  o sistema aceita assim mesmo. Essa data é a que vira coluna na General Results. As datas de cada linha (colunas
  F e G) não são usadas.
- RN-06: Os **resultados** ficam na tabela cujo cabeçalho está na linha 7, da linha 8 até a última linha
  preenchida. Linhas totalmente vazias no meio são ignoradas. Os cabeçalhos podem ter espaços a mais
  (" State", "Script Index ").
- RN-07: Em cada linha, o **TC ID** é a coluna C (Script Name) sem a extensão `.py`: `Keyboard_000001.py` vira
  `Keyboard_000001`. O **resultado** é a coluna D (State), gravado do jeito que veio, com qualquer valor (PASS,
  FAIL, check, N/A ou outro). A **descrição** é a coluna E (Description), sem os espaços e tabs das pontas, e
  pode vir vazia.
- RN-08: O **One UI** sai da coluna I (Test File Path), dos dígitos depois de "OneUI", que vêm sempre sem ponto.
  A versão principal tem dois dígitos quando começa com 1 (da One UI 10 em diante) e um dígito nos outros casos;
  o que sobra é a versão menor: `OneUI95` dá `9.5`, `OneUI10` dá `10` e `OneUI105` dá `10.5`. Como já acontece
  hoje, o One UI de toda linha precisa ser o do projeto, senão o arquivo inteiro é recusado. A comparação é pelo
  número da versão: `10` e `10.0` são a mesma.
- RN-09: As linhas dos scripts de preparação `HQ_precondition.py` e `Setup.py` são ignoradas em qualquer
  posição da tabela, sem virar resultado. Um arquivo que só tem essas linhas é recusado por não ter resultados.
- RN-10: Clicar num resultado abre a janela de detalhe de hoje (spec 032, RN-09). Quando o resultado tem
  descrição, a janela também a mostra.
- RN-11: Na General Results, a importação atualiza a tabela sem recarregar a página: os resultados entram na
  coluna da data da execução (F4), no device do relatório, e a coluna SDF ID desse device passa a mostrar o SDF ID
  do arquivo. Vale a regra que a tabela já tem: a coluna SDF ID mostra a execução mais recente pela data da
  execução, e a tabela mostra as 5 datas mais recentes (spec 059). Um relatório com data mais antiga que as
  execuções do device entra no histórico, mas não muda a coluna SDF ID nem aparece entre as 5 datas.
- RN-12: Qualquer erro recusa o arquivo inteiro, e nada é gravado. Todos os problemas são achados de uma vez;
  o aviso mostra os 5 primeiros, com a linha ou a célula de cada um, e a quantidade dos outros, e fica aberto
  até a pessoa fechar. Os textos:
  - nome do arquivo sem SDF ID: "O nome do arquivo precisa começar pelo SDF ID seguido de "_" (ex.:
    123456-789012_0_Test_1_Detail.xlsx).";
  - F4 sem data válida: "A célula F4 (Start Time) não tem uma data válida. Use mês/dia/ano e hora, como
    10/21/2026 6:43:35 PM.";
  - Test File Path sem versão: "Linha N: o Test File Path precisa ter "OneUI" seguido da versão (ex.:
    Keyboard_A_OneUI95.ts).";
  - TC ID que não é do projeto: "Linha N: o TC ID 'X' não pertence ao projeto.";
  - linha sem Script Name ou sem State: "Linha N: Script Name e State são obrigatórios.";
  - device, One UI e SDF ID repetido: as mensagens que a importação já mostra hoje para esses casos.
- RN-13: Quem pode importar não muda: admin, gerente e KP com a permissão de importar relatório SDF, só nos
  projetos do seu escopo.

## Critérios de aceite

- **CA-01:** Dado o projeto Keyboard com One UI 9.5 e o modelo `SM-S948B` associado, quando um gerente importa o
  arquivo de exemplo, então o projeto ganha os resultados de `Keyboard_000001` a `Keyboard_000009` no device
  `SM-S948B`, com SDF ID `123456-789012`, na data 21/10/2026, e cada resultado tem a descrição da coluna E.
- **CA-02:** Dado o arquivo de exemplo importado, quando a pessoa clica num resultado na coluna 21/10, então a
  janela mostra o SDF ID `123456-789012` e a descrição "# PASS: Test case was executed successfully", sem o tab
  do fim.
- **CA-03:** Dado a General Results aberta no projeto Keyboard, quando um gerente importa o arquivo de exemplo,
  então, sem recarregar a página, a tabela mostra a coluna 21/10 com os resultados dos nove casos no device
  `SM-S948B`, a coluna SDF ID desse device mostra `123456-789012`, e clicar num resultado mostra a descrição.
- **CA-04:** Dado um device com uma execução de 25/10, quando é importado um relatório desse device com data de
  21/10, então o histórico do caso ganha a execução de 21/10 e a coluna SDF ID continua com o SDF ID da de 25/10.
- **CA-05:** Dado o arquivo de exemplo, quando é importado, então nenhum resultado é gravado para
  `HQ_precondition.py`. Dado um arquivo com `Setup.py` no meio da tabela, então essa linha também é ignorada.
- **CA-06:** Dado uma linha com State `check` ou `N/A`, quando o arquivo é importado, então o resultado é gravado
  com esse valor.
- **CA-07:** Dado F4 com espaços a mais e uma quebra de linha entre a data e a hora, quando o arquivo é importado,
  então a data é lida como 21/10/2026, 18:43:35.
- **CA-08 (falha):** Dado uma planilha no formato antigo, quando é importada, então é recusada e nada é gravado.
- **CA-09 (falha):** Dado um arquivo chamado `Detail.xlsx` ou `_0_Test_1_Detail.xlsx`, quando é importado, então é
  recusado com a mensagem de nome sem SDF ID.
- **CA-10 (falha):** Dado um arquivo cujo SDF ID já foi usado no projeto, por uma rodada ou por uma importação
  anterior (inclusive escrito com outras maiúsculas), quando é importado, então é recusado e nada é gravado.
- **CA-11 (falha):** Dado C4 com um device que não está associado ao projeto, quando o arquivo é importado, então
  é recusado com a mensagem de modelo não associado.
- **CA-12 (falha):** Dado F4 vazia ou com um texto que não é data, quando o arquivo é importado, então é recusado
  com a mensagem da célula F4.
- **CA-13 (falha):** Dado uma linha com Test File Path sem "OneUI" seguido de dígitos, quando o arquivo é
  importado, então é recusado com a mensagem do Test File Path, citando a linha.
- **CA-14 (falha):** Dado um Test File Path com `OneUI80` num projeto com One UI 9.5, quando o arquivo é
  importado, então é recusado com a mensagem de One UI diferente da do projeto.
- **CA-15:** Dado um projeto com One UI `10.0`, quando um arquivo com Test File Path `Clock_A_OneUI10.ts` é
  importado, então o One UI é lido como `10` e o arquivo é aceito; com `OneUI105` num projeto `10.5`, também.
- **CA-16 (falha):** Dado uma linha com um TC ID que não existe no projeto, quando o arquivo é importado, então o
  arquivo inteiro é recusado com a mensagem citando a linha e o TC ID, e nenhum resultado das outras linhas é
  gravado.
- **CA-17 (falha):** Dado um arquivo com só `HQ_precondition.py` e `Setup.py` na tabela, quando é importado, então
  é recusado por não ter resultados.
- **CA-18 (falha):** Dado um arquivo com dois problemas (F4 inválida e um TC ID desconhecido), quando é
  importado, então a mensagem mostra os dois de uma vez.

## Fora de escopo

- Ler o título (C2), o número de série (D4), o Agent Info (E4), o End Time (G4), o State geral (H4), as datas de
  cada linha (colunas F e G) e a Result Folder (H).
- Importar vários arquivos de uma vez.
- Cadastrar o código do device num campo novo do modelo: o nome do modelo já guarda esse código.
- Mudar onde fica o botão de importar (spec 059) ou quem pode importar.

## Dúvidas em aberto

- Nenhuma. Decidido em 2026-11-04:
  - só o formato novo é aceito (RN-01);
  - um SDF ID já usado no projeto, por rodada ou importação, recusa o arquivo (RN-03); hoje a importação não confere isso;
  - o device do C4 é comparado com o nome do modelo, que já guarda o código (`SM-S948B`), sem campo novo (RN-04);
  - o TC ID perde a extensão `.py` antes de comparar; nenhum TC do sistema tem a extensão (RN-07);
  - o número da One UI vem sempre sem ponto (`OneUI95`, `OneUI10`, `OneUI105`) e é comparado pelo número da versão (RN-08);
  - um TC ID fora do projeto recusa o arquivo inteiro, com todas as linhas com problema na mensagem (RN-12);
  - o título do C2 não é usado (fora de escopo).
