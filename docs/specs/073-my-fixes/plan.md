# 073. Aba My Fixes e fluxo de correção: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003 (camadas), 0004 (Repository, UnitOfWork, PagedResult), 0005 (SQLAlchemy), 0006
  (ProblemDetails), 0007 (mapeamento manual), 0008 (routers, sem DELETE), 0010 (testes), 0012 (migrations), 0013
  (tenant), 0018 (papéis, substitui o 0015), 0034 (20 por página), 0037 (HeroUI), 0044 (auditoria por triggers), 0054 (termos em inglês)
- **ADRs novos propostos:** nenhum

## Abordagem
A tentativa vira um contador no próprio caso (`tentativa_correcao`). O domínio o incrementa toda vez que o caso passa
de In Validation para In Fixes, pela importação do SDF ou pelo registro manual da rodada, e o decrementa quando a
importação que causou a volta é desfeita. Cada execução do SDF grava a tentativa em que o caso ficou depois do
relatório, e o painel agrupa as falhas por esse número. A End Date da correção é um segundo campo
(`correcao_em_revisao_em`): ele é gravado quando o caso em correção entra em In Review e zerado quando o caso volta
para In Fixes. A lista da My Fixes reaproveita a consulta de falhas abertas da SDF Failures (`_falhas_visiveis`),
filtrando pelo corretor e pelos quatro Status de correção. A mudança de Status pela My Fixes tem uma rota própria, que
só aceita esses quatro Status e só deixa o corretor e a gestão mudarem.

## Modelo de dados
| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `CasoTeste` | `tentativa_correcao` | int, não nulo, padrão 0 | +1 em In Validation → In Fixes (RN-03); −1 ao desfazer a importação que o levou a In Fixes |
| `CasoTeste` | `correcao_em_revisao_em` | datetime, nulo | Gravado ao entrar em In Review com `tentativa_correcao > 0`; zerado ao entrar em In Fixes |
| `ExecucaoSdf` | `tentativa_correcao` | int, nulo | Tentativa do caso depois de aplicar o resultado; nulo nas execuções anteriores a esta spec |

