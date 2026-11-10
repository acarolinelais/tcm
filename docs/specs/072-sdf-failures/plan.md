# 072. SDF Failures: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0012, 0013, 0018, 0030, 0034, 0037, 0041,
  0044, 0045
- **ADRs novos propostos:** nenhum

## Abordagem

A regra de falha vira uma só, no domínio: `ResultadoFormFactor.eh_falha(resultado)`, falso para PASS, N/A, NA e
Check (com `upper(trim())`, também em SQL). Ela entra em três pontos: a lista de SDF Failures, o "FAIL nesta
importação" da spec 066 e o "todos passaram" de `_aprovados` (Done e End date). O caso ganha `dev_fix_id` e
`dev_fix_em`, gravados pelo `PUT /api/test-cases/{id}` que já existe, no caminho da gestão, com a mesma validação de
membro ativo do responsável. A saída das falhas não apaga nada: cada linha de `importacoes_sdf_status` com Status
Done ganha `concluiu_correcao`, marcado na importação quando o caso tinha Dev Fix e entrou em In Validation depois
dele (pela auditoria, ADR 0044). O corte de um caso é o `created_at` da importação ativa mais recente com
`concluiu_correcao`, e só aparecem as falhas gravadas depois do corte. Desfazer a importação (spec 067) desativa a
importação, então o corte volta sozinho. A lista passa a paginar por caso, com as falhas de cada um numa lista.

## Modelo de dados

Uma migration (`down_revision` no head atual, o da spec 071):

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `casos_teste` | `dev_fix_id` | UUID, FK `usuarios.id`, nulo | membro ativo do time; pode ser o responsável |
| `casos_teste` | `dev_fix_em` | timestamp, nulo | gravado quando o Dev Fix muda; nulo quando removido |
| `importacoes_sdf_status` | `concluiu_correcao` | bool, padrão `false` | só com `status_aplicado = Done` |

Consultas novas no domínio (`domain/queries/bug_report.py`, substituem `FalhaAberta`):

- `FalhaSdf`: `modelo_dispositivo_id`, `modelo_nome`, `sdf_id`, `resultado`, `descricao`, `data_execucao`.
- `CasoComFalhas`: `caso_teste_id`, `tc_id`, `status`, `time_id`, `responsavel_id`, `responsavel_identificador`,
  `backup_id`, `dev_fix_id`, `dev_fix_identificador`, `falhas: list[FalhaSdf]` (da mais recente para a mais antiga).

**Falha visível:** resultado válido (`_resultados_validos`, sem importação desfeita nem device inativo) com
`eh_falha`, de caso ativo não Excluded/Cancelled, em projeto não encerrado, com a execução gravada depois do corte.

