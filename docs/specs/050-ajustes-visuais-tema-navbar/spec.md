# 050. Ajustes visuais: tema escuro, Navbar, calendário e Sidebar: Spec

- **Status:** Em andamento (T22: 23 e2e com API real pendentes; o resto verde)
- **Data:** 2026-10-30
- **ADRs relacionados:** 0037 (HeroUI), 0040 (tema), 0041 (cores só por token)
- **Depende de:** spec 049 (transição suave ao trocar o tema), já na `dev`: esta spec preserva a transição dela
- **Revoga em parte:** a regra da spec 030 de abrir o painel do caso "em todas as tabelas de projetos" (RN-01)
- **Figma:** TCM, `2482-1902` (Projetos, escuro: referência de cores de todas as telas), `2482-2329` e `2482-2651`
  (Navbar escura e clara), `2482-2966` (botões Week, Day or Week e busca, claro e escuro)
- **Critério de design:** skill `apple-design` (resposta imediata, consistência espacial, movimento reduzido e os
  brancos de texto da Apple; a transição de tema é a da spec 049), aplicada sobre o Figma, que tem a palavra final em cores, tamanhos e textos

## Problema

O tema escuro atual não segue o protótipo: o fundo da janela é mais claro que os cartões e as etiquetas têm
outros tons. Na Navbar, com a janela estreita ou um nome de usuário longo, a busca fica por baixo do botão de
tema e do seletor de idioma. Algumas telas (login, troca de senha, perfis, ativar usuário) ainda usam a base
visual antiga, com outro desenho de botões e janelas. Os botões de semana e de busca e os destaques da Sidebar
têm cantos e cores diferentes do protótipo. Em General Results, o TC ID abre o painel do caso, que ali não ajuda:
a tela é sobre os resultados por data.

## Objetivo

O sistema inteiro passa a ter o tema escuro do protótipo, a Navbar e os botões de filtro no desenho novo, sem
nada encostando em nada, e todas as telas na mesma base visual e na mesma fonte. Nada muda no que as telas
fazem, exceto o TC ID de General Results, que deixa de abrir o painel.

## Histórias de usuário

- Como **pessoa que usa o tema escuro**, quero as cores do protótipo em todas as telas, com texto legível.
- Como **qualquer pessoa**, quero a busca, o tema, o idioma e o meu menu sempre visíveis e separados na Navbar.
- Como **gestão**, quero escolher uma semana pelo número dela no calendário, ou um dia, como hoje.

## Regras de negócio

**1. Painel do caso**
- RN-01: O painel de detalhes do Test Case (título, pré-condição, procedimento, resultado esperado e links de PR)
  abre pelo TC ID **só na página do projeto**, nas abas Test Cases e Form Factor. Em General Results o TC ID é
  texto simples, sem ação. O **Resumo de execuções** de General Results continua como está.

**2. Cores e fonte**
- RN-02: O tema escuro de todas as telas usa as cores do protótipo da página de projetos: o fundo da página é o
  mais escuro, os painéis (Sidebar, cartão da página, Navbar) ficam um passo acima e a tabela tem moldura e corpo
  próprios. Etiquetas de status e destaques seguem os tons do protótipo.
- RN-03: No escuro, o texto principal é o branco que a Apple recomenda (branco a 85%) e o secundário, branco a
  55%, em vez do branco puro do protótipo.
- RN-04: As bordas dos botões de filtro, da busca, do botão de tema e dos cartões são `#2F2F2F` no escuro e
  `#EEEEEE` no claro. Fora essa borda, o tema claro não muda.
- RN-05: Todo texto e toda etiqueta do tema escuro têm contraste de pelo menos 4,5:1 com o fundo em que aparecem.
  As cores que o protótipo não mostra (menus, painéis laterais, janelas, sucesso, aviso, erro, gráficos e as
  demais etiquetas de status) mantêm os tons atuais e só mudam se ficarem abaixo desse contraste.
- RN-06: Todo o texto do sistema usa a fonte Inter, inclusive o texto de exemplo da busca.

