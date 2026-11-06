# 064. Overview com gráficos para gerente e admin: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0036, 0037, 0041, 0044, 0051
- **ADRs novos propostos:** nenhum

## Abordagem

A rota `GET /api/overview/time` da spec 063 já aplica o escopo do gerente (times dos setores geridos e dos times
em que participa, ADR 0036) e do admin (a unidade inteira). Ela ganha quatro campos novos na resposta, calculados
para qualquer escopo: andamento por time, andamento por setor, Test Cases em `In Fixes` por projeto e Pass Rate
por projeto. O Pass Rate por modelo do projeto escolhido reaproveita a rota `GET /api/overview/projetos/{id}`
sem mudança. Não há tabela nova nem migration.

No frontend, a `OverviewPage` passa a escolher também as visões do gerente e do admin, por `React.lazy`, como as
do KP e do dev. Com isso, o `TotalTcsDonePieChart` e o `TeamPerformanceChart` da spec 039 perdem o último uso e
saem. O seletor de projeto e o cartão de Pass Rate por modelo saem do `OverviewKp` para um componente usado pelo
KP e pelo gerente.

## Modelo de dados

Nenhuma tabela ou coluna nova. Leituras, todas com os filtros do escopo e sem `Excluded` (spec 063, RN-01):

| Dado | Fonte | Regra |
|---|---|---|
| Andamento por time | `casos_teste` × `projetos` × `times` | To-Do, em andamento (`InProgress`, `InReview`, `InValidation`, `InFixes`) e `Done`, por time ativo |
| Andamento por setor | o mesmo, × `setores` | Agrupado por setor ativo |
| Em correção por projeto | `casos_teste` com `status = InFixes` | Entra na consulta por projeto que já existe (criação e Done) |
| Pass Rate por projeto | Rodada ativa mais recente de cada projeto (`DISTINCT ON (projeto_id)`) → `execucoes_sdf` → `resultados_form_factor` | `PASS` sobre o total de resultados ativos, somando os modelos |

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/overview/time` | `?fuso_horario` | 200 `OverviewTimeResponse` com os campos novos | 401; 422 fuso inválido |
| GET | `/api/overview/projetos/{projeto_id}` | sem mudança (spec 063) | 200 | 401; 404; 422 |

```jsonc
// Campos novos do OverviewTimeResponse
{ "andamento_por_time": [{ "id": "…", "nome": "QA", "a_fazer": 3, "em_andamento": 4, "concluidos": 5 }],
  "andamento_por_setor": [{ "id": "…", "nome": "Mobile", "a_fazer": 3, "em_andamento": 4, "concluidos": 5 }],
  "em_correcao_por_projeto": [{ "projeto_id": "…", "projeto": "Clock 9.5", "em_correcao": 3 }],  // só projetos com 1 ou mais
  "pass_rate_por_projeto": [{ "projeto_id": "…", "projeto": "Clock 9.5", "aprovados": 8, "total": 10 }] }  // só projetos com rodada
