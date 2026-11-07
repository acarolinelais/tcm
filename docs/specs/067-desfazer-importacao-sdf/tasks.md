# 067. Desfazer a última importação do relatório SDF: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 0: botão de importação (já feito na branch, falta commitar)

- [x] **T00. Import SDF report importa ao escolher o arquivo; Create test round sai da tela**
  - Arquivos: `AcoesGerenciaFormFactor.tsx` e teste, `FormFactorCriarRodadaDialog.tsx` (removido),
    `ResultadosGeraisPage.test.tsx`, `core/i18n/resources.ts`
  - Cobre: motivação da spec
  - Verificação: `npx vitest run src/modules/projetos/components/form-factor src/modules/projetos/pages` → verde

## Fase 1: domínio e dados

- [x] **T01. Regras de desfazer no domínio**
  - Arquivos: `domain/entities/importacao_sdf.py` (`desfazer`), `domain/entities/caso_teste.py`
    (`desfazer_resultado_sdf`), `domain/entities/importacao_sdf_status.py` (nova),
    `domain/queries/auditoria.py` (`IMPORTACAO_SDF_DESFEITA`), testes em `tests/unit/domain`
  - Cobre: CA-02, CA-03
  - Verificação: `uv run pytest tests/unit/domain -q` → verde
- [x] **T02. Migration e models**
  - Arquivos: `importacao_sdf_model.py` (`desfeita_por`, `desfeita_em`), `importacao_sdf_status_model.py` (novo),
    `models/__init__.py`, `migrations/env.py`, migration nova
  - Cobre: base para CA-01 a CA-06
  - Verificação: `uv run alembic heads` → um head; `uv run alembic upgrade head` e `downgrade -1` sem erro
- [x] **T03. Repositórios**
  - Arquivos: interfaces e impls de `importacao_sdf_repository.py` (`obter_ultima_ativa`, `atualizar`),
    `importacao_sdf_status_repository.py` (novo, `listar_revertiveis`),
    `caso_teste_repository.py` (`limpar_todos_aprovados`), `tests/integration/test_importacao_sdf_repositorios.py`
  - Cobre: CA-03, CA-04, CA-05
  - Verificação: `uv run pytest tests/integration/test_importacao_sdf_repositorios.py -q` → verde

## Fase 2: caso de uso e API

- [x] **T04. Importação grava o Status aplicado**
  - Arquivos: `importacao_sdf_service.py` (`importar`), `api/dependencies.py`, `test_importacao_sdf_service.py`
  - Cobre: base para CA-02
  - Verificação: `uv run pytest tests/unit -k importacao_sdf -q` → verde
- [x] **T05. `obter_ultima` e `desfazer` no service**
  - Arquivos: `importacao_sdf_service.py`, interface do service, `application/schemas/importacao_sdf.py`,
    `test_importacao_sdf_service.py`, `tests/integration/test_importacao_sdf_fluxo.py`
  - Cobre: CA-01 a CA-06, CA-08 a CA-11
  - Verificação: `uv run pytest -k "importacao_sdf" -q` → verde
- [x] **T06. Rotas**
  - Arquivos: `api/routers/projetos.py`, `tests/functional/test_relatorios_sdf_desfazer_api.py`
  - Cobre: CA-08 a CA-11 (403, 404, 409) e o caminho feliz
  - Verificação: `uv run pytest -q` → verde; `uv run ruff check .` → sem erros

## Fase 3: frontend

- [ ] **T07. Cliente HTTP e hooks**
  - Arquivos: `modules/projetos/api/projetos.api.ts` (e o modo mock), `hooks/useProjetos.ts`, `useProjetos.test.tsx`
  - Cobre: CA-05 (a importação e o desfazer invalidam a última importação), base para CA-01
  - Verificação: `npx vitest run src/modules/projetos/hooks src/modules/projetos/api` → verde
- [ ] **T08. Botão Undo last import e diálogo de confirmação**
  - Arquivos: `AcoesGerenciaFormFactor.tsx` e teste, `DesfazerImportacaoSdfDialog.tsx` (novo), `core/i18n/resources.ts`
  - Cobre: CA-01, CA-07, CA-09, CA-10
  - Verificação: `npx vitest run src/modules/projetos/components/form-factor src/core/i18n` → verde
- [ ] **T09. Origem "importação desfeita" no histórico e na Auditoria**
  - Arquivos: `AlteracaoCasoTesteItem.tsx` e teste, filtro de origem em `modules/auditoria`, `core/i18n/resources.ts`
  - Cobre: CA-02 (histórico mostra a origem)
  - Verificação: `npx vitest run src/modules/projetos/components/casos-teste src/modules/auditoria && npm run lint && npx tsc -b` → verde

## Backlog

- `tests/integration/test_usuario_user_id_persistence.py` (e talvez `test_migration_cor_avatar.py`) deixa unidades sem perfil no banco de teste; numa segunda rodada da suíte no mesmo banco o `test_bootstrap::test_migration_seed_perfil_kp_por_unidade_e_idempotente` falha. Não afeta o CI (banco novo a cada execução). Visto ao rodar a 067.
