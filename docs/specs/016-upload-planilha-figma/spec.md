# 016. Upload da planilha no padrão do Figma: Spec

- **Status:** Concluída
- **Data:** 2026-10-25
- **ADRs relacionados:** 0009
- **Evolui:** spec 011 (RN-08, RN-21) · **Figma:** TCM, node `2145-172`

## Problema

Na criação do projeto por planilha, só o link "Escolher arquivo" abre o seletor de arquivos. Clicar no
resto da área tracejada não faz nada, o que contraria o que a área sugere. Ao escolher o arquivo, a área
de upload some, e a pessoa não vê o andamento enquanto a planilha é lida: só um texto "lendo" aparece.
Se quiser trocar de arquivo, precisa remover o atual primeiro.

## Objetivo

O upload da planilha segue o frame do Figma. A área inteira responde ao passar o mouse e ao clicar, e
aceita arrastar e soltar. Embaixo dela, um card mostra o modelo para download enquanto não há arquivo, e
o arquivo com uma barra de progresso da leitura depois que ele é escolhido.

## Histórias de usuário

- Como **gerente ou KP**, quero clicar em qualquer parte da área de upload, ou soltar a planilha nela,
  para escolher o arquivo sem precisar acertar um link pequeno.
- Como **gerente ou KP**, quero ver o progresso da leitura da planilha para saber que ela está sendo
  processada e quando a prévia vai aparecer.

## Regras de negócio

- RN-01: A área de upload inteira abre o seletor de arquivos ao ser clicada. Pelo teclado, ela recebe
  foco e abre o seletor com Enter ou Espaço.
- RN-02: Ao passar o mouse, ao receber o foco ou ao arrastar um arquivo sobre ela, a área muda de
  aparência: fundo azul-claro e borda tracejada azul, como no Figma.
- RN-03: Soltar um arquivo na área tem o mesmo efeito de escolhê-lo pelo seletor.
- RN-04: Abaixo da área ficam, como hoje, os formatos aceitos (XLS e XLSX) e o tamanho máximo (25 MB).
- RN-05: Sem arquivo escolhido, o card abaixo da área é o do modelo de planilha, com o botão para
  baixá-lo, como hoje.
- RN-06: Com um arquivo escolhido, o card do modelo dá lugar ao card do arquivo, que mostra o ícone da
  planilha, o nome, o tamanho, um botão para remover e uma barra de progresso com a porcentagem da
  leitura.
- RN-07: A barra vai de 0% a 100% conforme a planilha é lida no navegador. Ao chegar a 100%, a prévia
  ou os problemas da planilha aparecem embaixo, como hoje (spec 011, RN-21 e RN-22).
- RN-08: Enquanto o arquivo está sendo lido, a área de upload continua visível. Escolher ou soltar outro
  arquivo nesse período troca o atual e reinicia a leitura. Quando o processamento chega a 100%, a área
  de upload some; para escolher outro arquivo, a pessoa remove o atual e a área reaparece.
- RN-09: Remover o arquivo volta ao estado inicial: o card do modelo reaparece, e a prévia e os problemas
  somem.
- RN-10: Um arquivo com formato diferente de XLS ou XLSX, ou maior que 25 MB, é recusado como hoje, com o
  aviso correspondente. Ele não substitui o arquivo atual nem inicia uma leitura.

### Retorno visual e movimento

Progresso da leitura:

- RN-11: O card do arquivo aparece no mesmo instante em que o arquivo é solto ou escolhido, já com o nome,
  o tamanho e a barra. Nenhuma espera separa o gesto da resposta.
- RN-12: A barra mostra o progresso real da leitura e avança de forma contínua. Ela nunca volta atrás nem
  salta de uma vez para 100%. Se o arquivo for lido mais rápido do que o olho acompanha, a barra ainda
  preenche num movimento curto, e a prévia só aparece quando a barra termina. Assim a pessoa vê que a
  prévia é o resultado daquela leitura.
- RN-13: A interface continua respondendo durante a leitura, inclusive numa planilha de 1.000 Test Cases.
  A barra não congela, e a pessoa pode remover o arquivo ou soltar outro a qualquer momento.
- RN-14: Ao chegar a 100%, o card do arquivo mostra que a leitura terminou, com um sinal de concluído e o
  total de Test Cases lidos. A área de upload recolhe com um movimento suave, e a prévia surge logo abaixo
  do card, no espaço que a área ocupava.
- RN-15: Trocar de arquivo durante a leitura interrompe a leitura anterior. O resultado da leitura
  interrompida nunca aparece, nem se ela terminar depois. A barra volta ao início a partir de onde
  estava, sem salto, e acompanha o novo arquivo.

Remover a planilha:

- RN-16: Remover o arquivo é imediato e não pede confirmação, porque nada foi gravado no sistema. Um aviso
  "Planilha removida", com o mesmo estilo dos demais avisos do sistema, confirma a remoção. Não há
  Desfazer: para voltar, a pessoa escolhe o arquivo de novo.
- RN-17: Ao remover, o card do arquivo e a prévia saem pelo mesmo caminho por onde entraram, a área de
  upload volta a se abrir no lugar dela, e o card do modelo reaparece. O foco do teclado vai para a área
  de upload, pronta para receber outro arquivo.
- RN-17a: A reabertura da área de upload é suave e contínua. A altura cresce e o conteúdo (ícone e texto)
  surge aos poucos no mesmo movimento, sem aparecer de uma vez nem empurrar o resto da tela num salto. O
  que está abaixo, como os formatos aceitos e o card do modelo, desce junto com a área. A reabertura é um
  pouco mais lenta que o recolhimento, para a volta ser percebida. Se a pessoa soltar um arquivo durante
  a reabertura, a área já aceita o arquivo, sem esperar o movimento terminar.