Migration: as três colunas. Os casos que hoje estão em correção recebem `tentativa_correcao = 1`: os que estão em
In Fixes e os que já têm Dev Fix e estão em In Progress, In Review ou In Validation. Repetir na migration a consulta
de "falha aberta" da SDF Failures seria frágil. As execuções antigas ficam com nulo e o painel as mostra na tentativa 1.
As duas colunas do caso entram na lista de colunas que a auditoria ignora (ADR 0044), como as datas da spec 065: são
calculadas e não aparecem no histórico nem na Timeline.

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/bug-reports/my-fixes` | `projeto_id`, `page`, `page_size`, `status` (só os quatro da correção), `responsavel` | 200 `PagedResult<CasoEmCorrecao>` | 403, 404 |
| PATCH | `/api/test-cases/{caso_id}/correcao` | `{ "status": "InFixes" \| "InProgress" \| "InReview" \| "InValidation" }` | 200 `CasoTesteResponse` | 403 (não é corretor nem gestão), 404, 409 (caso fora de correção), 422 (Status fora dos quatro) |
| GET | `/api/bug-reports` | + `reincidentes: bool` (além do `projeto_id` de hoje) | 200 (linhas com `tentativa_correcao`) | como hoje |

`CasoEmCorrecao`: `caso_teste_id`, `tc_id`, `status`, `tentativa_correcao`, `responsavel` (id e identificador),
`dev_fix` (id e identificador), `run_date` (falha mais recente), `end_date` (`correcao_em_revisao_em`) e `falhas`
(device, SDF ID, Run Date, resultado, Description e tentativa), que alimentam o painel sem uma segunda chamada.

## Backend: arquivos
- `domain/entities/caso_teste.py`: campos novos; `aplicar_resultado_sdf`, `registrar_resultado_form_factor` e
  `desfazer_resultado_sdf` mexem na tentativa; `_mudar_status` grava `correcao_em_revisao_em`; novo
  `mudar_status_da_correcao(status)`, que recusa Status fora dos quatro e caso fora de correção.
- `domain/entities/execucao_sdf.py`: `tentativa_correcao`.
- `infrastructure/data/models/*`, migration Alembic com o backfill descrito acima.
- `infrastructure/repositories/bug_report_repository.py`: `listar_my_fixes` (reaproveita `_falhas_visiveis`, troca o
  escopo pela condição do corretor), `tentativa_correcao` nas linhas e o filtro `reincidentes`.
- `application/services/bug_report_service.listar_my_fixes` (listar) e `caso_teste_service.mudar_status_da_correcao`
  (permissão: corretor ou gestão do time).
- `application/services/importacao_sdf_service.py` e `form_factor_service.py`: gravam a tentativa na execução.
- `api/routers/bug_reports.py` (listar e o filtro `reincidentes`) e `api/routers/test_cases.py` (Status da correção).
  A listagem fica junto da SDF Failures porque usa o mesmo service e os mesmos filtros.

## Frontend: arquivos
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: aba My Fixes.
- `modules/projetos/components/my-fixes/MyFixesTab.tsx` (tabela com `DataTable`, filtros, estados) e
  `FalhasDoCasoDrawer.tsx` (painel HeroUI com as falhas agrupadas por tentativa).
- `modules/projetos/components/status/`: seletor de Status com as quatro opções da correção.
- `shared/ui/selo-tentativa.tsx`: selo "2ª correção", usado na My Fixes e na SDF Failures.
- `modules/bug-reports/pages/BugReportsPage.tsx`: selo no TC ID e filtro Reincidentes.
- `modules/projetos/api/*` e `hooks/*`: `listarMyFixes`, `mudarStatusDaCorrecao` e `useMyFixes`. Os tipos da linha de
  falha (`CasoComFalhas`, `FalhaSdf`) ficam em `modules/projetos/model`, e `bug-reports` os reexporta: o módulo
  `projetos` não importa `bug-reports` (ADR 0009), só o contrário, como já era.
- `core/mock/database.ts`: as mesmas regras no modo mock (spec 010).
- `core/i18n/resources.ts`: textos em en, pt-BR e ko (My Fixes fica em inglês: entra no ADR 0054).

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + integração | `test_caso_teste`: falha em In Validation vai para In Fixes com tentativa 1; `test_bug_report_repository`: o caso aparece para o responsável sem Dev Fix |
| CA-02 | Integração | `test_bug_report_repository`: com Dev Fix, o caso sai do responsável e vai para o Dev Fix |
| CA-03 | Unidade + funcional | `test_caso_teste`: In Review na correção grava `correcao_em_revisao_em`; `test_my_fixes_api`: PATCH da correção pelo corretor |
| CA-04 | Unidade + integração | nova falha em In Validation: tentativa 2, mesmo Dev Fix; `test_bug_report_repository`: `tentativa_correcao` na linha |
| CA-05 | Integração | PASS em todos os devices: Done e fora da My Fixes |
| CA-06 | Unidade (front) | `FalhasDoCasoDrawer.test`: grupos por tentativa, mais nova primeiro |
| CA-07 | Integração | o responsável não vê o caso que tem outro Dev Fix |
| CA-08 | Funcional | PATCH da correção por quem não é corretor nem gestão: 403 |
| CA-09 | Unidade + funcional | domínio recusa To-Do/Done/Cancelled na correção; PATCH com esses Status: 422; front só oferece os quatro |
| CA-10 | Unidade (front) | `MyFixesTab.test`: estado vazio |
| CA-11 | Integração + unidade (front) | filtro `reincidentes`; `BugReportsPage.test`: filtro e selo |
| CA-01 a CA-05 | e2e | `my-fixes.spec.ts`: do SDF com falha à correção que passa |

## Riscos e decisões pendentes
- O backfill marca como tentativa 1 os casos que já estão em correção, mesmo os que já falharam mais de uma vez.
- O registro manual da rodada (`form_factor_service`) também move para In Fixes; os dois caminhos precisam do mesmo
  teste de tentativa.
