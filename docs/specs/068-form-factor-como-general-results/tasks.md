# 068. Aba Form Factor com a visão da General Results: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Casos do dev, backup e rodada pendente na consulta do histórico**
  - Arquivos: `domain/queries/historico_form_factor.py`, `historico_form_factor_repository.py`,
    `resultado_form_factor_repository.py`, `tests/integration/test_historico_form_factor_repository.py`
  - Cobre: CA-02, CA-04, CA-07
  - Verificação: `uv run pytest tests/integration/test_historico_form_factor_repository.py tests/integration/test_resultado_form_factor_repository.py -q` → verde
- [x] **T02. Parâmetro `associados_a_mim` no service e na rota, campos novos no response**
  - Arquivos: `form_factor_service.py` e interface, `schemas/form_factor_historico.py`, `routers/form_factor_geral.py`,
    `test_form_factor_service.py`, `test_form_factor_geral_api.py`
  - Cobre: CA-02, CA-03
  - Verificação: `uv run pytest tests/unit/application/services/test_form_factor_service.py tests/functional/test_form_factor_geral_api.py -q` → verde

## Fase 2: frontend

- [x] **T03. Modelo, cliente HTTP e mock com o parâmetro e os campos novos**
  - Arquivos: `model/projeto.ts`, `api/projetos.api.ts` e teste, `core/mock/database.ts` e teste
  - Cobre: base para CA-02, CA-07
  - Verificação: `npx vitest run src/modules/projetos/api src/core/mock` → verde
- [x] **T04. Componente `ResultadosFormFactorProjeto` usado pela General Results**
  - Arquivos: `components/resultados-gerais/ResultadosFormFactorProjeto.tsx` (novo), `pages/ResultadosGeraisPage.tsx`
  - Cobre: CA-05, CA-06, CA-11 (a General Results segue igual)
  - Verificação: `npx vitest run src/modules/projetos/pages/ResultadosGeraisPage.test.tsx src/modules/projetos/components/resultados-gerais` → verde
- [x] **T05. Ação de registrar resultado em Actions**
  - Arquivos: `HistoricoProjetoTabela.tsx` e teste, `core/i18n/resources.ts` se precisar de texto novo
  - Cobre: CA-07, CA-08
  - Verificação: `npx vitest run src/modules/projetos/components/resultados-gerais` → verde
- [x] **T06. Aba Form Factor com a tabela nova, sem Results/Summary**
  - Arquivos: `pages/ProjetoDetalhePage.tsx` e teste; removidos `FormFactorTabela`, `FormFactorResultadosTabela`, os
    testes deles, os hooks `useFormFactor` e `useFormFactorResultados` e os textos sem uso
  - Cobre: CA-01, CA-02, CA-04, CA-09, CA-10
  - Verificação: `npx vitest run src/modules/projetos && npm run lint && npx tsc -b` → verde

## Backlog

- Backend: os endpoints `GET /api/projetos/{id}/form-factor` (Summary) e `GET /api/projetos/{id}/form-factor/results` (Results) ficaram sem tela. Remover com os services, schemas e testes deles.
- Frontend: `formFactorApi.listar`, `listarResultados` e `criarRodada`, e os tipos `FiltrosFormFactor`, `FormFactorMatriz`, `FormFactorResultados` e `CriarRodadaFormFactorInput`, ficaram sem uso na tela. O mock (`mockFormFactorApi.listar`, `listarResultados`, `criarRodada`) continua sendo usado pelos testes que montam rodadas para o registro manual; remover junto com o backend, reescrevendo esse cenário de teste.
- A aba Form Factor perdeu o atalho do TC ID para o painel do Test Case (spec 030), porque a tabela da General Results mostra o TC ID só como texto (spec 050). Se fizer falta, vira uma spec.
