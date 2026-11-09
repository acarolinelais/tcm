# 035. Exportar tabelas para Excel: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: base compartilhada
- [x] **T01. Gerar planilha e buscar todas as páginas**
  - Arquivos: `frontend/src/shared/lib/exportar-planilha.ts`, `exportar-planilha.test.ts`
  - Cobre: CA-01, CA-02, CA-04, CA-05, CA-08
  - Verificação: `cd frontend && npm test -- exportar-planilha` → verde
- [x] **T02. Hook `useExportarTabela`**
  - Arquivos: `frontend/src/shared/lib/use-exportar-tabela.ts`, `use-exportar-tabela.test.ts`
  - Cobre: CA-03, CA-08, CA-09, CA-10
  - Verificação: `cd frontend && npm test -- use-exportar-tabela` → verde
- [x] **T03. Coluna exportável, botão "Exportar" e textos**
  - Arquivos: `frontend/src/shared/ui/data-table.tsx`, `shared/ui/data-table-export.tsx`, `data-table-export.test.tsx`,
    `core/i18n/resources.ts`
  - Cobre: CA-06, CA-07, CA-09
  - Verificação: `cd frontend && npm test -- data-table-export` → verde

## Fase 2: telas de administração
- [x] **T04. Usuários (+ e2e)**
  - Arquivos: `usuarios/components/UsuariosTable.tsx`, `usuarios/pages/UsuariosPage.tsx`, testes da tela,
    `frontend/e2e/usuarios.spec.ts`
  - Cobre: CA-03, CA-05, CA-06
  - Verificação: `cd frontend && npm test -- usuarios && npx playwright test usuarios` → verde
- [x] **T05. Setores**
  - Arquivos: `setores/pages/SetoresPage.tsx` e teste
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- SetoresPage` → verde
- [x] **T06. Times e Membros do time**
  - Arquivos: `times/pages/TimesPage.tsx`, `times/pages/TimeDetalhePage.tsx` e testes
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- times` → verde
- [x] **T07. Perfis e Modelos de dispositivo**
  - Arquivos: `perfis/pages/PerfisPage.tsx`, `modelos-dispositivo/pages/ModelosDispositivoPage.tsx` e testes
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- PerfisPage ModelosDispositivoPage` → verde

## Fase 3: telas de projetos
- [x] **T08. Projetos e Test Cases**
  - Arquivos: `projetos/pages/ProjetosPage.tsx`, `projetos/pages/ProjetoDetalhePage.tsx` e testes
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- ProjetosPage ProjetoDetalhePage` → verde
- [x] **T09. Form Factor e resultados de Form Factor**
  - Arquivos: `projetos/components/form-factor/FormFactorTabela.tsx`, `FormFactorResultadosTabela.tsx` e testes
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- form-factor` → verde
- [x] **T10. Resultados Gerais**
  - Arquivos: `projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx`, `ResultadosGeraisPage.tsx` e testes
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- resultados-gerais ResultadosGeraisPage` → verde
- [x] **T11. Coluna "Atualizado em" em Projetos** (pedido na revisão da spec)
  - A tabela de Projetos ganha a coluna com filtro por dia, igual a "Criado em", e ela vai para a planilha.
    Projeto nunca editado mostra "—".
  - Arquivos: `projetos/pages/ProjetosPage.tsx` e teste
  - Cobre: CA-06
  - Verificação: `cd frontend && npm test -- ProjetosPage` → verde

## Backlog
- ~~`downloadTemplate` em `ProjetosPage.tsx` repete o download da planilha~~ — resolvido na code-review: passou a
  usar `baixarPlanilha`.
- Setores e Times buscam gerentes/membros com uma chamada por linha (na tela e em "Todos os itens"). Um endpoint em
  lote (ex.: `GET /api/setores/gerentes?ids=`) evitaria o N+1. Fora do escopo: mexe no backend (simplify do bloco 2).
- O rótulo Ativo/Inativo (`t(ativo ? "active" : "inactive")`) e as opções do filtro de status se repetem em Usuários,
  Setores, Times e Modelos. Um helper em `shared/lib/opcoes.ts` unificaria; fica para uma limpeza geral porque o
  código das opções é anterior à spec (simplify do bloco 2).
- As duas tabelas de Form Factor mostram a data em formatos diferentes (só data no Resumo; data e hora em Results), e a
  planilha herda isso. Padronizar é decisão de UI anterior à spec (simplify do bloco 3).
- **Code-review da spec, não corrigidos:**
  - "Página atual" durante a troca de filtro em telas com `placeholderData` (Modelos, Resultados Gerais) exporta as
    linhas anteriores até a resposta chegar. Desabilitar o botão enquanto `isPlaceholderData` resolveria; precisa de
    uma prop a mais na `DataTable`.
  - Em Projetos e Test Cases o filtro local age só sobre a página; com a página sem resultado, o botão fica
    desabilitado mesmo havendo itens filtrados em outras páginas. É a mesma limitação da listagem (filtro local por
    página), anterior à spec; resolve-se levando esses filtros para o servidor.
  - `buscarTodasAsPaginas` busca as páginas uma por vez e com offset: lento em listagens grandes e sujeito a
    duplicar ou pular itens se a lista mudar durante a busca (risco aceito no ADR 0042). Buscar as páginas 2..N em
    paralelo com limite de concorrência é a melhoria natural.
