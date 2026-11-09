# 027. Automation Level do Test Case: Spec

- **Status:** Concluída
- **Data:** 2026-10-27

## Problema

A planilha de importação de Test Cases ganhou colunas novas, entre elas o **Automation Level**: um nível de 1
a 3 que diz o quanto o caso pode ser automatizado. Hoje o sistema não conhece essa informação. Ela se perde
na importação, não aparece na tabela de Test Cases e ninguém consegue registrá-la ou corrigi-la depois. A
gestão e os responsáveis precisam enxergar e manter esse nível junto dos demais atributos do caso.

## Objetivo

O Automation Level passa a existir no Test Case: vem da planilha (opcional), aparece na tabela de Test Cases
logo depois de Category e pode ser editado na própria tabela por quem já edita Category. O modelo de planilha
para download passa a ter as colunas na ordem atual, e a importação reconhece as colunas pelo nome do
cabeçalho, não pela posição.

## Histórias de usuário

- Como **gestão do projeto**, quero importar a planilha com o Automation Level de cada caso para não digitá-lo
  um a um.
- Como **gestão do projeto ou responsável pelo caso**, quero ver e ajustar o Automation Level na tabela para
  mantê-lo correto ao longo do projeto.
- Como **quem monta a planilha**, quero baixar um modelo com as colunas na ordem atual e poder reordenar
  colunas sem quebrar a importação.

## Regras de negócio

- RN-01: O Automation Level é **1**, **2** ou **3**, ou **vazio** (ainda não definido). Nenhum outro valor é
  aceito, em nenhuma entrada (planilha, tela ou API).
- RN-02: Significado dos níveis, como a tela os mostra: **1 – Não automatizável**, **2 – Automatizável até
  certo ponto**, **3 – 100% automatizável**. O sistema guarda só o número; o rótulo existe apenas na tela.
- RN-03: O campo é **opcional**. Test Cases que já existem ficam com o campo vazio.
- RN-04: O modelo de planilha tem as colunas, nesta ordem: App, TC ID, Title(English), Test
  Precondition(English), Test Procedure(English), Expected Result(English), Difficulty, Category, Automation
  Level, TC Situation, One UI, Assignees, Backup.
- RN-05: A importação encontra cada coluna pelo **nome do cabeçalho** (sem diferenciar maiúsculas de
  minúsculas), qualquer que seja a posição. Colunas que o sistema não usa são ignoradas.
- RN-06: A coluna Automation Level pode faltar na planilha: os casos entram com o campo vazio. As colunas
  obrigatórias de antes continuam obrigatórias.
- RN-07: Na planilha, o Excel pode entregar o número como texto ou com casa decimal (`1`, `1.0`, `"2"`).
  Todos valem como o número inteiro correspondente. `1.5`, `0`, `4`, `-1` e texto livre são inválidos.
- RN-08: Célula vazia na coluna Automation Level importa o campo como vazio, sem erro.
- RN-09: Valor inválido na planilha gera erro que indica a **linha** e a **coluna**, como nos demais valores
  inválidos. A linha não é descartada em silêncio e, como nos outros erros, nada é importado enquanto a
  planilha tiver erro.
- RN-10: Quem pode editar o Automation Level é quem pode editar a Category do mesmo caso: a gestão do time em
  qualquer caso do projeto e o responsável nos casos atribuídos a ele. O backup continua só podendo cancelar.
- RN-11: A coluna aparece para todos os perfis que veem a tabela de Test Cases do projeto. **Não** aparece nas
  tabelas de Form Factor.
- RN-12: O filtro por Automation Level segue o de Category: seleção múltipla pelos níveis.
- RN-13: Como Category, Difficulty e TC Situation, o campo, depois de definido, **não pode ser esvaziado** pela
  tela: a lista da célula só oferece os níveis 1, 2 e 3. Um caso sem nível continua assim até alguém escolher
  um.
- RN-14: O formulário de novo Test Case tem o campo Automation Level, opcional.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01:** Dado o download do modelo de planilha, quando o arquivo é aberto, então a primeira linha tem
  exatamente as 13 colunas da RN-04, nessa ordem e com esses nomes.