**3. Navbar**
- RN-07: O botão de tema tem o desenho do protótipo em cada tema (círculo com borda, ícone do tema em uso). Ele
  continua igual no comportamento: alterna o tema, a escolha fica guardada no navegador e o tema claro é o padrão.
  No login, o botão aparece com o mesmo comportamento.
- RN-08: A troca de tema continua com a transição da spec 049 (as cores da tela mudam juntas e aos poucos e o
  ícone do botão anima), com as regras de movimento reduzido de lá. O botão de tema novo mantém o ícone animado.
- RN-09: A Navbar usa as cores do protótipo nos dois temas, a busca fica mais estreita (como no protótipo) e há
  divisórias entre tema, idioma e usuário.
- RN-10: Nenhum elemento da Navbar encosta em outro ou fica por cima de outro, em janelas de 1280 a 1920 px, com
  a Sidebar aberta ou recolhida, em qualquer idioma, com qualquer nome de usuário e nos dois temas. Quando falta
  espaço, quem encolhe é a busca; tema, idioma e usuário mantêm o tamanho.

**4. Base visual única**
- RN-11: Todas as telas usam a mesma base de componentes. O login, a troca de senha, o editor de permissões, a
  confirmação de ativar ou inativar usuário, a etiqueta de status do projeto, os estados de carregamento e o
  filtro de data das tabelas mantêm o comportamento atual: mensagens, validações, carregamento, redirecionamento,
  foco preso nas janelas, Esc fechando e foco voltando ao botão que abriu.
- RN-12: A confirmação de inativar setor tem título, botão e descrição próprios, com o nome do setor, em vez de
  reaproveitar a mensagem de erro de atualização.

**5. Botões de filtro e calendário**
- RN-13: Os botões "Week", "Day or Week" e a busca redonda (só ícone) têm o desenho do protótipo: pílula de 36 px
  de altura, com as cores de cada tema. Em inglês o texto é "Day or Week".
- RN-14: Os botões em pílula, o botão de tema e os itens da Sidebar respondem no instante do toque ou do clique
  (antes de soltar), com uma leve redução de tamanho, e voltam ao soltar.
- RN-15: O calendário abre a partir do botão que o chamou e fecha voltando para ele. Com o "reduzir movimento"
  ligado, ele só aparece e some, sem deslocamento.
- RN-16: O calendário mantém a **coluna de números de semana**. Clicar no número escolhe a semana (ISO). No modo
  "Day or Week", clicar num dia escolhe o dia. A semana segue a regra ISO na virada de ano (29/12/2025 é a semana
  1 de 2026). O calendário funciona pelo teclado.
- RN-17: Meses e dias da semana aparecem no idioma da pessoa (en, pt, ko), com o atalho "This week" no rodapé.
- RN-18: O filtro de data das tabelas usa o mesmo calendário.

**6. Sidebar**
- RN-19: O destaque do item selecionado e do item sob o mouse é uma pílula (cantos totalmente arredondados) em
  todos os itens: os do topo, o grupo Administração e os subitens, Times e Usuários. O contorno de foco do
  teclado tem a mesma forma. Com a Sidebar recolhida, o destaque fica centralizado no ícone, sem cortar.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01 (falha):** Dado General Results, quando a pessoa clica no TC ID ou chega nele pelo teclado, então nada
  abre: o TC ID não é botão nem link.
- **CA-02:** Dado a página do projeto, nas abas Test Cases e Form Factor, quando a pessoa clica no TC ID, então o
  painel de detalhes abre; em General Results, a ação Resumo de execuções continua abrindo o resumo.
- **CA-03:** Dado o tema escuro, quando a pessoa abre Projetos, Usuários ou General Results, então o fundo, os
  painéis, a tabela e as etiquetas têm as cores do protótipo, o texto principal é branco a 85% e as bordas dos
  cartões e botões são `#2F2F2F`.
- **CA-04 (falha):** Dado o tema escuro, quando se mede o contraste de cada texto e etiqueta sobre o seu fundo,
  então nenhum fica abaixo de 4,5:1.
- **CA-05:** Dado o tema claro, quando a pessoa abre qualquer tela, então as bordas dos cartões e botões são
  `#EEEEEE` e as demais cores são as de antes.
