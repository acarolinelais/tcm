# 055. Fundação visual do redesign: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Só frontend: os comandos rodam em `frontend/`. Caminhos de código abaixo são relativos a `frontend/src`.
> A Fase 1 não depende do Figma e vai primeiro. As Fases 2 e 3 precisam dos valores e do logotipo do Figma, e o
> MCP estava no limite do plano (ver "Riscos" no plan.md).

## Fase 1: rodapé sem total (ADR 0045)

- [x] **T01. Tirar o total do `DataTablePagination`**
  - Arquivos: `shared/ui/data-table-pagination.tsx`, `data-table-pagination.test.tsx`,
    `core/i18n/resources.ts` (remove `totalItems` em en, pt e ko),
    `modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.test.tsx`,
    `modules/projetos/components/importacao/PreviaPlanilha.test.tsx`
  - O que muda: o `<span>` do total sai; `totalCount` continua calculando as páginas. Os testes que esperavam
    "45 total" e "1000 total" passam a afirmar que o texto não existe e que a página 2 e o seletor funcionam.
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- data-table-pagination HistoricoProjetoTabela PreviaPlanilha` → verde;
    `npm run lint` → sem erro de `totalItems` sem uso.
- [x] **T02. Botão Exportar abre o rodapé; e2e sem o total**
  - Arquivos: `shared/ui/data-table.tsx`, `shared/ui/data-table-export.tsx` (só se o espaçamento pedir),
    `data-table-export.test.tsx`, `e2e/resultados-gerais.spec.ts`, `e2e/projetos-importacao.spec.ts`
  - O que muda: confere o Exportar no início do rodapé, sem sobra de espaço onde ficava o total, e troca as
    asserções `"45 no total"` dos dois e2e por asserções da paginação (página atual e Next).
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- data-table-export` → verde;
    `npm run e2e -- resultados-gerais projetos-importacao` → verde.

## Fase 2: tokens, logotipo, sidebars e login

