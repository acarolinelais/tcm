# 074. Padronização da interface: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Idioma (ADRs 0054 e 0055)
- [x] **T01. Nomes dos idiomas no próprio idioma**
  - Arquivos: `frontend/src/core/i18n/resources.ts`, `frontend/src/core/i18n/resources.test.ts`,
    `frontend/src/core/i18n/LanguageSelector.test.tsx`, `frontend/src/core/auth/AlterarSenhaPage.test.tsx`,
    `frontend/src/modules/configuracoes/pages/ConfiguracoesPage.test.tsx`
  - Cobre: CA-09
  - Verificação: `cd frontend && npx vitest run src/core/i18n src/core/auth/AlterarSenhaPage.test.tsx src/modules/configuracoes` → verde
- [x] **T02. Teste do glossário: pt-BR igual ao en só nos termos do ADR 0054**
  - Arquivos: `frontend/src/core/i18n/resources.test.ts`
  - Cobre: CA-08
  - Verificação: `cd frontend && npx vitest run src/core/i18n/resources.test.ts` → verde; falha se um texto fora da
    lista ficar igual ao inglês

## Fase 2: Overview vazia
- [x] **T03. Título e frase de apoio na Overview vazia**
  - Arquivos: `frontend/src/modules/overview/pages/OverviewPage.tsx`, `frontend/src/core/i18n/resources.ts`
    (`overviewHint` em en, pt-BR e ko), `frontend/src/modules/overview/pages/OverviewPage.test.tsx`,
    `frontend/e2e/overview.spec.ts`
  - Cobre: CA-01, CA-02
  - Verificação: `cd frontend && npx vitest run src/modules/overview` → verde; e2e `npx playwright test e2e/overview.spec.ts` com a API no ar

## Fase 3: Menu do KP
- [x] **T04. Teams e Users do KP dentro de Administration**
  - Arquivos: `frontend/src/core/layout/Sidebar.tsx`, `frontend/src/core/layout/Sidebar.test.tsx`
  - Cobre: CA-03, CA-04, CA-05, CA-06, CA-07
  - Verificação: `cd frontend && npx vitest run src/core/layout` → verde

## Fase 4: Fechamento
- [x] **T05. Lint, build e suíte do frontend**
  - Arquivos: nenhum novo
  - Cobre: todos
  - Verificação: `cd frontend && npm run lint && npm test && npm run build` → verde

## Backlog
- A página Projects do dev sem projetos (`ProjetosDevEmptyState`) mostra só o vazio como título, sem o título da página e
  a frase de apoio. É o mesmo caso que a Overview tinha (RN-01), mas fica fora do escopo da 074, que só cita a Overview.
- O cabeçalho de página (título + frase de apoio) é escrito à mão em cerca de 8 páginas, com espaçamentos diferentes
  (`mb-5`, `mb-6`, `mb-[25px]`, `grid gap-2`). Board e Board Kanban usam um `<p>` próprio no lugar do `PageDescription`.
  Um `PageHeader` em `shared/ui/page-card.tsx` unificaria o padrão; mexe em várias telas, então fica para outra spec.
- O `Sidebar` repete à mão o markup do item de menu em quatro blocos (itens, Administration, Teams/Users soltos do
  gerente e Suporte); o link solto de Users perdeu o `truncate text-left`. Um `ItemNav` compartilhado tira a
  repetição. É anterior a esta spec.
- A Overview com erro de carregamento mostra só a caixa de erro, sem o título da página. Outras páginas (ex.:
  SDF Failures) repetem o cabeçalho no erro. A 074 só cobre o estado vazio (RN-01).