**Correção concluída** (na importação, para cada caso que esta importação levou a Done): `dev_fix_id` não nulo e
existe na auditoria uma mudança de Status para In Validation depois de `max(dev_fix_em, corte atual)`, sem contar
a origem `IMPORTACAO_SDF_DESFEITA`. O `max` faz a regra valer de novo quando o caso volta a falhar depois de uma
correção.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/bug-reports` (rota mantida) | `projeto_id` (obrigatório), `page`, `page_size` (padrão 20), `modelo_dispositivo_id?`, `dev_fix?` e `responsavel?` (texto do ID), `dia?` (`AAAA-MM-DD`) ou `semana?` (`AAAA-Www`), `fuso_horario` | 200, `PagedResult[CasoComFalhasResponse]`, um item por caso, ordem pela falha mais recente desc | 401 sem sessão, 403 sem `form_factor.consultar`, 404 projeto fora do escopo, 422 parâmetro inválido |
| PUT | `/api/test-cases/{id}` (já existe) | `{dev_fix_id}` (UUID ou `null` para remover) | 200, `CasoTesteResponse` com `dev_fix_id` | 403 fora da gestão do time (o dev cai aqui), 409 não é membro ativo do time, 404 fora do escopo |

Os filtros de device, dia e semana limitam as falhas; um caso sem falha no recorte sai da página.

## Backend: arquivos

- `domain/entities/resultado_form_factor.py`: `NAO_FALHA = {"PASS", "N/A", "NA", "CHECK"}` e `eh_falha()`.
- `domain/entities/caso_teste.py`: `dev_fix_id`, `dev_fix_em` e `definir_dev_fix(usuario_id | None, agora)`.
- `domain/entities/importacao_sdf_status.py`: `concluiu_correcao`.
- `domain/queries/bug_report.py`: `FalhaSdf`, `CasoComFalhas`, `FiltrosBugReport` com os filtros novos.
- `domain/entities/interfaces/bug_report_repository.py`: `listar_casos_com_falhas(...)`.
- `domain/entities/interfaces/caso_teste_repository.py`: `entrou_em_validacao_desde(unidade_id, caso_id, desde)` e
  `corte_de_falhas(unidade_id, caso_id)`.
- `infrastructure/data/models/caso_teste_model.py` e `importacao_sdf_status_model.py`: as colunas novas.
- `infrastructure/data/migrations/versions/g072..._dev_fix_e_correcao.py`: a migration.
- `infrastructure/repositories/bug_report_repository.py`: duas consultas, a página de casos (ordem por
  `max(data_reportada)` das falhas visíveis, contagem) e as falhas desses casos; o dev vê responsável, backup ou Dev Fix.
- `infrastructure/repositories/caso_teste_repository.py`: `_aprovados` com `eh_falha` em SQL, os dois métodos novos
  e o mapeamento das colunas. O comentário sobre a g065 passa a dizer que a regra mudou na 072 sem retroativo (RN-04).
- `infrastructure/repositories/importacao_sdf_status_repository.py`: grava `concluiu_correcao`.
- `application/services/importacao_sdf_service.py`: `com_fail` com `eh_falha`; para cada caso que foi para Done,
  calcula `concluiu_correcao`.
- `application/services/caso_teste_service.py`: `dev_fix_id` em `CAMPOS_GESTAO`, `_garantir_membro` no Dev Fix.
- `application/schemas/caso_teste.py`: `dev_fix_id` no request e no response.
- `application/schemas/bug_report.py`: `FalhaSdfResponse` e `CasoComFalhasResponse`, mapeamento manual (ADR 0007).
- `application/services/bug_report_service.py`: projeto no escopo (404), dia ou semana pelo `validators/semana.py`.
- `api/routers/bug_reports.py`: os parâmetros novos.

## Frontend: arquivos

Módulo `modules/bug-reports/` (a tela já é HeroUI, ADR 0037), tabela pela skill `table-rules`:

- `model/bug-report.ts`: `CasoComFalhas`, `FalhaSdf`, filtros com `periodo`.
- `api/bug-reports.api.ts` e `hooks/useBugReports.ts`: parâmetros novos; a chave da query leva o projeto.
- `pages/BugReportsPage.tsx`: título SDF Failures; seletor de projeto do Board e da Timeline
  (`useProjetosSeletor`); `WeekPickerHero permitirDia`; colunas da RN-10; linha que expande pelo padrão do
  `HistoricoProjetoTabela`; Description com `RowActionButton` e o modal do Notes; Dev Fix com `InlineSelect` (membros
  ativos do time e "No Dev Fix"), só para `perfilGerenciaCasos`, chamando o PUT com `{dev_fix_id}`.
- `modules/projetos/model/projeto.ts`: `dev_fix_id` em `CasoTeste`.
- `modules/projetos/components/casos-teste/AlteracaoCasoTesteItem.tsx`: rótulo Dev Fix no histórico do caso.
- `core/layout/Sidebar.tsx` e `core/i18n/resources.ts`: SDF Failures e os textos novos (pt, en).
- `core/mock/database.ts`: a lista nova, o Dev Fix, `eh_falha` e o corte no modo mock (ADR 0030).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-03, CA-04 | Unidade | `test_resultado_form_factor.py`: `eh_falha` para FAIL, EXCEPTION, None, PASS, N/A, NA, Check, com espaços e minúsculas |
| CA-06 | Unidade | `test_importacao_sdf_service.py`: EXCEPTION leva In Validation para In Fixes |
| CA-07 | Integração | `test_caso_teste_todos_aprovados.py`: `_aprovados` aceita N/A e Check como o último resultado |
| CA-01, CA-02, CA-05 | Integração | `test_bug_report_repository.py`: To-Do entra, PASS depois não tira, três falhas no mesmo device viram três itens |
| CA-04, CA-19 | Integração | mesmo arquivo: só N/A/Check/PASS fica fora; Excluded, Cancelled e projeto encerrado ficam fora |
| CA-08, CA-09, CA-20 | Integração | mesmo arquivo: filtro de projeto, dia e semana, 20 casos por página |
| CA-15, CA-16, CA-17 | Integração | `test_importacao_sdf_corte.py`: com Dev Fix e In Validation depois, as falhas saem; sem Dev Fix, ou com o caso já em validação antes, ficam; desfazer a importação traz as falhas de volta |
| CA-18 | Unidade | `test_bug_report_service.py`: o dev vê responsável, backup e Dev Fix |
| CA-11, CA-12, CA-13, CA-14 | Funcional | `test_casos_teste_api.py`: PUT `{dev_fix_id}` aceita outro membro e o próprio responsável; 409 fora do time; 403 para o dev |
| CA-01 | Funcional | `test_bug_reports_api.py`: 200 com um item por caso; 422 sem `projeto_id`; 401 sem sessão |
| CA-05, CA-10, CA-11, CA-14 | Unidade (Vitest) | `BugReportsPage.test.tsx`: expande as falhas, abre a Description, envia `{dev_fix_id}`, dev sem a ação |
| CA-08, CA-09 | Unidade (Vitest) | mesmo arquivo: seletor de projeto e Day or Week mandam os parâmetros |
| CA-11 | E2E | `bug-reports.spec.ts`: KP escolhe o Dev Fix e a linha mostra o nome, com o Dev Owner igual |

## Riscos e decisões pendentes

- **Esta branch é a da 071.** A migration encadeia no head da 071. Se a 071 entrar na `dev` antes, nada muda; se a
  072 for sozinha, o `down_revision` precisa ser revisto. Confirmar `uv run alembic heads` antes do PR.
- **A regra nova de Done não é retroativa (RN-04).** Casos em In Validation com N/A ou Check só fecham na próxima
  importação deles. A migration g065, que calculou a End date antiga, fica como está.
- **A verificação de correção concluída depende da auditoria (ADR 0044).** Desfazer uma importação que levou o caso
  para In Fixes devolve o caso para In Validation; essa volta não conta como correção (fica de fora pela origem).
- **O Dev Fix fica no caso depois da correção.** Uma falha nova depois do corte aparece com o mesmo Dev Fix, que
  precisa levar o caso de novo a In Validation (o `max` da regra). Se o KP preferir redistribuir, ele troca o Dev Fix.
- **Paginar por caso exige duas consultas** (a página de casos e as falhas deles). Para um projeto com muitas
  execuções, um índice em `execucoes_sdf(caso_teste_id, data_reportada)` pode entrar na mesma migration, se o teste
  de integração mostrar lentidão.
- **Mudança no contrato:** o `GET /api/bug-reports` passa a exigir `projeto_id` e muda o formato do item. Só a
  página usa a rota, e ela muda junto.
