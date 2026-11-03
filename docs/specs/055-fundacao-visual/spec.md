# 055. Fundação visual do redesign: Spec

- **Status:** Concluída
- **Data:** 2026-11-02
- **Specs relacionadas:** 034 (tema claro e escuro), 050 (ajustes visuais), 051 (redefinição de senha)
- **Referência visual:** protótipo do Figma "Test Case Manager" (frames citados em cada regra)

## Problema

O protótipo foi atualizado com uma identidade nova: outro logotipo, outro azul, títulos coloridos, ícones mais
finos e estados vazios redesenhados. A aplicação ainda mostra a identidade antiga, e cada perfil (admin,
gerente, KP e dev) tem a sua sidebar. Quem usa o sistema vê telas de gerações diferentes, e as próximas
specs do redesign (Board, Timeline, Projects e General Results) partem desta base.

## Objetivo

Todas as telas, em todos os perfis, usam as mesmas cores, fontes, ícones e logotipo do protótipo. Isso inclui o
login, as quatro sidebars, o estado vazio de telas e tabelas e a tela de Teams. As tabelas deixam de mostrar o
total de itens no rodapé (ADR 0045).

## Histórias de usuário

- Como **pessoa de qualquer perfil**, quero ver o mesmo logotipo, as mesmas cores e os mesmos ícones em todas as
  telas para reconhecer o produto e me orientar pelo menu.
- Como **pessoa que abre o sistema pela primeira vez**, quero um login com a identidade do produto para saber que
  estou no lugar certo.
- Como **pessoa sem dados ainda**, quero um estado vazio claro e igual em todas as telas para entender que não há
  nada a mostrar, e não que a tela quebrou.

## Regras de negócio

- RN-01: As cores, as fontes e a espessura dos ícones seguem o protótipo em todas as telas e perfis, inclusive
  nas que não têm frame próprio. Onde faltar frame, vale o mesmo critério do frame mais parecido.
- RN-02: **Login** (frame 2524:1945): logotipo e título em azul, campos e botão arredondados, ilustração ao lado,
  alternância de tema e idioma no canto superior direito. O espaçamento entre letras, os ícones (como o olho da
  senha) e o logotipo ficam como no protótipo.
- RN-03: **Sidebars** (frames 2216:614 admin, 2216:799 gerente, 2216:910 KP e 2216:1015 dev): logotipo novo no
  topo, tanto aberta (com o nome) quanto recolhida (só o símbolo). O item da página aberta tem fundo azul claro,
  e o ícone e o texto dele ficam azuis. Os itens de cada perfil não mudam, só a aparência.
- RN-04: **Estado vazio**: toda tela ou tabela sem dados usa o mesmo painel cinza claro, com ícone azul, título
  e uma frase de apoio (frames 2550:2877 e 2550:3100). Cada tela mantém a sua mensagem; muda a aparência.
- RN-05: **Tabelas**: o rodapé não mostra o total de itens, em nenhum perfil. O seletor de itens por página, o
  botão Exportar (onde existe) e a paginação continuam (ADR 0045).
- RN-06: **Teams** (frames 2552:4919 e 2552:5086): só a cor das fontes muda. O título da página fica azul.
- RN-07: Nenhum comportamento muda: rotas, permissões, filtros, ordem dos itens do menu e textos continuam
  como estão, nos três idiomas (inglês, português e coreano).
- RN-08: A aparência nova mantém contraste legível e foco visível em todos os controles alterados.
- RN-09: O título de toda página, em todos os perfis, é azul, como nos frames de Projects e Teams.
- RN-10: O **tema escuro** não muda nesta spec: continua como está hoje. A paleta nova do tema escuro fica
  para a spec seguinte do redesign.

## Critérios de aceite

- **CA-01:** Dado uma pessoa não autenticada, quando abre o login, então vê a tela igual ao frame do Figma:
  logotipo e título em azul, campos e botão arredondados, ilustração e controles de tema e idioma.
- **CA-02 (falha):** Dado o login aberto, quando a pessoa envia e-mail ou senha errados, então a mensagem de erro
  aparece com contraste legível no novo visual, e os campos continuam preenchidos como antes.
- **CA-03:** Dado cada um dos quatro perfis, quando a pessoa entra, então a sidebar mostra o logotipo novo e
  os mesmos itens de hoje para aquele perfil, conforme o frame do perfil.
- **CA-04:** Dado qualquer página aberta, quando a sidebar a destaca, então o item tem fundo azul claro e ícone e
  texto azuis, e os demais itens ficam em cinza.
- **CA-05:** Dado a sidebar recolhida, quando a pessoa a observa, então vê só o símbolo do logotipo e os ícones,
  com o item ativo destacado.
- **CA-06:** Dado uma tabela com várias páginas, quando a pessoa chega ao rodapé, então vê o seletor de itens por
  página e a paginação, e não vê nenhum texto de total de itens.
- **CA-07 (falha):** Dado uma tabela que o filtro deixa sem resultados, quando a pessoa a vê, então aparece o
  estado vazio novo, sem total, e o filtro continua acessível para ser limpo.
- **CA-08:** Dado uma pessoa sem projetos nem Test Cases, quando abre Projects, então vê o estado vazio igual ao
  frame, com ícone azul, título e frase de apoio.
- **CA-09:** Dado uma tabela vazia em qualquer outra tela (por exemplo Usuários, Setores ou Modelos), quando a
  pessoa a abre, então vê o mesmo estado vazio, com a mensagem própria daquela tela.
- **CA-10:** Dado a tela de Teams, quando a pessoa a abre, então título e textos têm as cores do protótipo e a
  tabela e o rodapé estão iguais ao frame, sem total.
- **CA-11:** Dado o idioma inglês, português ou coreano, quando a pessoa percorre login, sidebar e estados vazios,
  então nenhum texto é cortado ou sobreposto por causa das novas fontes e espaçamentos.
- **CA-12:** Dado o uso só com o teclado, quando a pessoa percorre sidebar e login, então cada controle mostra o
  foco de forma visível.
- **CA-13:** Dado qualquer página, em qualquer perfil, quando a pessoa a abre no tema claro, então o título da
  página é azul.
- **CA-14:** Dado o tema escuro ativo, quando a pessoa percorre login, sidebar, tabelas e estados vazios, então
  as cores do tema escuro são as mesmas de antes desta spec, e só o que não depende de cor (logotipo, ícones,
  rodapé sem total) muda.

## Fora de escopo

- Board, Timeline, Projects e General Results (specs 056 a 059). Esta spec só dá a elas as cores, os ícones e os
  estados vazios novos.
- Mudar itens de menu, permissões, rotas, textos ou a lógica de qualquer tela.
- Criar ilustrações novas além das que o protótipo já traz.
- A paleta do tema escuro.

## Dúvidas em aberto

- Nenhuma. Decidido em 2026-11-02: o tema escuro fica como está (a paleta escura nova vira a spec seguinte) e o
  título azul vale para todas as páginas e perfis.
