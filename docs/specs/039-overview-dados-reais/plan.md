# 039. Overview com dados reais: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0036, 0037, 0044
- **ADRs novos propostos:** nenhum

## Abordagem
Uma rota só de leitura, `GET /api/overview`, devolve as contagens já agregadas no banco. Ela não traz a lista
de casos. O escopo vem do `UsuarioAutenticado`: o admin vê a unidade inteira; gerente e KP veem os projetos
dos times em `times_no_escopo` (ADR 0036); os demais perfis (dev e perfis personalizados) veem os casos em que
são responsável principal ou Backup. Todas as consultas filtram por `unidade_id` (ADR 0013). Os cards e a
distribuição por Status saem de um `COUNT ... FILTER` sobre `casos_teste` ligado a `projetos`. O desempenho
mensal lê a `auditoria_alteracoes` (ADR 0044): conta os casos distintos que entraram em `Done` em cada um
dos últimos 6 meses, no fuso de quem consulta. O front troca o mock pela API fora do modo de demonstração e
calcula as porcentagens a partir das contagens.

## Modelo de dados
Nenhuma tabela nova nem migration. Só leitura de `casos_teste`, `projetos` e `auditoria_alteracoes`.

Entram nas contagens só os casos com `casos_teste.ativo` e `projetos.ativo` verdadeiros e Status diferente de
`Cancelled` (o `Excluded` da spec).

| Contagem | Regra |
|---|---|
| `total` | todos os casos do escopo |
| `concluidos` | `status = 'Done'` |
| `em_andamento` | `status IN ('InProgress', 'InReview', 'InValidation', 'InFixes')` |
| `a_fazer` | `status = 'To-Do'` |
| `atribuidos` | `responsavel_id = usuário logado` |
| `desempenho[mes]` | `COUNT(DISTINCT row_id)` em `auditoria_alteracoes` com `table_name = 'casos_teste'`, `new_values->>'status' = 'Done'` e (`operation = 'INSERT'` ou `'status' = ANY(changed_fields)`), agrupado por `date_trunc('month', created_at AT TIME ZONE :fuso)`; só os casos que hoje estão no escopo e passam pelos filtros acima |

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/overview` | query `fuso_horario` (padrão `UTC`, até 64 caracteres) | 200 `OverviewResponse` | 401 sem token; 422 fuso inválido (ProblemDetails) |

```json
{
  "total": 10, "concluidos": 4, "em_andamento": 3, "a_fazer": 3, "atribuidos": 2,
  "desempenho": [{ "mes": "2026-05", "concluidos": 0 }, "...", { "mes": "2026-10", "concluidos": 1 }]
}
```

O `desempenho` sempre tem os 6 meses, do mais antigo para o atual, com zero nos meses sem registro. Um KP sem
time recebe tudo zerado e status 200 (CA-05).

## Backend: arquivos
- `src/domain/queries/resumo_overview.py` (novo): dataclasses `ResumoOverview` e `PontoDesempenho`.
- `src/domain/entities/interfaces/overview_repository.py` (novo): Protocol `OverviewRepository` com
  `resumir(unidade_id, escopo, usuario_id, inicio, fuso)`.
- `src/infrastructure/repositories/overview_repository.py` (novo): `OverviewRepositoryImpl`. As contagens usam o
  SQLAlchemy Core e o desempenho usa SQL textual, como o `HistoricoCasoTesteRepositoryImpl`.
- `src/application/schemas/overview.py` (novo): `OverviewResponse` e `PontoDesempenhoResponse`, com mapeamento
  manual (ADR 0007).
- `src/application/services/interfaces/overview_service.py` e `src/application/services/overview_service.py`
  (novos): `OverviewServiceImpl.obter(usuario_atual, fuso_horario)` monta o escopo, valida o fuso com
  `fuso_horario_valido` e completa os meses sem registro com zero.
- `src/api/routers/overview.py` (novo), `src/api/dependencies.py` (`get_overview_service`) e `src/api/main.py`
  (`include_router`).

O escopo vira um valor simples para o repositório: `todos` (admin), `times` (tupla de `time_id`) ou `pessoa`
(responsável principal ou Backup).

## Frontend: arquivos
- `modules/overview/model/overview.ts`: o tipo `OverviewData` passa a ter as contagens (`total`, `concluidos`,
  `emAndamento`, `aFazer`, `atribuidos`) e `desempenho: { mes: string; concluidos: number }[]`.
- `modules/overview/api/overview.api.ts`: chama `/api/overview?fuso_horario=<fuso do navegador>` e mapeia o
  snake_case.
- `modules/overview/api/overview.mock.ts`: dados de exemplo no formato novo, com 6 meses (RN-06).
- `modules/overview/hooks/useOverview.ts`: usa o mock só com `useMock`; senão, a API.
- `modules/overview/pages/OverviewPage.tsx`: estado de erro e estado vazio quando `total = 0` (RN-05).
- `modules/overview/components/TotalTcsDonePieChart.tsx`: calcula as porcentagens a partir das contagens.
- `modules/overview/components/TeamPerformanceChart.tsx`: mostra quantidade de casos em vez de porcentagem, rotula
  o mês a partir de `YYYY-MM` e não divide por zero quando todos os meses são zero.
- `modules/overview/components/OverviewHeroCard.tsx`: lê os campos novos.
- `core/i18n/resources.ts`: textos do estado vazio, do erro e do valor em casos, nos idiomas existentes.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração | `test_resumir_gerente_conta_concluidos_e_total` (`test_overview_repository.py`) |
| CA-02 | Integração | `test_resumir_pessoa_conta_so_casos_do_dev` |
| CA-03 | Integração | `test_resumir_desempenho_conta_casos_que_entraram_em_done_no_mes` (Status mudado por `UPDATE` com o trigger ativo) |
| CA-04 | Integração | `test_resumir_ignora_caso_excluido` |
| CA-05 | Unidade + Vitest | `test_obter_kp_sem_time_devolve_zerado`; `OverviewPage` mostra o estado vazio com `total = 0` |
| CA-06 | Integração + Funcional | `test_resumir_nao_conta_outra_unidade`; `test_overview_sem_token_retorna_401` e `test_overview_fuso_invalido_retorna_422` |
| RN-06 | Vitest | `useOverview` usa o mock com `useMock` e a API sem ele |

## Riscos e decisões pendentes
- Antes da spec 038 não há registro na auditoria, então os meses anteriores a ela aparecem zerados (fora de
  escopo na spec).
- Um caso que entra em `Done`, sai e volta no mesmo mês conta uma vez nesse mês. Se entrar em meses diferentes,
  conta em cada um.
- O escopo do desempenho é o de hoje: um caso que mudou de time conta para o time atual. Fica assim por ser
  uma visão do escopo atual e não um relatório histórico.
- A consulta do desempenho filtra `auditoria_alteracoes` por `unidade_id` e `created_at`, coberta pelo índice
  `(unidade_id, created_at)` do ADR 0044.