Falhas:

- RN-18: Se a leitura falhar, a barra para onde estava e muda para o estado de erro, com cor e ícone de
  erro e o motivo em texto. A cor nunca é o único sinal. A área de upload volta a aparecer para a pessoa
  tentar outro arquivo, e os problemas da planilha aparecem embaixo, como hoje.
- RN-19: Um arquivo recusado pelo formato ou pelo tamanho (RN-10) é recusado no instante em que é solto.
  O motivo aparece junto da área de upload, além do aviso, e o estado anterior não se altera.

Prévia dos Test Cases:

- RN-20: A prévia surge com uma transição curta, sem deslocar o resto da tela de forma brusca. A tela não
  rola sozinha até ela.
- RN-21: Trocar de página ou de tamanho de página na prévia mantém a altura da tabela estável enquanto as
  linhas mudam, para os controles de paginação não pularem sob o cursor.
- RN-22: O total de Test Cases lidos fica visível no cabeçalho da prévia e no card do arquivo, com os
  mesmos números.

Acessibilidade:

- RN-23: A barra é anunciada como barra de progresso, com o valor atual. O leitor de tela é avisado no
  início da leitura, ao terminar (com o total de Test Cases) e em caso de falha, e não a cada ponto
  percentual.
- RN-24: Com a preferência do sistema por movimento reduzido, os movimentos de recolher, abrir e surgir
  viram transições curtas de opacidade. A barra continua mostrando o progresso.

## Critérios de aceite

- **CA-01:** Dado o formulário de criação por planilha sem arquivo, quando a pessoa clica em qualquer
  ponto da área de upload, então o seletor de arquivos abre.
- **CA-02:** Dada a área de upload com foco do teclado, quando a pessoa pressiona Enter ou Espaço, então
  o seletor de arquivos abre.
- **CA-03:** Dada a área de upload, quando a pessoa passa o mouse ou arrasta um arquivo sobre ela, então
  a área fica com fundo azul-claro e borda azul; ao sair, volta ao normal.
- **CA-04:** Dado o formulário sem arquivo, quando a tela é exibida, então o card abaixo da área é o do
  modelo, e o botão baixa a planilha modelo.
- **CA-05:** Dada uma planilha válida, quando a pessoa a escolhe ou solta na área, então o card do modelo
  é trocado pelo card do arquivo, com nome, tamanho e uma barra que avança até 100%; ao terminar, a área
  de upload some e a prévia aparece.
- **CA-06:** Dado um arquivo ainda em leitura, quando a pessoa solta outra planilha na área, então o card
  passa a mostrar o novo arquivo e a leitura recomeça. Depois de processado, a área fica oculta até a
  pessoa remover o arquivo.
- **CA-07:** Dado um arquivo escolhido, quando a pessoa clica em remover, então o card do modelo
  reaparece, e a prévia e os problemas somem.
- **CA-08 (falha):** Dado um arquivo `.csv`, ou uma planilha maior que 25 MB, quando a pessoa o escolhe ou
  solta, então o sistema avisa o motivo e mantém o estado anterior: o card do modelo, ou o arquivo que já
  estava escolhido.
- **CA-09 (falha):** Dado um arquivo que não pode ser lido, quando a leitura falha, então a barra para no
  estado de erro, com ícone e texto, a área de upload volta a aparecer, e o sistema mostra o problema
  como hoje, sem criar o projeto.
- **CA-10:** Dada uma planilha com 1.000 Test Cases, quando ela é lida, então a barra avança sem
  congelar, e o botão de remover continua respondendo durante a leitura.
- **CA-11:** Dada uma planilha lida instantaneamente, quando ela é escolhida, então a barra ainda preenche
  num movimento visível antes de a prévia aparecer, e a barra nunca volta atrás.
- **CA-12:** Dado um arquivo `A` em leitura, quando a pessoa solta o arquivo `B`, então só a prévia de `B`
  aparece, mesmo que a leitura de `A` termine depois.
- **CA-13:** Dada uma planilha lida, quando a pessoa a remove, então o aviso "Planilha removida" aparece,
  sem botão de desfazer, o card do modelo reaparece e o foco vai para a área de upload.
- **CA-13a:** Dada uma planilha lida, quando a pessoa a remove, então a área de upload reabre crescendo de
  forma contínua, com o ícone e o texto surgindo aos poucos, e o conteúdo abaixo desce junto, sem salto.
- **CA-14:** Dada a prévia na página 2, quando a pessoa troca de página, então a altura da tabela não
  muda e os controles de paginação ficam no mesmo lugar.
- **CA-15:** Dado um leitor de tela, quando a planilha é lida, então ele anuncia o início e o fim com o
  total de Test Cases, e não cada porcentagem.
- **CA-16:** Dada a preferência por movimento reduzido, quando a área recolhe e a prévia surge, então só
  há transições de opacidade, sem deslizar nem mudar de tamanho de forma animada.

## Fora de escopo

- Medir o envio do arquivo ao servidor ao clicar em "Criar projeto".
- Enviar mais de um arquivo por vez.
- Mudar os formatos aceitos, o tamanho máximo, a prévia ou as mensagens de problemas da planilha.
- O upload do relatório SDF na aba Form Factor.

## Dúvidas em aberto

- Nenhuma.
