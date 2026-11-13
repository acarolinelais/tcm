# 076. Regressão em caso Done e histórico de correções: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0012, 0013, 0015, 0034, 0037, 0042, 0044, 0051
- **ADRs novos propostos:** nenhum

## Abordagem

A regressão é um método explícito do `CasoTeste` (`reabrir_por_regressao`), chamado só pela importação do SDF. O
`_aplicar_status` continua abrindo tentativa apenas a partir de In Validation, então a gestão mover um caso Done na mão
não muda de comportamento. Para saber se a falha é a mais recente do device (RN-02), a importação lê a última
execução de cada caso naquele device antes de gravar as novas.

Cada tentativa vira uma linha da entidade nova `Correcao`. Quem a mantém é um registrador único na camada
`application` (`RegistroDeCorrecoes`), que recebe o estado do caso antes e depois de uma mudança e abre, fecha ou
reabre a tentativa. Todo serviço que muda o Status chama o registrador: importação e desfazer do SDF, rodada manual,
`PUT /test-cases`, Kanban e correção pela My Fixes. As tentativas guardam qual importação as abriu ou fechou, e o
`ImportacaoSdfStatus` passa a guardar o Status anterior. Assim o desfazer volta o caso para Done (RN-06) e desfaz só o
que aquela importação fez nas tentativas.

A visão Concluídas é uma rota nova ao lado da My Fixes, com o mesmo escopo. O gráfico Correções por dev entra na
resposta de `/api/overview/time`, que KP e gerente já consultam. A `Correcao` não ganha trigger de auditoria (ADR
0044): ela deriva das mudanças do caso, e essas já estão auditadas.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `Correcao` (nova, `correcoes`) | `id`, `unidade_id`, `ativo`, `created_at`, `updated_at` | padrão | tenant (ADR 0013), exclusão lógica |
| | `caso_teste_id` | UUID FK | obrigatório |
| | `tentativa` | int | ≥ 1; único por caso entre as ativas |
| | `origem` | str(20) | `validacao` ou `regressao` |
| | `falha_em` | datetime | dia da execução com falha que abriu (data do SDF) |
| | `em_revisao_em` | datetime? | primeira entrada em In Review na tentativa |
| | `fechada_em` | datetime? | data do SDF que fechou, ou agora quando é Encerrada |
| | `resultado` | str(20)? | `corrigida`, `falhou_de_novo` ou `encerrada`; nulo enquanto aberta |
| | `corretor_id` | UUID FK? | gravado ao fechar (RN-10); aberta usa o corretor atual do caso |
| | `aberta_por_importacao_id`, `fechada_por_importacao_id` | UUID FK? | para o desfazer (RN-06) |
| `ImportacaoSdfStatus` | `status_anterior` | str? | nulo nas linhas antigas, que valem como In Validation |