- **CA-02:** Dado uma planilha com a coluna Automation Level preenchida com 1, 2 e 3, quando a gestão
  importa, então cada Test Case é criado com o nível da sua linha.
- **CA-03:** Dado uma planilha com as colunas em ordem diferente da do modelo, quando a gestão importa, então
  cada valor vai para o campo certo.
- **CA-04:** Dado uma planilha sem a coluna Automation Level, quando a gestão importa, então os casos são
  criados com o campo vazio e nenhum erro é apontado.
- **CA-05:** Dado uma célula de Automation Level vazia, quando a gestão importa, então aquele caso fica com o
  campo vazio e os outros mantêm o seu valor.
- **CA-06:** Dado células com `1.0`, `2.0` ou o texto `"3"`, quando a gestão importa, então os casos ficam
  com 1, 2 e 3.
- **CA-07 (falha):** Dado uma célula com `4`, `0`, `1.5` ou `abc` na linha 7, quando a gestão importa, então
  nenhum caso é criado e o erro informa a linha 7, a coluna Automation Level, o valor encontrado e os valores
  aceitos (1, 2, 3).
- **CA-08 (falha):** Dado uma planilha com valor inválido de Automation Level e outro erro em outra linha,
  quando a gestão importa, então os dois erros são apresentados juntos.
- **CA-09:** Dado uma planilha válida com Title, Precondition, Procedure e Expected Result preenchidos, quando
  a gestão importa, então a importação conclui e essas colunas não causam erro.
- **CA-10:** Dado a tabela de Test Cases de um projeto, quando qualquer perfil a abre, então a coluna
  Automation Level aparece imediatamente depois de Category, mostrando o rótulo do nível (RN-02) ou um traço
  quando está vazio.
- **CA-11:** Dado as tabelas de Form Factor, quando são abertas, então não têm a coluna Automation Level.
- **CA-12:** Dado um Test Case que o usuário pode editar, quando ele escolhe um nível na célula, então o
  valor é salvo, a tabela mostra o novo rótulo e o mesmo vale depois de recarregar a página.
- **CA-13:** Dado a célula editável de Automation Level, quando o usuário abre a lista de opções, então ela
  tem só os níveis 1, 2 e 3, sem opção para esvaziar o campo.
- **CA-14 (falha):** Dado um responsável, quando ele tenta alterar o Automation Level de um caso atribuído a
  outra pessoa, então a alteração é recusada e o valor não muda.
- **CA-15 (falha):** Dado qualquer pedido de alteração com nível diferente de 1, 2 ou 3, quando o sistema o
  recebe, então recusa com mensagem de valor inválido e o caso não muda.
- **CA-19:** Dado o formulário de novo Test Case, quando a gestão o salva com ou sem Automation Level, então o
  caso é criado com o nível escolhido ou com o campo vazio.
- **CA-20 (falha):** Dado o formulário de novo Test Case, quando chega um nível diferente de 1, 2 ou 3, então
  a criação é recusada com mensagem de valor inválido.
- **CA-16:** Dado Test Cases criados antes desta mudança, quando a tabela é aberta, então eles aparecem com
  o traço no Automation Level.
- **CA-17:** Dado a tabela de Test Cases, quando o usuário filtra por Automation Level 1 e 3, então só
  aparecem os casos desses níveis.
- **CA-18:** Dado a prévia da planilha antes da importação, quando ela é exibida, então mostra o Automation
  Level de cada caso lido.

## Fora de escopo

- Guardar Title, Test Precondition, Test Procedure e Expected Result: entram no modelo de planilha e são
  ignorados na importação.
- Ordenação por coluna e exportação de Test Cases para planilha: a tabela não tem nenhuma das duas hoje.
- Automation Level nas tabelas de Form Factor e nos resultados gerais.
- Regras de negócio que dependam do nível (alertas, relatórios, metas de automação).
- Preencher o nível retroativamente nos casos existentes.

## Dúvidas em aberto

Nenhuma. Decisões da revisão de 2026-10-27: o campo não pode ser esvaziado pela tela (RN-13); a edição segue
a regra da Category (RN-10); o formulário de criação ganha o campo opcional (RN-14).
