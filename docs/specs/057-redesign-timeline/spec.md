# 057. Redesign da Timeline: Spec

- **Status:** Concluída
- **Data:** 2026-11-02
- **Specs relacionadas:** 054 (Timeline), 055 (fundação visual), 056 (Board: pilha de avatares e botão Filter)
- **Referência visual:** protótipo do Figma, frame 2550-3921 (Timeline do perfil dev, tema claro) e o fundo
  quadriculado exportado do mesmo frame

## Problema

A Timeline funciona, mas ainda tem o visual da primeira versão: o título é o nome do projeto, os dois filtros ficam
abertos na barra, o cabeçalho da grade é simples e o corpo é liso. O protótipo novo tem o título "Timeline" em azul,
um único botão Filter, um cabeçalho de grade com o dia atual em destaque e um fundo quadriculado suave. Depois dos
redesenhos da 055 e da 056, a Timeline é uma das telas que destoam.

## Objetivo

A Timeline, em todos os perfis, tem a aparência do protótipo: cabeçalho, barra de visões, botão Filter, cabeçalho da
grade, fundo e cards. Nenhum comportamento muda: períodos, visões, filtros, painel do card e linha do momento atual
continuam como na spec 054.

## Histórias de usuário

- Como **pessoa de qualquer perfil**, quero ver a Timeline com a mesma identidade do resto do sistema para me
  orientar sem estranhar.
- Como **gerente ou KP**, quero achar de relance o dia de hoje na grade, para ver o que mudou até agora.
- Como **pessoa que filtra a Timeline**, quero um botão Filter que abra os filtros, para deixar a grade com mais espaço.

## Regras de negócio

- RN-01: O cabeçalho mostra o título "Timeline" em azul, uma frase de descrição embaixo e, à direita, a pilha de
  avatares da spec 054 (até cinco e "+N"). O título deixa de ser o nome do projeto.
- RN-02: O seletor de projeto, com a busca da spec 054, continua na tela. Fica à esquerda da barra, como o nome do
  projeto com a seta, e não é mais o título da página. (Frame atualizado em 2026-11-02.)
- RN-03: A barra tem o seletor de projeto à esquerda e, agrupados à direita, o grupo Dia/Semana/Mês, o intervalo com
  as setas, o atalho "Hoje" e o botão **Filter**, o mesmo da spec 056 (ícone novo, número de filtros ativos).
- RN-04: O botão Filter abre os dois filtros de hoje (responsável e Test Case). Eles se comportam como na spec 054:
  aceitam vários valores, as opções vêm dos casos com mudanças no período, continuam ao trocar de visão ou de
  período e voltam ao vazio ao trocar de projeto. O painel tem "Limpar filtros".
- RN-05: O cabeçalho da grade mostra o nome do mês acima dos dias, em cor de texto. Quando o período passa para outro
  mês, o nome do novo mês aparece na coluna em que ele começa, em cinza. Cada dia mostra a inicial do dia da semana,
  pequena e em cinza, e o número maior. O dia de hoje fica em azul e sublinhado.
- RN-06: A linha azul do momento atual (spec 054, RN-09) sai do cabeçalho da grade e vai até o fim dela, com 2 px de
  espessura.
- RN-07: O corpo da grade tem um fundo quadriculado suave, que esmaece para baixo. Só no tema claro; o escuro fica
  como está (RN-10 da spec 055).
- RN-08: O card é branco, de cantos arredondados e com sombra leve. Mostra a barra e o avatar na cor do
  responsável, o identificador do caso, o nome do responsável e, havendo mais de uma mudança, a quantidade. Na
  visão Mês continua compacto, só com a barra e o avatar. Os cards continuam empilhados por dia: a posição
  vertical dos cards no protótipo é ilustrativa.
- RN-09: O estado de "nenhuma mudança neste período" usa o painel de estado vazio da spec 055, com "Limpar
  filtros" quando há filtro ativo. Os de carregando, erro e "sem projetos" ficam no estilo novo.