Índices: `(unidade_id, caso_teste_id, ativo)` e `(unidade_id, corretor_id, fechada_em)`. A migration
`g076a1b2c3d4` (down_revision `g073a1b2c3d4`) cria a tabela, a coluna e o backfill da RN-11: uma tentativa aberta para
cada caso em In Fixes, In Progress, In Review ou In Validation com `tentativa_correcao > 0`, com `falha_em` igual à
falha mais recente daquela tentativa em `execucoes_sdf` e `em_revisao_em` igual a `correcao_em_revisao_em`.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/bug-reports/my-fixes/concluidas` | query `projeto_id`*, `corretor_id`, `resultado`, `dia` ou `semana`, `fuso_horario`, `page`, `page_size` | 200 `PagedResult[CorrecaoConcluidaResponse]`; projeto fora do escopo devolve a lista vazia, como a My Fixes | 403 sem `test_cases.consultar`; 422 filtro inválido |
| GET | `/api/overview/time` (alterada) | igual | 200 com `correcoes_por_dev: [{usuario_id, nome, corrigidas, falharam_de_novo, media_dias}]` | iguais |
| POST | `/api/projetos/{id}/relatorios-sdf` (regra nova) | igual | 201 | iguais |
| POST | `/api/projetos/{id}/relatorios-sdf/{importacao_id}/desfazer` (regra nova) | igual | 200 | iguais |

`CorrecaoConcluidaResponse`: `id`, `caso_teste_id`, `tc_id`, `tentativa`, `origem`, `corretor_id`,
`corretor_identificador`, `falha_em`, `em_revisao_em`, `fechada_em`, `resultado`, `dias_ate_corrigir` (dias corridos
entre `falha_em` e `fechada_em`, no fuso informado). O dev só recebe as tentativas em que era o corretor; o
`corretor_id` dele é ignorado. Admin, gerente e KP seguem o escopo da My Fixes (spec 073, RN-08).

## Backend: arquivos

- `domain/entities/correcao.py` (novo): `Correcao` com `abrir`, `fechar(resultado, quando, corretor_id, importacao_id)` e `reabrir()`.
- `domain/entities/interfaces/correcao_repository.py` (novo): `obter_aberta`, `obter_por_tentativa`, `listar_por_importacao`, `listar_concluidas`, `resumir_por_corretor`.
- `domain/entities/caso_teste.py`: `reabrir_por_regressao()` e `desfazer_resultado_sdf(status_aplicado, status_anterior)`.
- `domain/entities/importacao_sdf_status.py`: `status_anterior`.
- `infrastructure/data/models/correcao_model.py`, configuração e `infrastructure/repositories/correcao_repository.py` (novos).
- `infrastructure/repositories/caso_teste_repository.py`: `ultima_execucao_no_device(unidade_id, projeto_id, caso_ids, modelo_id)`, ao lado do `listar_todos_aprovados` e com o mesmo `_resultados_validos`. No `execucao_sdf_repository` daria import circular com o `historico_form_factor_repository`.
- `infrastructure/repositories/overview_repository.py`: `correcoes_por_dev` no `resumir_time`.
- `infrastructure/data/migrations/versions/g076a1b2c3d4_correcoes.py` (nova).
- `application/services/registro_de_correcoes.py` (novo): `RegistroDeCorrecoes.antes(caso)` e `registrar(caso, antes, quando, importacao_id=None)`.
- `application/services/importacao_sdf_service.py`: regressão (RN-01, 02 e 04), `status_anterior` e o registrador na importação e no desfazer.
- `application/services/form_factor_service.py` e `caso_teste_service.py`: chamar o registrador onde o Status muda.
- `application/services/bug_report_service.py` e interface: `listar_concluidas`.
- `application/schemas/bug_report.py` e `overview.py`: as respostas novas.
- `api/routers/bug_reports.py` e `api/dependencies.py`: a rota e a injeção do repositório.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`, `api/projetos.api.ts` e `hooks/useProjetos.ts`: `CorrecaoConcluida`, `listarCorrecoesConcluidas` e `useCorrecoesConcluidas`.
- `modules/projetos/components/my-fixes/MyFixesTab.tsx`: a escolha entre Em correção e Concluídas.
- `modules/projetos/components/my-fixes/CorrecoesConcluidas.tsx` (novo): a tabela da RN-14 e RN-15, com `DataTable`, filtros, `estadoDaTabela` e exportação (ADR 0042).
- `modules/overview/model/overview.ts` e `api/overview.api.ts`: `correcoesPorDev`.
- `modules/overview/components/OverviewKp.tsx` e `OverviewGerente.tsx`: o cartão Correções por dev, com `BarrasEmpilhadas` (corrigidas e falharam de novo) e a média de dias no resumo em texto.
- `core/mock/database.ts`: tentativas nas rodadas e na correção, `listarCorrecoesConcluidas` e `correcoesPorDev`. O mock não importa SDF, então a regressão fica só no backend.
- `core/i18n/resources.ts` e `modules/documentacao/conteudo/*.ts`: os textos novos e o guia "Ciclo de Status" ("Quando o sistema move sozinho" passa a citar o caso Done).
- `e2e/my-fixes.spec.ts`: o cenário de Concluídas, com a API simulada pelas rotas.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + integração | `test_falha_em_done_reabre_em_in_fixes`; `test_importacao_reabre_caso_done_e_abre_tentativa_regressao` |
| CA-02 | Integração | `test_regressao_com_dev_fix_abre_a_tentativa_seguinte` |
| CA-03 | Unidade | `test_falha_pass_na_check_nao_reabrem_done` |
| CA-04 | Integração | `test_falha_relatorio_mais_antigo_nao_reabre_done` |
| CA-05 | Unidade + integração | `test_falha_cancelled_nao_reabre`; `test_falha_projeto_encerrado_nao_reabre` |
| CA-06 | Integração | `test_desfazer_regressao_volta_para_done_e_apaga_a_tentativa` |
| CA-07 | Unidade + integração | `test_registro_fecha_corrigida_com_dias`; `test_importacao_que_passa_fecha_a_tentativa` |
| CA-08 | Unidade | `test_registro_fecha_falhou_de_novo_e_abre_a_seguinte` |
| CA-09 | Integração | `test_trocar_dev_fix_nao_muda_tentativa_fechada` |
| CA-10 | Funcional + vitest | `test_concluidas_do_dev`; `CorrecoesConcluidas.test.tsx` |
| CA-11 | Funcional | `test_falha_dev_nao_ve_concluidas_de_outro` |
| CA-12 | Funcional + vitest + e2e | `test_concluidas_filtra_por_corretor_e_semana`; exportação no vitest; `my-fixes.spec.ts` |
| CA-13 | Integração + vitest | `test_overview_time_correcoes_por_dev`; `OverviewKp.test.tsx` e `OverviewGerente.test.tsx` |
| CA-14 | Vitest | estado vazio do cartão com os outros na tela |
| CA-15 | Integração | `test_migration_backfill_da_tentativa_atual` |

Arquitetura: o teste de camadas existente cobre o repositório novo (domain sem infrastructure).

## Riscos e decisões pendentes

- **Um serviço que muda o Status sem chamar o registrador** deixaria a tentativa aberta para sempre. Mitigação: o
  registrador é o único ponto que escreve em `correcoes`, e os testes de integração passam por cada caminho (PUT,
  Kanban, My Fixes, rodada, importação, desfazer).
- **O backfill** depende de `execucoes_sdf.tentativa_correcao` (spec 073). Se uma tentativa atual não tiver falha
  registrada, o `falha_em` usa o `updated_at` do caso.
- **Reabrir muda os números do Overview e do burndown** (RN-07). É esperado, mas o time vai notar casos Done voltando
  para In Fixes na primeira sprint com regressões.
- **Volume:** a lista e o gráfico filtram por `unidade_id`, `corretor_id` e `fechada_em`, com índice. A simulação teve
  86 tentativas em duas semanas para 160 casos, então não há risco de volume no curto prazo.
