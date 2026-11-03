# 055. Fundação visual do redesign: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 e 0037 (HeroUI como base de UI; só HeroUI nas telas redesenhadas), 0022 e 0034
  (padrão universal de tabelas), 0040 (tema claro e escuro por classe), 0041 (cor só por token), 0045 (tabelas sem
  total)
- **ADRs novos propostos:** nenhum (a 0045 já cobre o rodapé sem total)

## Abordagem

Só frontend; backend, banco e API não mudam. A identidade nova entra pelos **tokens** de `core/global.css`
(ADR 0041), só no bloco do tema claro: o escuro fica intacto (RN-10), e o teste `cores-por-token` continua
barrando cor fixa. A mudança é feita nos componentes compartilhados (`Sidebar`, `AuthLayout`, `PageTitle`,
`estadoDaTabela`, `DataTablePagination`), e as telas herdam. O que sobra são pontos soltos que repetem o padrão por
conta própria: títulos `h1` locais e o estado vazio do dev. Ordem: tokens e logotipo, sidebars e login, título azul,
estado vazio, rodapé sem total e, no fim, a conferência por perfil e por idioma.

## Modelo de dados
Sem mudança.

## Contrato da API
Sem mudança.

## Backend: arquivos
Nenhum.

## Frontend: arquivos

**Tokens e assets**
- `core/global.css`: no `:root` (claro), troca `--accent`, `--accent-text`, `--accent-tint`, `--primary`/`--ring`
  (par shadcn), `--body`, `--subtle` e `--panel` pelos valores do Figma, escurecidos só o mínimo para passar no AA
  (mesma regra da spec 050). Os valores vêm de `get_variable_defs` nos frames de login e sidebar. Nada em
  `:root.dark`.
- `shared/assets/figma/icons/`: logotipo novo (símbolo e versão com o nome), exportado do Figma. Substitui
  `logo-icone.svg` e `logo-tcm.svg`.
- `core/layout/sidebar-icons.tsx` e `shared/ui/figma-icons.tsx`: ícones com a espessura de traço do protótipo.

**Layout compartilhado**
- `core/layout/Sidebar.tsx`: o topo passa a mostrar o logotipo com o nome (aberta) e só o símbolo (recolhida), no
  lugar do texto "TCM". O destaque do item ativo e a cor do ícone já saem de `--accent-tint` e
  `--accent-soft-foreground`; só confere. Os itens por perfil não mudam.
- `core/auth/AuthLayout.tsx` e `core/auth/LoginPage.tsx`: logotipo, título, espaçamento entre letras, ícone do
  olho e cores do frame. A ilustração `login.svg` só é trocada se o frame trouxer outra.
- `shared/ui/page-card.tsx` (`PageTitle`): `text-body` vira `text-accent-text`.
- `h1` locais que não usam o `PageTitle`: `ProjetosPage.tsx` (dois), `OverviewHeroCard.tsx` e `OverviewPage.tsx`,
  `ProjetoSwitcher.tsx`, `EmBreve.tsx`. Passam a usar `PageTitle` ou a mesma cor. `ConfiguracoesPage.tsx` e
  `AuthLayout.tsx` já são azuis.

**Estado vazio**
- `shared/ui/data-table-state.tsx` (`estadoDaTabela`): painel cinza (`bg-panel`), ícone azul sem o círculo, título
  e frase de apoio como no frame. O estado "com filtro" mantém o botão de limpar.
- `modules/projetos/components/ProjetosDevEmptyState.tsx`: usa o mesmo padrão (hoje é uma cópia própria). Deixa
  de ser `h1`, para não duplicar o título da página.
- Telas com vazio próprio fora do `estadoDaTabela` (`OverviewPage.tsx`, Board e General Results): o plano de
  tarefas confere cada uma. As telas de Board, Timeline, Projects e General Results só ganham o padrão aqui; o
  layout delas vem nas specs 056 a 059.

**Rodapé sem total (ADR 0045)**
- `shared/ui/data-table-pagination.tsx`: remove o `<span>` do total. Mantém `totalCount` (calcula as páginas),
  o seletor de itens e a paginação.
- `core/i18n/resources.ts`: remove `totalItems` em en, pt e ko.
- `shared/ui/data-table-export.tsx` e `data-table.tsx`: confere a posição do botão Exportar, que passa a abrir o
  rodapé à esquerda.
