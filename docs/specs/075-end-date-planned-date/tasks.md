# 075. End date e Planned date nos Test Cases: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Planilha (backend)
- [x] **T01. Coluna Planned date no validador da planilha**
  - Arquivos: `backend/src/application/validators/importacao_projeto.py`, `backend/tests/unit/test_importacao_projeto*.py`
  - Cobre: CA-02, CA-03, CA-04
  - O que faz: coluna opcional; aceita célula de data e `dd/mm/aaaa`; mesma data nas linhas preenchidas; códigos
    `data_planejada_invalida` e `data_planejada_divergente` por linha.
  - Verificação: `cd backend && uv run pytest tests/unit -k importacao_projeto` → verde
- [x] **T02. Projeto nasce com a data planejada**
  - Arquivos: `backend/src/application/services/importacao_projeto_service.py`, `backend/tests/functional/test_projetos_api.py`
  - Cobre: CA-01, CA-03
  - Verificação: `cd backend && uv run pytest tests/functional -k importar` → verde

## Fase 2: Datas da tabela (backend)
- [x] **T03. Filtros de data sobre `code_done_em`**
  - Arquivos: `backend/src/infrastructure/repositories/caso_teste_repository.py` e testes de integração
  - Cobre: CA-06, CA-09
  - Verificação: `cd backend && uv run pytest tests/integration -k caso_teste` → verde

## Fase 3: Frontend
- [x] **T04. Leitura da planilha e prévia com a Planned date**
  - Arquivos: `frontend/src/modules/projetos/utils/planilha-projeto.ts`, `planilha-projeto.worker.ts`,
    `frontend/src/modules/projetos/components/importacao/*`, `frontend/src/core/mock/database.ts`, testes, i18n
  - Cobre: CA-01 a CA-04
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/utils src/modules/projetos/components/importacao src/core/mock` → verde
- [x] **T05. Colunas End date e Planned date na aba Test Cases**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetoDetalhePage.tsx`, teste, `frontend/src/core/mock/database.ts`, i18n
  - Cobre: CA-05, CA-07, CA-08, CA-09
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages src/core/i18n` → verde
- [x] **T06. Planilha de modelo com a coluna**
  - Arquivos: `docs/planilhas-importacao/importar-projeto-clock-100-tcs.xlsx`
  - Cobre: CA-01
  - Verificação: importar no modo mock e ver a data no projeto. A coluna fica vazia na planilha de exemplo: uma data
    fixa viraria passado e a importação de demonstração passaria a falhar. O modelo baixado pela tela traz uma data
    daqui a 30 dias.

## Fase 4: e2e e fechamento
- [x] **T07. e2e da importação com Planned date**
  - Arquivos: `frontend/e2e/importacao-planilha.spec.ts`
  - Cobre: CA-01, CA-03
  - Verificação: `cd frontend && npx playwright test e2e/importacao-planilha.spec.ts` com a API no ar → verde
- [x] **T08. Suítes, lint e build**
  - Verificação: `cd backend && uv run ruff check . && uv run pytest`; `cd frontend && npm run lint && npm test && npm run build` → verde

## Backlog
- O validador da planilha repete a regra de intervalo da data planejada (`Projeto.definir_data_planejada`, spec 071),
  reaproveitando só a constante. Um `Projeto.limite_data_planejada(hoje)` usado pelas duas camadas tira a regra
  duplicada; mexe no domínio, fora desta spec.
- A prévia decide o "hoje" ao ler o arquivo e o backend decide ao importar: uma planilha com Planned date igual a hoje,
  lida antes da meia-noite e enviada depois, é aceita na prévia e recusada na importação. Raro; o erro aparece por
  linha como os outros.
- A importação agora valida o fuso do navegador mesmo sem a coluna Planned date. Um fuso desconhecido pelo servidor
  (tzdata antigo) recusaria uma importação que antes passava. Se acontecer, calcular o "hoje" só quando a coluna
  existir.
