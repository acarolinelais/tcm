# 034. Tema claro e escuro: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Mecanismo do tema e toggle
- [x] **T01. Tokens escuros e variante `dark` sem fallback do sistema**
  - Arquivos: `frontend/src/core/global.css`
  - Cobre: CA-01, CA-06
  - Detalhe: `@custom-variant dark` sem `prefers-color-scheme`; bloco `.dark` com os tokens sobrescritos em
    `:root` e os do shadcn; tokens do projeto (`--text-body`, `--text-subtle`, `--panel`, `--avatar`) nos dois
    temas e no `@theme inline`.
  - Verificação: `cd frontend && npm run build` → sem erros
- [x] **T02. Ler, gravar e aplicar o tema**
  - Arquivos: `frontend/src/core/theme/use-theme.ts` (a simplify juntou o `theme.ts` aqui)
  - Cobre: CA-01, CA-09, CA-10
  - Detalhe: `THEME_KEY = "sdf.theme"`, `lerTema`, `gravarTema`, `aplicarTema`. Testes: sem valor → `light`;
    valor inválido → `light`; `localStorage` lançando erro na leitura e na gravação → sem exceção e tema aplicado.
  - Verificação: `cd frontend && npx vitest run src/core/theme` → verde
- [x] **T03. Script inline anti-flash no `index.html`**
  - Arquivos: `frontend/index.html`, `frontend/src/core/theme/index-html.test.ts`
  - Cobre: CA-05, CA-09
  - Detalhe: o teste extrai o script do `index.html`, executa no jsdom e confere: `dark` guardado → classe
    aplicada; valor inválido ou storage bloqueado → sem classe e sem erro; a chave é a mesma `THEME_KEY`.
  - Verificação: `cd frontend && npx vitest run src/core/theme/index-html.test.ts` → verde