- [x] **T03. Tokens do tema claro**
  - Arquivos: `core/global.css` (só `:root`, nada em `:root.dark`), `core/theme/contraste-tema-claro.test.ts`
    (novo), `core/theme/tema-escuro-intacto.test.ts` (novo)
  - O que muda: `--accent`, `--accent-text`, `--accent-tint`, `--primary`, `--ring`, `--body`, `--subtle` e
    `--panel` recebem os valores do Figma (`get_variable_defs` nos frames 2524:1945 e 2216:614), escurecidos o
    mínimo para o AA, com o hex original em comentário. O teste de contraste mede par a par (texto branco sobre
    o acento, `--accent-text` sobre o cartão e sobre o painel, ≥ 4,5:1). O teste do tema escuro compara o bloco
    `:root.dark` com o texto de antes da spec.
  - Cobre: CA-14, RN-01, RN-08
  - Feito: o Figma (#0081F9) virou `--accent` #006cd1, o menor escurecimento que passa 4,5:1 sobre o branco, o painel e o
    fundo do item ativo (o #0081F9 dá 3,81:1 com branco). O fundo do item ativo é #e6f3ff, lido do frame. Os testes ficaram
    em `contraste-tema-escuro.test.ts`, que já tinha os utilitários de contraste; o escuro é conferido por um hash do bloco.
  - Verificação: `cd frontend && npm test -- contraste-tema-claro tema-escuro-intacto cores-por-token
    contraste-tema-escuro` → verde.
- [x] **T04. Logotipo novo e topo da Sidebar**
  - Arquivos: `shared/assets/figma/icons/` (logotipo novo, símbolo e versão com o nome; sai o `logo-icone.svg` se
    nada mais o usa), `core/layout/Sidebar.tsx`, `core/layout/Sidebar.test.tsx`
  - O que muda: aberta, o topo mostra o logotipo com o nome (sai o texto "TCM"); recolhida, só o símbolo. O
    destaque do item ativo (fundo `--accent-tint`, ícone e texto de acento) sai dos tokens da T03. Os itens por
    perfil não mudam.
  - Cobre: CA-03, CA-04, CA-05
  - Feito: o mesmo `logo-tcm.svg` (símbolo + nome) fica cortado no símbolo quando a Sidebar recolhe. O `logo-icone.svg`
    novo ficou sem uso; o `logo.svg` foi apagado por já não ter uso.
  - Verificação: `cd frontend && npm test -- Sidebar` → um caso por perfil (admin, gerente, KP, dev) com o
    logotipo e os itens de hoje; o link ativo tem `aria-current="page"`; recolhida, o nome some e o símbolo fica.
- [x] **T05. Ícones com a espessura do protótipo**
  - Arquivos: `core/layout/sidebar-icons.tsx`, `shared/ui/figma-icons.tsx`
  - O que muda: o traço dos ícones passa a ter a espessura dos frames 2216:614 a 2216:1015. Só atributo de
    traço, sem trocar o desenho.
  - Cobre: CA-03 (visual)
  - Feito sem mudar o código: o export novo das sidebars (admin e dev) usa o traço padrão de 1px, e os ícones atuais têm
    0,999 a 1,03px, que na prática é o mesmo. A geometria dos desenhos não foi comparada ícone a ícone. A cor do ícone ativo
    (#0081F9 no Figma) já sai do acento. A borda dos cartões e da sidebar é #f2f2f2 no Figma, e o `--edge` do claro passou a ser esse.
  - Verificação: `cd frontend && npm test -- Sidebar figma-icons` e `npm run lint` → verde; conferência no
    navegador contra os quatro frames de sidebar, sem diferença de traço.
- [x] **T06. Login com a identidade nova**
  - Arquivos: `core/auth/AuthLayout.tsx`, `core/auth/LoginPage.tsx`, `core/auth/LoginPage.test.tsx`
  - O que muda: logotipo e título em azul, campos e botão arredondados, espaçamento entre letras, ícone do olho e
    cores como no frame 2524:1945. A ilustração só muda se o frame trouxer outra. A redefinição de senha
    (`AlterarSenhaPage`) usa o mesmo layout e herda.
  - Cobre: CA-01, CA-02
  - Feito: ilustração e degradê novos (`illustrations/illustration-login.svg` e `background-illustration-login.svg`) no claro; o
    escuro segue com a ilustração antiga (RN-10), marcada com `shortcut:` no `AuthLayout`. O cartão fica 25px mais baixo que no
    frame porque tema e idioma ficam numa linha acima dele, decisão da spec 050 mantida.
  - Verificação: `cd frontend && npm test -- LoginPage AlterarSenhaPage` → login renderiza logotipo, título, campos
    e botão; credenciais recusadas mostram o erro (`role="alert"`) e mantêm o e-mail digitado.

## Fase 3: título azul e estado vazio

- [x] **T07. Título azul em todas as páginas**
  - Arquivos: `shared/ui/page-card.tsx` (`PageTitle`), `shared/ui/page-card.test.tsx` (novo),
    `modules/projetos/pages/ProjetosPage.tsx` (dois `h1`), `modules/overview/components/OverviewHeroCard.tsx`,
    `modules/overview/pages/OverviewPage.tsx`, `modules/projetos/components/ProjetoSwitcher.tsx`,
    `core/layout/EmBreve.tsx`
  - O que muda: `PageTitle` usa `text-accent-text`. Os `h1` locais passam a usar o `PageTitle` ou a mesma cor. O
    teste novo confere a cor do `PageTitle` e varre `src/` atrás de `<h1` sem `PageTitle` nem `text-accent-text`.
  - Cobre: CA-13
  - Verificação: `cd frontend && npm test -- page-card ProjetosPage OverviewPage ProjetoSwitcher` → verde; a
    varredura lista zero `h1` fora do padrão.
- [x] **T08. Estado vazio das tabelas no padrão novo**
  - Arquivos: `shared/ui/data-table-state.tsx`, `shared/ui/data-table-state.test.tsx` (novo),
    `modules/usuarios/components/UsuariosTable.test.tsx`, `modules/setores/pages/SetoresPage.test.tsx`,
    `modules/modelos-dispositivo/pages/ModelosDispositivoPage.test.tsx`
  - O que muda: `estadoDaTabela` desenha painel cinza, ícone azul sem o círculo, título e frase de apoio como nos
    frames 2550:2877 e 2550:3100. O estado com filtro mantém o `SearchX` e o botão de limpar.
  - Feito além do previsto: o `icon` saiu de `empty` nos 11 chamadores (o ícone passou a ser o do protótipo, a caixa de
    entrada), e o painel virou `shared/ui/estado-vazio.tsx`, que a T09 reaproveita.
  - Cobre: CA-07, CA-09
  - Verificação: `cd frontend && npm test -- data-table-state UsuariosTable SetoresPage ModelosDispositivoPage` →
    vazio sem filtro mostra título e frase; vazio com filtro mostra o botão de limpar, que chama
    `onClearFilters`; nenhum dos dois mostra total.
- [x] **T09. Mesmo estado vazio no Projects do dev e nas telas com vazio próprio**
  - Arquivos: `modules/projetos/components/ProjetosDevEmptyState.tsx`, `ProjetosPage.test.tsx`,
    `modules/overview/pages/OverviewPage.tsx` (só se o vazio dele repetir o padrão), e as telas de Board e
    General Results que tenham um vazio próprio
  - O que muda: o vazio do dev deixa de ser uma cópia e passa a usar o mesmo painel (extraído para
    `shared/ui/estado-vazio.tsx` se `estadoDaTabela` e ele ficarem iguais), sem ser `h1`. As demais telas
    mantêm a própria mensagem, com a aparência nova.
  - Feito além do previsto: General Results e Timeline tinham o mesmo painel copiado para "nenhum projeto" e também
    passam a usar o `EstadoVazio`. Overview e Projects do dev usam `tituloDaPagina` (h1), porque o vazio é o único título.
  - Cobre: CA-08, CA-09
  - Verificação: `cd frontend && npm test -- ProjetosPage OverviewPage BoardPage ResultadosGeraisPage` → dev sem
    projetos vê título e frase do vazio; sem `h1` duplicado.
- [x] **T10. Teams**
  - Arquivos: `modules/times/pages/TimesPage.tsx`, `TimesPage.test.tsx`, `TimeDetalhePage.tsx`,
    `TimeDetalhePage.test.tsx`
  - O que muda: confere o título azul e a cor das fontes contra os frames 2552:4919 e 2552:5086; só corrige o
    que sair do token.
  - Cobre: CA-10
  - Verificação: `cd frontend && npm test -- TimesPage TimeDetalhePage` → título com a cor de acento e rodapé
    sem total.

## Fase 4: ponta a ponta e conferência

- [x] **T11. e2e do login e do foco por teclado**
  - Arquivos: `e2e/identidade-visual.spec.ts` (novo)
  - O que muda: abre o login, confere logotipo, título, campos e botão; percorre com Tab e confere o foco
    visível em cada controle; entra com um usuário e percorre a sidebar também só com Tab.
  - Cobre: CA-01, CA-12
  - Verificação: `cd frontend && npm run e2e -- identidade-visual` → verde.
- [x] **T12. e2e dos três idiomas**
  - Arquivos: `e2e/identidade-visual.spec.ts`
  - O que muda: em en, pt e ko, confere que login, sidebar e um estado vazio não têm texto cortado nem
    sobreposto (`scrollWidth <= clientWidth` nos rótulos).
  - Cobre: CA-11
  - Verificação: `cd frontend && npm run e2e -- identidade-visual` → verde nos três idiomas.
- [x] **T13. Suíte completa e revisão visual por perfil**
  - Verificação: `cd frontend && npm test && npm run lint && npm run build && npm run e2e` → tudo verde.
    Revisão visual no navegador, uma vez por perfil (admin, gerente, KP e dev), no tema claro e no escuro, contra
    os frames de sidebar, login, vazio e Teams; o escuro precisa estar igual ao de antes (CA-14). Backend sem
    mudança. Depois, `simplify` sobre o diff da spec e marcar o roadmap.
  - Feito: `tsc` e `lint` limpos; `build` ok; testes unitários 698 de 702, e as 4 falhas são todas do `ProjetoDetalhePage.test.tsx`,
    que já falhava na `dev` por timeout nesta máquina (passa isolado); 11 e2e com sessão simulada, 57 passaram e 1
    (`ERR_ABORTED` no reload) passou na segunda rodada. **Não rodei** os 9 e2e que entram na API real (auditoria, cor-avatar,
    form-factor-rodadas, overview, projetos-dev, projetos-kanban, tema, times, trocar-senha): criam dados no banco local.
    Revisão visual por screenshot: os 4 perfis no claro e o admin no escuro, na tela de Configurações, e o login nos dois temas.
    Observação fora do escopo: nos frames, Manager e KP agrupam Users, Sectors e Teams em Administration; o app mostra esses
    itens de outro jeito. A RN-07 manda não mudar o menu, então ficou como está.

## Backlog
- Paleta do tema escuro novo: spec seguinte do redesign (RN-10).
- **Chave `pageOfTotal` sem uso** (simplify da fase 1): "Page {{page}} of {{total}}" está em `core/i18n/resources.ts`
  nos três idiomas e nenhum `.ts` ou `.tsx` a usa. Já estava morta antes da 055; vale remover numa limpeza do i18n.
- **Logotipo no tema escuro** (simplify da fase 2): o SVG tem cores fixas (esferas #005DB3, cerca de 2,6:1 sobre #1b1b1b).
  Falta uma variante escura; entra com a paleta escura nova (RN-10).
- **`logo-icone.svg` sem uso**: a Sidebar usa só o `logo-tcm.svg` (cortado no símbolo). O arquivo é um asset enviado pelo
  usuário, então fica até ele decidir apagar.
- **`alt` do logotipo**: o login diz "TCM" (um e2e depende disso) e a Sidebar diz "Test Case Manager". Padronizar numa
  limpeza, junto com a tradução do texto.
- **Imagens do login baixadas em dobro** (code-review): a ilustração clara (60KB) e a escura (22KB) são buscadas mesmo com uma
  escondida. Some quando o escuro ganhar a ilustração nova.
- **Hash do escuro opaco** (code-review): `HASH_DO_ESCURO` falha sem dizer qual token mudou. Se incomodar, trocar por um snapshot
  legível dos tokens, na spec da paleta escura.
- **Total só para leitor de tela** (code-review): sem o total, a mudança de resultados do filtro deixa de ser anunciada. A ADR 0045
  recusou a alternativa; reabrir se o uso real pedir.

## Ajuste de 2026-11-03: cores do login e da troca de senha

Pedido do usuário, com os frames do login claro e escuro (`login-light-mode.svg` e `login-dark-mode.svg`) e a lista de
cores. **Exceção à RN-10 (tema escuro não muda):** o login e a troca de senha ganham uma paleta escura própria.
- Tokens `--auth-*` (claro e escuro) em `core/global.css`, lidos só por `AuthLayout`, `LoginPage` e `AlterarSenhaPage`; o
  resto do tema escuro continua igual (o teste do hash ignora só os `--auth-*`, e eles têm teste próprio).
- Ilustração e fundo escuros novos; a ilustração clara trocou `#454442` por `#303030`; o `login.svg` antigo saiu.
- Lua nova no botão de tema escuro (`DarkModeIcon`, do `icon-dark-mode.svg`), em qualquer tela que use o `ThemeToggle`.
- Linha vertical entre o botão de tema e o de idioma, como nos frames.
- Fundo da ilustração como imagem pronta (`background-illustration-login*.webp`, 11 KB e 8 KB), gerada por
  `frontend/scripts/rasterizar-fundo-login.cjs` a partir dos SVGs do Figma. Os SVGs usam desfoques enormes e um
  `backdrop-filter` (o "vidro"): como imagem de fundo o navegador perde o vidro (as manchas ficavam três vezes mais
  fortes que no frame), e rasterizá-los custava centenas de ms. Refazer o script quando o Figma exportar de novo.
- Transição de tema (spec 049) no login: as ilustrações e o fundo se dissolvem por opacidade (`opacity` entrou na lista
  da `.trocando-tema`), e o quadriculado da Timeline também (`dark:opacity-0` no lugar de `dark:bg-none`). Antes,
  `display` e imagem de fundo não têm transição e davam um salto. A camada que sai fica com 1% e como camada própria,
  com base de cor fixa. Medido no Chromium, a maior lacuna entre quadros na troca caiu de 887 ms para 27 ms (6 quadros
  contra 74 em 1,2 s); o e2e guarda o limite de 250 ms.
- Linha clara na borda curva do cartão lateral, no escuro (anti-aliasing duplo): com a camada de fundo clara opaca por
  baixo da escura, os pixels suavizados da curva deixam o branco passar. As duas camadas se dissolvem de forma simétrica
  (a clara vai a 1% no escuro) e só o `aside` faz o recorte arredondado. Conferido nos quatro cantos, nos dois temas.
- Contraste, por decisão do protótipo: o subtítulo claro `#7e7e7e` mede 4,05:1 sobre o branco (abaixo do AA de 4,5:1) e o
  título claro `#0081f9` mede 3,8:1 (texto grande, mínimo 3:1); a borda do campo `#f2f2f2` sobre branco é decorativa.
- Botão "Sign in" e fundo da página, igualados ao frame a pedido do usuário (também na troca de senha): tokens
  `--auth-botao` (`#0081f9` no claro, `#0c8aff` no escuro), `--auth-botao-hover`, `--auth-botao-texto` (branco) e
  `--auth-pagina` (`#fbfbfb` no claro, `#000000` no escuro). O fundo escuro do resto do app continua `#0a0a0a`.
  Contraste, por decisão do protótipo: o texto branco do botão mede 3,8:1 no claro e 3,45:1 no escuro (abaixo do AA de
  4,5:1 para texto de 15px); o hover foi escurecido para passar de 4,5:1.
- A ilustração do login desce 56px (`top-14`), como no protótipo.

## Ajuste de 2026-11-04: paleta do login em todas as telas

Pedido do usuário, a partir dos frames da Timeline (claro e escuro) e do login: o app inteiro usa a paleta do login. Só
tokens do `global.css` mudaram (ADR 0041), então todas as telas acompanham.

- Escuro: página `#000000`; cartões, Sidebar e busca `#0f0f0f`; bordas, linhas e campos `#1b1b1b`; borda do campo
  `#262626`; texto `#ffffff`; apoio `#b5b5b5`; azul (títulos, item ativo, botões) `#0c8aff`; fundo do item ativo da
  Sidebar `#081d32`. Moldura e cabeçalho da tabela `#1b1b1b`, corpo `#0f0f0f`. Menus e drawers `#1b1b1b`.
- Claro: azul `#0081f9` (era `#006cd1`) e texto de apoio `#7e7e7e` (era `#6d6d6d`). O resto já era o do protótipo.
- Novo token `--elevado` (`#ffffff` no claro, `#1f1f1f` no escuro): o card da Timeline sobre o cartão da página.
- A lista do usuário traz `#0C8AFF` também para o claro, mas o login claro e o frame da Timeline claro usam `#0081f9`;
  segui o frame. Para trocar, é o `--accent` e o `--primary` do `:root`.
- Contraste, por decisão do protótipo: no claro, o azul mede 3,81:1 sobre o branco, 3,49:1 sobre o painel e 3,38:1 sobre
  o item ativo, e o apoio `#7e7e7e` mede 4,05:1 (abaixo do AA para texto pequeno). No escuro, o texto branco sobre o
  botão azul mede 3,45:1. O teste do claro passou de 4,5:1 para um piso de 3,3:1.
- Fora deste ajuste: Board, Projects, General Results e demais telas não têm frame escuro; só herdam os tokens. Os cards do
  Board e as cores de etiquetas e status ficaram como estavam.

## Ajuste de 2026-11-04: tamanhos, nomes e responsividade

- Botões da coluna Actions (e o ícone de notes dos excluídos) maiores em todas as tabelas.
- Board e Timeline mostram só o nome do App (Clock, não Clock 9.5); os cards do Board ficaram mais largos (280 px).
- Automation Level: a tabela mostra só 1, 2 ou 3; os rótulos "1 - Not automatable", "2 - Partially automatable" e
  "3 - Automatable" aparecem no seletor.
- Troca de tema mais suave: 800 ms (`DURACAO_TROCA_MS` no `use-theme.ts` e `transition-duration` no `global.css`).
- Responsividade: a barra lateral abre recolhida abaixo de 1024 px e o cartão da página usa margem menor em tablets.
  Em celulares a área de conteúdo ainda é estreita; um menu sobreposto seria o próximo passo.
