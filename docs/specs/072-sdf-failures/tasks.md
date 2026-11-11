# 072. SDF Failures: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> Comandos do backend rodam em `backend/`; os do frontend, em `frontend/`.

## Fase 1: regra de falha e Done

- [x] **T01. `eh_falha` no domínio**
  - Arquivos: `src/domain/entities/resultado_form_factor.py`, `tests/unit/domain/test_resultado_form_factor.py`
  - O que: `NAO_FALHA = {"PASS", "N/A", "NA", "CHECK"}` e `eh_falha(resultado)` com `upper(strip())`.
  - Cobre: CA-03, CA-04 (regra)
  - Verificação: `uv run pytest tests/unit/domain/test_resultado_form_factor.py -q` → verde
- [x] **T02. Importação: falha leva In Validation para In Fixes**
  - Arquivos: `src/application/services/importacao_sdf_service.py`,
    `tests/unit/application/services/test_importacao_sdf_service.py`
  - O que: `com_fail` usa `eh_falha` no lugar de `== "FAIL"`.
  - Cobre: CA-06
  - Verificação: `uv run pytest tests/unit/application/services/test_importacao_sdf_service.py -q` → verde
- [x] **T03. "Todos passaram" aceita N/A e Check**
  - Arquivos: `src/infrastructure/repositories/caso_teste_repository.py` (`_aprovados` e o comentário da g065),
    `tests/integration/test_caso_teste_todos_aprovados.py`
  - O que: `bool_and(upper(trim(resultado)) IN NAO_FALHA)`, com a lista vinda do domínio.
  - Cobre: CA-07
  - Verificação: `uv run pytest tests/integration/test_caso_teste_todos_aprovados.py tests/integration/test_importacao_sdf_fluxo.py -q` → verde

## Fase 2: Dev Fix e correção concluída

- [x] **T04. Migration e models**
  - Arquivos: `src/infrastructure/data/migrations/versions/g072a1b2c3d4_dev_fix_e_correcao.py`,
    `src/infrastructure/data/models/caso_teste_model.py`, `importacao_sdf_status_model.py`,
    `tests/integration/test_migration_dev_fix.py`
  - O que: `casos_teste.dev_fix_id` (FK, nulo), `casos_teste.dev_fix_em`, `importacoes_sdf_status.concluiu_correcao`
    (padrão `false`); `down_revision` no head atual.
  - Verificação: `uv run pytest tests/integration/test_migration_dev_fix.py -q` → verde; `uv run alembic heads` → um head
- [x] **T05. Dev Fix na entidade e no repositório do caso**
  - Arquivos: `src/domain/entities/caso_teste.py`, `src/infrastructure/repositories/caso_teste_repository.py`
    (mapeamento), `tests/unit/domain/test_caso_teste.py`
  - O que: `dev_fix_id`, `dev_fix_em` e `definir_dev_fix(usuario_id | None, agora)`, que não mexe em Status nem
    responsável; remover zera os dois.
  - Cobre: CA-11 (regra), RN-18
  - Verificação: `uv run pytest tests/unit/domain/test_caso_teste.py -q` → verde
- [x] **T06. Dev Fix pelo `PUT /api/test-cases/{id}`**
  - Arquivos: `src/application/services/caso_teste_service.py`, `src/application/schemas/caso_teste.py`,
    `tests/unit/application/services/test_caso_teste_service.py`, `tests/functional/test_casos_teste_api.py`
  - O que: `dev_fix_id` em `CAMPOS_GESTAO` e no response; `_garantir_membro` quando não é nulo.
  - Cobre: CA-11, CA-12, CA-13, CA-14
  - Verificação: `uv run pytest tests/unit/application/services/test_caso_teste_service.py tests/functional/test_casos_teste_api.py -q` → verde