- **CA-06:** Dado qualquer tela, nos dois temas e nos três idiomas, quando o texto aparece, então ele usa Inter.
- **CA-07:** Dado o botão de tema, quando a pessoa o aciona na Navbar ou no login, então o tema troca com a transição
  da spec 049, o botão muda para o desenho do outro tema, a escolha continua depois de recarregar e, sem escolha guardada, o
  tema é o claro.
- **CA-08:** Dado o "reduzir movimento" ligado, quando a pessoa abre ou fecha o calendário, então ele não se
  desloca; a troca de tema segue a regra de movimento reduzido da spec 049.
- **CA-09 (falha):** Dado janelas de 1280, 1440 e 1920 px, a Sidebar aberta ou recolhida, os idiomas en, pt e ko e
  os dois temas, quando a Navbar aparece, então a busca, o tema, o idioma e o usuário não se sobrepõem nem se
  tocam.
- **CA-10 (falha):** Dado o login, quando a pessoa erra a senha, então vê a mesma mensagem de antes; com os dados
  certos, entra e vai para a página inicial.
- **CA-11 (falha):** Dado a troca de senha, quando a senha nova não atende às regras ou não confere, então as
  mesmas mensagens de antes aparecem e nada é salvo.
- **CA-12:** Dado o editor de permissões, a confirmação de ativar ou inativar usuário e a de inativar setor,
  quando a janela abre, então o foco fica preso nela, Esc fecha sem alterar nada e o foco volta ao botão que abriu;
  confirmar aplica a ação, e a de setor mostra o nome do setor no título e na descrição.
- **CA-13:** Dado a etiqueta de status do projeto, quando aparece nos dois temas, então cada status mantém a sua
  cor; os estados de carregamento continuam anunciados para leitores de tela.
- **CA-14:** Dado os botões "Week", "Day or Week" e a busca, quando aparecem nos dois temas, então têm o desenho
  do protótipo e reagem já ao pressionar.
- **CA-15:** Dado o calendário aberto, quando a pessoa clica no número de uma semana, então a semana é escolhida;
  no modo "Day or Week", clicar num dia escolhe o dia.
- **CA-16 (falha):** Dado o calendário em dezembro de 2025, quando a pessoa escolhe a semana de 29/12, então o
  filtro é a semana 1 de 2026, não a 53 de 2025.
- **CA-17:** Dado o calendário, quando a pessoa usa só o teclado, então navega entre dias e semanas, escolhe um e
  fecha com Esc; meses e dias aparecem no idioma escolhido.
- **CA-18:** Dado o filtro de data de uma tabela, quando a pessoa escolhe um dia, então a tabela filtra como antes.
- **CA-19:** Dado a Sidebar aberta ou recolhida, quando um item está selecionado, sob o mouse ou com foco do
  teclado, então o destaque é uma pílula; recolhida, o destaque fica centralizado no ícone.

## Fora de escopo

- Mudar o tema claro além da borda `#EEEEEE` (RN-04) e de um valor que um token novo precise ter.
- Barras e painéis translúcidos (desfoque atrás da Navbar ou da Sidebar): o protótipo usa fundos sólidos.
- Fazer a busca da Navbar buscar (ela continua só visual; a busca global é a spec 041).
- Mudar o comportamento de qualquer tela, além do TC ID de General Results.
- O backend.

## Dúvidas em aberto

Nenhuma. Decisões de 2026-10-30:

- Borda `#2F2F2F` no escuro e `#EEEEEE` no claro, nos botões de filtro, na busca, no botão de tema e nos cartões
  (RN-04). O Figma tinha duas bordas diferentes no escuro.
- Inter em todo o texto, inclusive a busca, que no Figma usa "Momo Trust Sans" (RN-06).
- Texto principal no branco da Apple (85%) em vez do branco puro do Figma (RN-03).
- Cores que o protótipo escuro não mostra ficam como estão, salvo contraste abaixo de 4,5:1 (RN-05).
- A skill `apple-design` entra como critério da spec (RN-14 e RN-15).
- A transição de tema (antes RN-08 desta spec) é a da spec 049, que chegou à `dev` antes desta: aqui ela só é
  preservada. Com isso, esta spec passou de 049 para 050.