- Testes que citam o total: `data-table-pagination.test.tsx`, `HistoricoProjetoTabela.test.tsx`,
  `PreviaPlanilha.test.tsx`, `e2e/resultados-gerais.spec.ts` e `e2e/projetos-importacao.spec.ts`.

**Teams**
- `modules/times/pages/TimesPage.tsx` e `TimeDetalhePage.tsx`: só cor de fonte, que vem dos tokens e do
  `PageTitle`. Confere os frames 2552:4919 e 2552:5086.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | e2e | `e2e/identidade-visual.spec.ts` (novo): o login mostra logotipo, título, campos e botão do frame (`toHaveScreenshot` ou asserções de papel e nome) |
| CA-02 (falha) | Unidade | `LoginPage.test.tsx`: credenciais recusadas mostram o erro (`role="alert"`) e mantêm o e-mail digitado |
| CA-03 | Unidade | `Sidebar.test.tsx`: um caso por perfil (admin, gerente, KP, dev) confere o logotipo e os itens de hoje |
| CA-04 | Unidade | `Sidebar.test.tsx`: o link da página aberta tem `aria-current="page"` e a classe do destaque; os outros não |
| CA-05 | Unidade | `Sidebar.test.tsx`: recolhida, o nome do produto some e o símbolo e os ícones ficam |
| CA-06 | Unidade | `data-table-pagination.test.tsx`: não há texto de total; o seletor e a paginação continuam e a página 2 funciona |
| CA-07 (falha) | Unidade | `data-table-state.test.tsx` (novo): vazio com filtro mostra o botão de limpar e nenhum total |
| CA-08 | Unidade | `ProjetosPage.test.tsx`: dev sem projetos vê o estado vazio com título e frase |
| CA-09 | Unidade | `UsuariosTable`, `SetoresPage` e `ModelosDispositivoPage` (testes existentes): o vazio usa o padrão novo |
| CA-10 | Unidade | `TimesPage.test.tsx`: o título é azul e o rodapé não tem total |
| CA-11 | e2e | `e2e/identidade-visual.spec.ts`: login, sidebar e um estado vazio nos três idiomas, sem texto cortado (`scrollWidth <= clientWidth`) |
| CA-12 | e2e | `e2e/identidade-visual.spec.ts`: percorrer o login e a sidebar só com Tab mostra o foco em cada controle |
| CA-13 | Unidade | `page-card.test.tsx` (novo): `PageTitle` usa o token de acento; um teste varre os `h1` de `src/` fora do `PageTitle` |
| CA-14 | Unidade | `contraste-tema-escuro.test.ts` e `cores-por-token.test.ts` seguem verdes; um teste novo compara os tokens de `:root.dark` com os de antes |

## Riscos e decisões pendentes
- **Figma MCP no limite do plano:** na hora de pegar os valores dos tokens (`get_variable_defs`), a chamada voltou
  "limite de chamadas do plano Starter". Os hex exatos e o logotipo novo ainda precisam ser lidos ou exportados do
  Figma. Sem isso, a primeira task fica bloqueada. Alternativas: esperar o limite renovar, ou você exportar o
  logotipo em SVG e os tokens do frame.
- **Contraste do azul novo:** o azul do protótipo, com texto branco, pode ficar abaixo de 4,5:1 (AA). Segue a
  regra da spec 050: escurecer o mínimo, registrar o hex do Figma em comentário e medir no teste de contraste.
- **Rodapé sem total e acessibilidade:** o total era a única região `aria-live` do rodapé. Sem ela, a troca de
  página não é anunciada. Mitigação: manter o `aria-current` na página atual (já existe) e conferir no leitor.
- **Prévia da planilha:** usa o mesmo `DataTablePagination`, então perde o total também. O Figma não mostra essa
  tela; seguimos a ADR 0045 (todas as tabelas).
- **Telas sem frame:** Overview, Administration e o restante herdam por token. Uma revisão visual por perfil, no
  fim, pega o que escapou. As specs 056 a 059 refinam Board, Timeline, Projects e General Results.
- **Tamanho:** a spec toca muitos arquivos, mas quase todos por uma troca de token ou por um componente
  compartilhado. Se o diff passar de uma revisão confortável, a divisão natural é "tokens, sidebar e login" e
  "estado vazio e rodapé".