- [x] **T07. Correção concluída na importação**
  - Arquivos: `src/domain/entities/importacao_sdf_status.py`,
    `src/domain/entities/interfaces/importacao_sdf_status_repository.py`,
    `src/infrastructure/repositories/importacao_sdf_status_repository.py`
    (`entrou_em_validacao_depois_do_dev_fix`, com o corte no mesmo SQL),
    `src/application/services/importacao_sdf_service.py`, `tests/integration/test_importacao_sdf_fluxo.py`,
    `tests/unit/application/services/test_importacao_sdf_service.py`
  - O que: para cada caso que a importação levou a Done, `concluiu_correcao` quando há Dev Fix e uma entrada em In
    Validation depois de `max(dev_fix_em, corte)`, sem a origem `IMPORTACAO_SDF_DESFEITA`.
  - Cobre: CA-15, CA-16, CA-17 (marcação)
  - Verificação: `uv run pytest tests/integration/test_importacao_sdf_fluxo.py tests/unit/application/services/test_importacao_sdf_service.py -q` → verde

## Fase 3: lista por caso

- [x] **T08. Consulta dos casos com falhas**
  - Arquivos: `src/domain/queries/bug_report.py`, `src/domain/entities/interfaces/bug_report_repository.py`,
    `src/infrastructure/repositories/bug_report_repository.py`, `tests/integration/test_bug_report_repository.py`
  - O que: página de casos ordenada pela falha visível mais recente e as falhas desses casos; corte por importação
    ativa com `concluiu_correcao`; filtros de device, Dev Fix, Dev Owner, dia e semana; o dev vê responsável,
    backup ou Dev Fix.
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05, CA-08, CA-09, CA-15, CA-16, CA-17, CA-19, CA-20; desfazer a
    importação traz as falhas de volta
  - Verificação: `uv run pytest tests/integration/test_bug_report_repository.py -q` → verde
- [x] **T09. Service, schemas e rota**
  - Arquivos: `src/application/services/bug_report_service.py` e a interface, `src/application/schemas/bug_report.py`,
    `src/api/routers/bug_reports.py`, `tests/unit/application/services/test_bug_report_service.py`,
    `tests/functional/test_bug_reports_api.py`
  - O que: `projeto_id` obrigatório, `dia`/`semana` pelo `validators/semana.py`, mapeamento manual. Projeto fora
    do escopo devolve a lista vazia (a consulta já filtra pelo escopo), sem o 404 do plano.
  - Cobre: CA-01, CA-18 (200 com um item por caso, 401 sem sessão, 422 sem `projeto_id`)
  - Verificação: `uv run pytest tests/unit/application/services/test_bug_report_service.py tests/functional/test_bug_reports_api.py -q` → verde; `uv run ruff check .` → sem erros

## Fase 4: frontend

- [x] **T10. Modelo, API, hook e modo mock**
  - Arquivos: `src/modules/bug-reports/model/bug-report.ts`, `api/bug-reports.api.ts` e teste, `hooks/useBugReports.ts`,
    `src/modules/projetos/model/projeto.ts` (`dev_fix_id`), `src/core/mock/database.ts`, `src/core/mock/bug-reports.test.ts`
  - O que: tipos `CasoComFalhas` e `FalhaSdf`, parâmetros novos, e no mock `eh_falha`, o Dev Fix e o corte.
  - Cobre: base para CA-01 a CA-20
  - Verificação: `npx vitest run src/modules/bug-reports src/core/mock && npx tsc -b` → verde
- [x] **T11. Página SDF Failures: topo e colunas**
  - Arquivos: `src/modules/bug-reports/pages/BugReportsPage.tsx` e teste, `src/core/layout/Sidebar.tsx` e teste,
    `src/core/i18n/resources.ts`
  - O que: título e menu SDF Failures; `ProjetoSwitcher`/`useProjetosSeletor`; `WeekPickerHero permitirDia`; colunas
    da RN-10; Description com `RowActionButton` e o modal do Notes.
  - Cobre: CA-01, CA-08, CA-09, CA-10
  - Verificação: `npx vitest run src/modules/bug-reports src/core/layout` → verde