- [x] **T04. Hook `useTheme` e componente `ThemeToggle`**
  - Arquivos: `frontend/src/core/theme/use-theme.ts`, `ThemeToggle.tsx`, `ThemeToggle.test.tsx`,
    `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-02, CA-03, CA-08
  - Detalhe: botão com `Sun`/`Moon`, `aria-pressed` e nome `darkTheme` nos três idiomas. Testes: claro →
    escuro → claro; `Enter` e `Espaço`; nome em cada idioma; storage bloqueado não impede a troca.
  - Verificação: `cd frontend && npx vitest run src/core/theme src/core/i18n` → verde
- [x] **T05. Toggle no navbar e na tela de login**
  - Arquivos: `frontend/src/core/layout/Navbar.tsx`, `Navbar.test.tsx`, `frontend/src/core/auth/LoginPage.tsx`
    e o teste dela
  - Cobre: CA-02, CA-04
  - Detalhe: `ThemeToggle` ao lado do `LanguageSelector`; cores fixas dos dois arquivos viram tokens.
  - Verificação: `cd frontend && npx vitest run src/core/layout src/core/auth` → verde

## Fase 2: Cores fixas para tokens (ADR 0041)
- [x] **T06. Teste de varredura de cores fixas**
  - Arquivos: `frontend/src/core/theme/cores-por-token.test.ts`
  - Cobre: CA-06
  - Detalhe: varre `src/` (fora `*.test.*`) atrás de `[#hex]`, paleta crua do Tailwind e hex/`rgb()` em
    `style`. Começa com uma lista de arquivos pendentes, que cada task desta fase esvazia. Falha: um trecho
    fixo de exemplo é detectado com arquivo e linha.
  - Verificação: `cd frontend && npx vitest run src/core/theme/cores-por-token.test.ts` → verde
- [x] **T07. Layout**
  - Arquivos: `frontend/src/core/layout/Sidebar.tsx`, `AppLayout.tsx`, `EmBreve.tsx` e testes afetados
  - Cobre: CA-06
  - Verificação: `cd frontend && npx vitest run src/core` → verde
- [x] **T08. Tabela compartilhada**
  - Arquivos: `frontend/src/shared/ui/data-table.tsx`, `data-table-pagination.tsx`, `data-table-filter.tsx`,
    `data-table-state.tsx`, `row-action-button.tsx`, `inline-select.tsx`, `tag-chip.tsx` e testes afetados
  - Cobre: CA-06
  - Verificação: `cd frontend && npx vitest run src/shared src/core/theme` → verde
- [x] **T09. Demais componentes compartilhados**
  - Arquivos: `frontend/src/shared/ui/week-picker-hero.tsx`, `page-tabs.tsx`, `page-card.tsx`, `form-field.tsx`,
    `dialog.tsx`, `side-drawer.tsx`, `skeleton.tsx`, `retry-alert.tsx`, `multi-select-combobox.tsx`,
    `alert-confirm.tsx` e testes afetados
  - Cobre: CA-06
  - Verificação: `cd frontend && npx vitest run src/shared src/core/theme` → verde
- [x] **T10. Status de projetos e Test Cases**
  - Arquivos: `frontend/src/core/global.css` (tokens `--status-*`), `modules/projetos/components/status/*`
  - Cobre: CA-06
  - Verificação: `cd frontend && npx vitest run src/modules/projetos src/core/theme` → verde
- [x] **T11. Importação de planilha**
  - Arquivos: `modules/projetos/components/importacao/UploadPlanilha.tsx`, `icones-importacao.tsx`,
    `PreviaPlanilha.tsx`; `.dropzone-tracejada` no `global.css`
  - Cobre: CA-06
  - Verificação: `cd frontend && npx vitest run src/modules/projetos src/core/theme` → verde
- [x] **T12. Demais telas de projetos**
  - Arquivos: `modules/projetos/pages/*`, `components/ProjetosDevEmptyState.tsx`, `ProjetoSwitcher.tsx`,
    `form-factor/*`, `resultados-gerais/*`, `casos-teste/*`
  - Cobre: CA-06
  - Verificação: `cd frontend && npx vitest run src/modules/projetos src/core/theme` → verde
- [x] **T13. Overview, demais módulos, CSS utilitário e fim da lista pendente**
  - Arquivos: `modules/overview/components/*` (`--chart-1..5`), `modules/times/pages/*`,
    `modules/perfis/pages/PerfisPage.tsx`, `modules/configuracoes/pages/ConfiguracoesPage.tsx`,
    `modules/setores/components/EditarSetorDrawer.tsx`; `.thin-scroll` e overlay no `global.css`; remove a
    lista pendente do teste de varredura
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test && npm run lint && npm run build` → verde, sem lista pendente

## Fase 3: Ponta a ponta, revisão visual e documentação
- [x] **T14. E2E do tema com contraste**
  - Arquivos: `frontend/e2e/tema.spec.ts`, `frontend/package.json` (`@axe-core/playwright`)
  - Cobre: CA-01, CA-02, CA-04, CA-05, CA-06, CA-07, CA-09, CA-11
  - Detalhe: sistema escuro abre claro; alterna no login e continua após autenticar; alterna no navbar sem
    perder o texto da busca; `main.tsx` bloqueado e `<html>` já com `dark`; valor inválido abre claro; rotas
    principais no escuro sem fundo branco; axe `color-contrast` nos dois temas; rota protegida, sessão e
    idioma intactos após trocar.
  - Verificação: `cd frontend && npm run e2e -- tema.spec.ts` → verde (API no ar)
- [x] **T15. Revisão visual no escuro e ilustrações**
  - Arquivos: SVGs em `frontend/src/shared/assets/figma/` que não funcionarem no escuro; ajustes de tokens
  - Cobre: CA-06, CA-07
  - Verificação: `cd frontend && npm test && npm run build` → verde
- [x] **T16. Regra de cores na skill `react-crud`**
  - Arquivos: `.claude/skills/react-crud/SKILL.md`
  - Cobre: — (ADR 0041)
  - Verificação: `git diff --check` → sem erros

## Backlog
- **Derivar os tons de etiqueta numa regra só:** os blocos `--etiqueta-*`, `--projeto-*` e `--status-*` do
  `global.css` repetem a mesma fórmula do escuro por token (~60 linhas). Uma classe base no `TagChip`/badge com
  `--tom` reduziria isso, mas mexe no contrato do `TagChip` usado por outras specs. Origem: simplify da Fase 2.
- **Credenciais do admin duplicadas em `e2e/form-factor-rodadas.spec.ts:29`:** passar a usar `adminEmail`/`adminSenha`
  de `api-fixtures.ts`. Fora do escopo desta spec. Origem: simplify da Fase 3.
- **Testes lentos sob carga** (`PerfisPage`, `ProjetosPage`, `UsuarioDrawer`, `CasoTesteDrawer`): falham por timeout
  às vezes na suíte completa e passam isolados. Já acontecia antes desta spec.
