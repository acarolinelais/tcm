# 062. Esconder a prévia da planilha: Spec

- **Status:** Concluída
- **Data:** 2026-11-05
- **Evolui:** spec 016 (prévia da importação)

## Problema
Depois de ler a planilha, a prévia dos Test Cases ocupa boa parte da tela de importação. Quem já conferiu os
casos precisa rolar a página para chegar ao que vem depois, e não tem como tirar a prévia da frente.

## Objetivo
Quem importa a planilha pode esconder a prévia e mostrá-la de novo quando quiser, sem perder a leitura feita.

## Histórias de usuário
- Como **gerente ou KP**, quero esconder a prévia dos Test Cases depois de conferi-los para ter a tela
  de importação mais limpa.
- Como **gerente ou KP**, quero mostrar a prévia de novo para voltar a conferir os casos antes de importar.

## Regras de negócio
- RN-01: A prévia começa visível sempre que uma planilha é lida.
- RN-02: Esconder a prévia esconde só a tabela e a paginação. O título, o projeto (app e One UI) e a
  quantidade de Test Cases continuam à mostra.
- RN-03: O botão diz o que vai acontecer ("Hide preview" ou "Show preview") e informa se a prévia está
  aberta ou fechada para leitores de tela.
- RN-04: Mostrar de novo volta na mesma página e no mesmo tamanho de página de antes.
- RN-05: Esconder a prévia não muda nada na importação: os mesmos casos são importados.
- RN-06: Com a prévia escondida, a configuração do projeto sobe para logo abaixo do cabeçalho da prévia, sem espaço vazio entre os dois.

## Critérios de aceite
- **CA-01:** Dado uma planilha válida lida, quando a prévia aparece, então a tabela está visível e o botão
  diz "Hide preview".
- **CA-02:** Dado a prévia visível, quando clico em "Hide preview", então a tabela e a paginação somem, o
  título, o projeto e a quantidade continuam e o botão passa a dizer "Show preview".
- **CA-03:** Dado a prévia escondida na página 3 com 50 por página, quando clico em "Show preview", então a
  tabela volta na página 3 com 50 por página.
- **CA-04:** Dado a prévia escondida, quando leio outra planilha, então a prévia da nova planilha começa
  visível.
- **CA-05:** Dado a prévia escondida, quando importo, então todos os casos da planilha são importados.
- **CA-06 (falha):** Dado uma planilha com problemas, quando a leitura termina, então não há prévia nem
  botão de esconder; só os problemas aparecem, como hoje.

## Fora de escopo
- Lembrar a escolha entre sessões ou entre uma planilha e outra.
- Esconder a lista de problemas de uma planilha inválida.
- Animação de abrir e fechar.

## Dúvidas em aberto
- Nenhuma.