- [x] **T12. Linha que expande e Dev Fix na célula**
  - Arquivos: `src/modules/bug-reports/pages/BugReportsPage.tsx` e teste,
    `src/modules/projetos/components/casos-teste/AlteracaoCasoTesteItem.tsx` e teste
  - O que: sublinhas pelo padrão do `HistoricoProjetoTabela`; `InlineSelect` com os membros ativos e "No Dev Fix",
    só para `perfilGerenciaCasos`, chamando o PUT com `{dev_fix_id}`; rótulo Dev Fix no histórico do caso.
  - Cobre: CA-05, CA-11, CA-12, CA-13, CA-14
  - Verificação: `npx vitest run src/modules/bug-reports src/modules/projetos/components/casos-teste` → verde; `npm run lint` → sem erros
- [x] **T13. E2E**
  - Arquivos: `e2e/bug-reports.spec.ts`
  - O que: KP escolhe o projeto, abre a linha, escolhe o Dev Fix e vê o nome, com o Dev Owner igual.
  - Cobre: CA-05, CA-11
  - Verificação: `npm run e2e -- bug-reports` → verde

## Backlog

- **Índice em `importacoes_sdf_status(caso_teste_id)`.** A checagem de correção concluída e o corte das falhas
  filtram por caso nessa tabela, que não tem índice na coluna. Na escala atual não pesa; entra numa migration se a
  tabela crescer (achado da simplify, Fase 2).
- **Dia ou semana num helper só.** `bug_report_service.py` e `form_factor_service.py` repetem a validação de dia e
  semana (recusar os dois, validar o fuso, montar o intervalo). Um `intervalo_dia_ou_semana` em
  `validators/semana.py` serviria aos dois; mexe no `form_factor_service`, fora da spec (simplify, Fase 3).
- **Corte das falhas escrito duas vezes.** A regra "última importação ativa com `concluiu_correcao`" está em ORM no
  `bug_report_repository.py` e em SQL no `importacao_sdf_status_repository.py`. Se a regra mudar, as duas mudam
  juntas (simplify, Fase 3).
- **Projeto da URL num hook só.** SDF Failures, Timeline e General Results repetem "carregar todas as páginas do
  seletor + `?projeto=` + primeiro aberto". Um `useProjetoDaUrl(perfil)` em `projetos/hooks` serviria às três
  (simplify, Fase 4).
- **Coluna que abre, compartilhada.** O número com a seta e o `pilha` de SDF Failures copiam o
  `HistoricoProjetoTabela`; só o `LinhaDaPilha` foi para o `shared/ui` (simplify, Fase 4).
- **Painel de texto genérico.** `DescricaoFalhaDrawer` e `JustificativaExclusaoDrawer` são quase iguais; um
  `TextoDrawer` serviria aos dois (simplify, Fase 4).
- **Período e fuso num helper.** `periodo.includes("-W") ? "semana" : "dia"` e
  `Intl.DateTimeFormat().resolvedOptions().timeZone` se repetem em várias APIs do frontend (simplify, Fase 4).
- **Relógio do `dev_fix_em`.** A data vem do relógio da API, e a auditoria usa o do Postgres. No deploy atual os
  dois rodam no mesmo servidor (ADR 0049); se o banco for para outra máquina, a checagem de correção concluída
  passa a depender da sincronia dos relógios. Derivar a data do Dev Fix da própria auditoria resolve (code-review).
- **Regra de falha em SQL num helper só.** `upper(trim(resultado)) IN NAO_FALHA` está escrita em
  `bug_report_repository.py`, `caso_teste_repository.py` (`_aprovados`) e `overview_repository.py` (`_passou`).
  Um helper de coluna em `infrastructure/data` serviria aos três (simplify, backlog da 072).
