# 056. Redesign do Board: Spec

- **Status:** Concluída
- **Data:** 2026-11-02
- **Specs relacionadas:** 037 (Kanban e Board), 055 (fundação visual), 054 (pilha de avatares da Timeline)
- **Referência visual:** protótipo do Figma, frame 2550-4207 (Board do perfil dev, tema claro)

## Problema

O Board ainda tem o visual antigo: colunas com selo de status colorido, cards com bordas e uma fileira de seis
filtros sempre aberta no topo. O protótipo novo tem um cabeçalho com título azul, descrição e avatares, um único
botão Filter e colunas com ponto de cor. Depois da spec 055, o Board é a tela que mais destoa do resto.

## Objetivo

O Board, em todos os perfis, tem a aparência do protótipo: cabeçalho, filtro, colunas e cards. Nenhum comportamento
muda: arrastar, mover pelo menu, filtrar, trocar de projeto e escolher o time continuam como na spec 037.

## Histórias de usuário

- Como **pessoa de qualquer perfil**, quero ver o Board com a mesma identidade das outras telas para me orientar
  sem estranhar.
- Como **dev**, quero ver as colunas e os cards com cores e tamanhos que me deixem achar o status de um caso de
  relance.
- Como **pessoa que filtra o Board**, quero um botão Filter que abra os filtros, para ter mais espaço para as colunas.

## Regras de negócio

- RN-01: O cabeçalho mostra o título "Board" em azul, uma frase de descrição embaixo e, à direita, as pessoas do
  projeto em avatares sobrepostos, com "+N" quando passam de cinco.
- RN-02: Abaixo do cabeçalho, uma linha traz o nome do projeto (que continua trocando de projeto) à esquerda e o
  botão **Filter** à direita, com o ícone novo. Uma linha fina separa essa faixa das colunas.
- RN-03: O botão Filter abre os mesmos filtros de hoje (TC ID, responsável, Status, Category, Difficulty e
  TC Situation). Eles combinam entre si, ficam no endereço da página e têm "Limpar filtros", como na spec 037
  (RN-11b a RN-11d). Com algum filtro ativo, o botão mostra que há filtro aplicado.
- RN-04: Cada coluna é um painel cinza claro, com ponto de cor do Status, o nome e o total de casos. O ponto de
  cada Status tem uma cor própria, e o texto do Status continua escrito (a cor não é a única pista).
- RN-05: O quadro mantém as sete colunas da spec 037, na mesma ordem. O protótipo mostra cinco, porque desenhou
  só os Status do caminho feliz. `In Fixes` e `Excluded` ficam com o mesmo visual das outras.
- RN-06: O card é branco, com cantos arredondados e sombra leve, e traz o TC ID, o menu de três pontos, as
  etiquetas (Category, Difficulty e TC Situation, com a cor de cada valor) e a pessoa responsável com a esfera
  de avatar. A alça de arrastar continua disponível, porque é a alternativa de quem não usa mouse.
- RN-07: Enquanto um card é arrastado, o lugar de origem, a coluna de destino e as colunas que não aceitam o card
  ficam destacados como hoje (spec 037, RN-11a). Só a cor e a forma seguem o protótipo.
- RN-08: A tela para escolher o projeto (admin, gerente e KP com vários times), que não tem frame, segue o mesmo
  critério visual: título azul, busca no estilo novo e cards de time com as cores e bordas do protótipo.
- RN-09: O estado vazio do projeto sem casos e o do filtro sem resultado usam o painel de estado vazio da spec 055.
- RN-10: Cores, fontes e ícones valem para todos os perfis. O tema escuro não muda nesta spec (RN-10 da 055).
- RN-11: Nenhuma regra de acesso muda: quem vê, move e exclui casos continua igual (specs 015 e 037).

## Critérios de aceite

- **CA-01:** Dado um projeto com casos em vários Status, quando a pessoa abre o Board, então vê o título azul, a
  descrição, os avatares, o nome do projeto, o botão Filter e as sete colunas com ponto de cor, nome e total.
- **CA-02:** Dado um projeto com mais de cinco pessoas, quando o Board abre, então os avatares mostram cinco e um
  "+N", e o texto lido por leitor de tela lista quantas pessoas faltam.
- **CA-03:** Dado o Board aberto, quando a pessoa aciona o botão Filter, então os filtros abrem e podem ser
  fechados só com o teclado, e o foco volta ao botão.
- **CA-04:** Dado um filtro aplicado, quando a pessoa fecha os filtros, então o botão Filter indica que há filtro
  ativo e as colunas mostram só os casos filtrados, com o total de cada coluna refeito.
- **CA-05 (falha):** Dado um filtro que não bate com nenhum caso, quando a pessoa o aplica, então aparece o estado
  vazio com a opção de limpar os filtros, e o botão Filter continua acessível.
- **CA-06:** Dado um card que a pessoa pode mover, quando ela o arrasta ou usa o menu de três pontos, então o caso
  muda de Status como antes, com a mesma justificativa ao excluir.
- **CA-07 (falha):** Dado um card que a pessoa não pode mover, quando ela o vê, então ele não mostra menu nem
  alça de arrastar.
- **CA-08 (falha):** Dado que a consulta do Kanban falha, quando o Board abre, então a mensagem de erro e o
  botão de tentar de novo aparecem no estilo novo.
- **CA-09:** Dado um admin, gerente ou KP com vários times, quando abre o Board, então a tela de escolha do projeto
  tem o título azul e os cards de time no estilo novo, com a mesma busca de hoje.
- **CA-10:** Dado o idioma inglês, português ou coreano, quando a pessoa percorre o Board, então nenhum texto fica
  cortado ou sobreposto no cabeçalho, no botão Filter e nos cards.
- **CA-11:** Dado o uso só com o teclado, quando a pessoa percorre o Board, então cada controle mostra o foco de
  forma visível.
- **CA-12:** Dado o tema escuro, quando a pessoa abre o Board, então as cores do tema escuro são as de antes desta
  spec.

## Fora de escopo

- Timeline, Projects e General Results (specs 057 a 059).
- Mudar Status, ordem das colunas, regras de movimento, permissões ou o que cada perfil enxerga.
- Mudar o que a API devolve. As pessoas do cabeçalho vêm dos dados que o Board já carrega.
- A paleta do tema escuro.
- Mudar o texto do protótipo "Detailed visual representation…" além da tradução para os três idiomas.

## Dúvidas em aberto

- **Quem aparece nos avatares do Board?** Proponho os responsáveis dos casos do projeto, que o Board já tem. O
  protótipo não diz se são os membros do time. Se forem os membros do time, a API precisa devolvê-los (spec nova).
- **A frase de descrição.** O protótipo repete a frase da Timeline ("Detailed visual representation of a project's
  journey…"). Proponho uma frase própria do Board, nos três idiomas. Você tem o texto final?
- **Alça de arrastar.** O protótipo não a desenha. Proponho mantê-la, discreta, e visível no foco e no hover.
