# 070. Bug Reports: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0017, 0022, 0030, 0034, 0036, 0037,
  0041, 0045
- **ADRs novos propostos:** nenhum

## Abordagem

Uma consulta só de leitura, `GET /api/bug-reports`, devolve as falhas em aberto paginadas. O repositório numera os
resultados de cada caso + device com a mesma ordem de "mais recente" da End date (`data_reportada`, ordem de
gravação, id), fica com o primeiro e mantém só os FAIL. Casos Done e Cancelled e projetos Completed e Canceled
saem na mesma consulta. A regra de "resultados válidos" (`_resultados_validos`) é reaproveitada, passando a coluna
`CasoTesteModel.projeto_id` no lugar de um projeto fixo, para atravessar os projetos do escopo. O escopo por perfil
é o da Overview (admin: unidade; gerente e KP: times do escopo; dev: dono ou backup), e a regra sai do
`OverviewService` para uma função usada pelos dois. A permissão é a da General Results (`form_factor.consultar`).
A troca de responsável não ganha rota nova: o front usa o `PUT /api/test-cases/{id}` com `{responsavel_id}`, que
já valida membro do time, backup e posse.

## Modelo de dados

Nenhuma mudança, sem migration. Consulta nova `FalhaAberta` (domínio, `domain/queries/bug_report.py`):

| Campo | Tipo | Origem |
|---|---|---|
| `caso_id`, `tc_id`, `titulo`, `status` | UUID, str, str, str | caso |
| `projeto_id`, `projeto_nome`, `time_id` | UUID, str, UUID | projeto |
| `modelo_dispositivo_id`, `modelo_nome` | UUID, str | modelo do resultado |
| `sdf_id` | str \| None | execução (nulo em execução manual sem rodada) |
| `motivo` | str \| None | `descricao` do resultado |
| `data_execucao` | datetime | `data_reportada` da execução |
| `responsavel_id`, `responsavel_user_id`, `backup_id` | UUID, str \| None, UUID \| None | caso e usuário |

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/bug-reports` | `page`, `page_size` (padrão 20), `projeto_id?`, `modelo_dispositivo_id?`, `responsavel?` (texto) | 200, `PagedResult[FalhaAbertaResponse]`, ordem `data_execucao` desc | 401 sem sessão, 403 sem `form_factor.consultar`, 422 parâmetro inválido |
| PUT | `/api/test-cases/{id}` (já existe) | `{responsavel_id}` | 200 | os de hoje: 403 fora da gestão do time, 409/422 membro inativo ou igual ao backup, 404 fora do escopo |

## Backend: arquivos

- `domain/queries/bug_report.py` (novo): `FalhaAberta` e `FiltrosBugReport`.
- `domain/entities/interfaces/bug_report_repository.py` (novo): `listar_falhas_abertas(unidade_id, escopo, filtros,
  page, page_size) -> PagedResult[FalhaAberta]`.
- `infrastructure/repositories/bug_report_repository.py` (novo): a consulta com `row_number()` por caso + modelo.
- `infrastructure/repositories/historico_form_factor_repository.py`: `_resultados_validos` aceita a coluna do
  projeto (assinatura e chamadas atuais seguem iguais).
- `application/services/bug_report_service.py` e a interface (novos): permissão e escopo, mapeamento para o response.
- `application/services/overview_service.py`: `_escopo` vira função do módulo (`escopo_do_usuario`), usada pelos dois.
- `application/schemas/bug_report.py` (novo): `FalhaAbertaResponse` com mapeamento manual (ADR 0007).
- `api/routers/bug_reports.py` (novo), `api/dependencies.py` e `api/main.py`: a rota e a injeção.

## Frontend: arquivos

Módulo novo `modules/bug-reports/` (ADR 0009), tela nova em HeroUI (ADR 0037), tabela pela skill `table-rules`:

- `model/bug-report.ts`, `api/bug-reports.api.ts`, `hooks/useBugReports.ts` (TanStack Query).
- `pages/BugReportsPage.tsx`: filtros (projeto, device, responsável), tabela de 20, estados vazio, carregando e erro;
  o TC ID abre o `DetalhesCasoTesteDrawer` (a página do caso, spec 040, ainda é rascunho).
- Troca de responsável na própria célula Assignee (`InlineSelect`, regra 7 das tabelas, como na tabela de Test
  Cases): opções com os membros ativos do time do caso (`timesApi.membros`), sem o backup; chama o PUT com
  `{responsavel_id}` e invalida a lista. Só para quem gerencia casos (`perfilGerenciaCasos`).
- `routes.tsx` e `index.ts`; `core/router.tsx` com a rota `/bug-reports`.
- `core/layout/Sidebar.tsx` e `sidebar-icons.tsx`: item **Bug Reports** com a mesma condição da General Results.
- `core/i18n/resources.ts`: os textos (pt, en).
- `core/mock/database.ts`: a rota no modo mock (ADR 0030).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-02, CA-03, CA-04 | Integração | `test_bug_report_repository.py`: FAIL mais recente entra, PASS depois tira, FAIL depois entra, dois devices = duas linhas |
| CA-05, CA-12, CA-13, CA-15 | Integração | mesmo arquivo: Done, Cancelled, projeto encerrado e N/A ou vazio ficam fora |
| CA-06, CA-07 | Integração | mesmo arquivo: página de 20 e filtro por projeto |
| CA-10 | Unidade | `test_bug_report_service.py`: dev filtra por dono ou backup; sem permissão é 403 |
| CA-01, CA-06 | Funcional | `test_bug_reports_api.py`: 200 com `PagedResult`; 401 sem sessão |
| CA-14 | Funcional | `test_caso_teste_api.py` (já cobre): KP de outro time recebe 403 no PUT |
| CA-08, CA-09, CA-14 | Unidade (Vitest) | `BugReportsPage.test.tsx`: envia `{responsavel_id}`, invalida a lista e mostra a recusa |
| CA-07, CA-10, CA-11 | Unidade (Vitest) | `BugReportsPage.test.tsx`: filtro, dev sem a ação, estado vazio |
| CA-08 | E2E | `bug-reports.spec.ts`: KP troca o responsável e a linha mostra o novo nome |

## Riscos e decisões pendentes

- `_resultados_validos` hoje compara com um `projeto_id` fixo. Passar a coluna precisa ser conferido nas junções
  com `ProjetoModeloModel` e `ImportacaoSdfModel` (device inativo no projeto e importação desfeita ficam fora).
- A consulta atravessa todos os projetos do escopo. Para o admin é a unidade inteira; se ficar lenta, um índice em
  `execucoes_sdf(caso_teste_id, data_reportada)` entra numa migration à parte.
- Os filtros de projeto e device usam as listas que já existem (`/api/projetos` no escopo e o catálogo de modelos).