- RN-10: Nenhuma regra de acesso, de dados ou de período muda (spec 054). O tema escuro não muda nesta spec.

## Critérios de aceite

- **CA-01:** Dado um projeto com mudanças na semana, quando a pessoa abre a Timeline, então vê o título "Timeline" em
  azul, a descrição, os avatares, o seletor de projeto, Dia/Semana/Mês, o intervalo com as setas, "Hoje" e o botão
  Filter.
- **CA-02:** Dado a Timeline aberta, quando a pessoa escolhe outro projeto no seletor (com busca), então a grade
  mostra o outro projeto e os filtros voltam ao vazio.
- **CA-03:** Dado a Timeline aberta, quando a pessoa aciona o botão Filter, então os filtros abrem e podem ser fechados só
  com o teclado, e o foco volta ao botão.
- **CA-04:** Dado um filtro aplicado, quando a pessoa fecha o painel, então o botão Filter indica quantos estão
  ativos e a grade mostra só os cards filtrados, como na spec 054.
- **CA-05 (falha):** Dado um período sem mudanças, ou um filtro que não bate com nenhuma, quando a grade aparece, então
  mostra o estado vazio com "Limpar filtros" quando há filtro, e o botão Filter continua acessível.
- **CA-06:** Dado a semana atual, quando a grade aparece, então o dia de hoje está em azul e sublinhado, e a linha azul
  do momento atual vai do cabeçalho até o fim da grade.
- **CA-07:** Dado um período que cruza dois meses, quando a grade aparece, então o nome do mês novo aparece em cinza na
  coluna em que ele começa.
- **CA-08:** Dado o tema claro, quando a grade aparece, então o corpo tem o fundo quadriculado suave, e os cards ficam
  legíveis sobre ele.
- **CA-09:** Dado um card, quando a pessoa o aciona, então o painel das mudanças abre como na spec 054.
- **CA-10 (falha):** Dado que a consulta falha, quando a Timeline abre, então a mensagem de erro e o botão de tentar de
  novo aparecem no estilo novo; sem nenhum projeto visível, aparece o estado vazio de "sem projetos".
- **CA-11:** Dado o idioma inglês, português ou coreano, nas visões Dia, Semana e Mês, quando a pessoa percorre a
  Timeline, então nenhum texto fica cortado ou sobreposto na barra, no cabeçalho da grade e nos cards.
- **CA-12:** Dado o uso só com o teclado, quando a pessoa percorre a barra, a grade e os cards, então cada controle
  mostra o foco de forma visível.
- **CA-13:** Dado o tema escuro, quando a pessoa abre a Timeline, então as cores são as de antes desta spec.

## Fora de escopo

- Board, Projects e General Results (specs 056, 058 e 059; a 056 já está concluída).
- Mudar períodos, visões, filtros, o painel do card, o que a API devolve ou o acesso por perfil.
- Eventos futuros e marcos planejados ("upcoming tasks" do texto do protótipo): o histórico só tem o passado (spec 054).
- Posicionar os cards em linhas fixas como no protótipo.
- A paleta do tema escuro.

## Dúvidas em aberto

- Resolvida em 2026-11-02: o frame atualizado desenha o seletor de projeto à esquerda da barra, com as visões, o
  intervalo, o "Hoje" e o Filter agrupados à direita (RN-02 e RN-03).
- **A frase de descrição.** O protótipo diz "Detailed visual representation of a project's journey, highlighting key
  milestones, progress updates, and upcoming tasks.", mas a tela não mostra tarefas futuras. Proponho manter uma
  frase fiel ao que a tela faz, nos três idiomas. Você tem o texto final?
- **O "November 2027" do frame.** Parece erro de digitação do protótipo, porque a grade está em 2026. Trato como o mês
  seguinte do período, em cinza (RN-05).