```

As porcentagens continuam no frontend, como na spec 063.

## Backend: arquivos

Seguindo a skill `python-crud` (só leitura):
- `domain/queries/resumo_overview.py`: `Andamento` (id, nome, a_fazer, em_andamento, concluidos) e os campos
  novos do `ResumoTime`; o `done_por_projeto` passa a levar também os em correção.
- `infrastructure/repositories/overview_repository.py`: no `resumir_time`, as consultas de andamento por time e por
  setor, a contagem de `InFixes` na consulta por projeto e o Pass Rate por projeto.
- `application/schemas/overview.py`: `AndamentoResponse`, `EmCorrecaoProjetoResponse`, `PassRateProjetoResponse`.
- `application/services/overview_service.py`: o `obter_time` monta os campos novos.
- Testes: `tests/integration/test_overview_repository.py`, `tests/unit/application/services/test_overview_service.py`
  e `tests/functional/test_overview_api.py`, que já existem.

## Frontend: arquivos

Seguindo a skill `react-crud`:
- `modules/overview/model/overview.ts`, `api/overview.api.ts`, `api/overview.mock.ts` e o teste da API: os campos
  novos, com dados de exemplo no modo de demonstração.
- `modules/overview/components/graficos/BarrasEmpilhadas.tsx`: uma barra horizontal por time ou setor, com
  To-Do, em andamento e Done empilhados nas cores dos status do Board (`--status-todo`, `--status-progress`,
  `--status-done`, ADR 0041) e legenda.
- `modules/overview/components/graficos/estilo.ts`: a `Barra` ganha um `rotulo` opcional, para o Done por projeto
  mostrar "4 (44%)" na ponta da barra.
- `modules/overview/components/PassRatePorModelo.tsx`: o seletor de projeto e o cartão de Pass Rate por modelo,
  com o hook `useProjetoEscolhido`, tirados do `OverviewKp`. O KP continua com o burndown ao lado, ligado ao
  mesmo seletor.
- `modules/overview/components/OverviewGerente.tsx`: andamento por time, finalizados por semana, retrabalho, Done
  por projeto, Pass Rate por projeto e Pass Rate por modelo.
- `modules/overview/components/OverviewAdmin.tsx`: andamento por setor, finalizados por semana e Pass Rate por
  projeto.
- `modules/overview/pages/OverviewPage.tsx`: as quatro visões por perfil; saem o `TotalTcsDonePieChart`, o
  `TeamPerformanceChart` e as chaves de i18n que só eles usavam.
- `core/i18n/resources.ts`: títulos e resumos novos em en, pt-BR e ko.
- `e2e/overview-graficos.spec.ts`: gerente e admin, com a sessão e as rotas simuladas (sem criar dados no banco).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração + unidade (front) | `test_resumir_time_andamento_por_time`; `OverviewGerente.test.tsx` "andamento de cada time" |
| CA-02 | Integração + unidade (front) | `test_resumir_time_em_correcao_so_projetos_com_in_fixes`; `OverviewGerente.test.tsx` |
| CA-03 | Integração + unidade (front) | `test_resumir_time_done_por_projeto_ignora_excluded` (spec 063); `OverviewGerente.test.tsx` "4 (44%)" |
| CA-04 | Integração | `test_pass_rate_por_projeto_usa_a_rodada_mais_recente` |
| CA-05 | Unidade (front) + e2e | `OverviewGerente.test.tsx` "trocar de projeto refaz o Pass Rate por modelo"; e2e |
| CA-06 | Integração + unidade (front) | `test_resumir_time_andamento_por_setor`; `OverviewAdmin.test.tsx` |
| CA-07 | Integração | `test_resumir_time_concluidos_por_semana_usa_a_ultima_entrada_em_done` (spec 063), com escopo da unidade |
| CA-08 | Integração + unidade (front) | `test_pass_rate_por_projeto_unidade_inteira`; `OverviewAdmin.test.tsx` |
| CA-09 (falha) | Unidade (front) | `OverviewGerente.test.tsx` "sem In Fixes, retrabalho vazio e os outros na tela" |
| CA-10 (falha) | Integração + unidade (front) | `test_pass_rate_por_projeto_ignora_projeto_sem_rodada`; `OverviewGerente.test.tsx` "Pass Rate por modelo vazio" |
| CA-11 (falha) | Integração + funcional | `test_falha_resumir_time_fora_do_escopo_nao_mostra_nada` (ampliado); `test_overview_time_gerente_so_consulta_o_escopo` |

## Ajuste de 2026-11-06: cabeçalho do admin (RN-12)

- Backend: a consulta por projeto do `resumir_time` ganha a contagem em andamento (`em_andamento_por_projeto`
  no `ResumoTime`), e o `DoneProjetoResponse` ganha o campo `em_andamento`. Sem rota nova.
- Frontend: o `OverviewAdmin` passa a ter o próprio cabeçalho (saudação, frase, seletor e os três cards do projeto
  escolhido), e a `OverviewPage` não mostra o `OverviewHeroCard` para o admin. A frase usa o total e os concluídos
  do `GET /api/overview`, que já é a unidade inteira para o admin. O seletor guarda o projeto só na tela, sem
  consultar o `/projetos/{id}`.

## Riscos e decisões pendentes

- **Campos calculados para todos:** o KP recebe os quatro campos novos sem usá-los. São consultas agrupadas sobre os
  mesmos Test Cases do escopo, e separar uma rota só para isso duplicaria o escopo e os filtros.
- **Integração sem banco de teste:** os testes de integração da spec 063 (T01, T02, T05 e T07) ainda não rodaram
  contra um Postgres. Os desta spec ficam na mesma situação até existir um banco de teste separado.
- **Pass Rate por projeto com resultados de vários devices:** a rodada mais recente pode ter só parte dos modelos.
  O Pass Rate conta os resultados que existem, sem completar os modelos que faltam, igual ao Pass Rate por modelo.
