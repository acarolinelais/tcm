# 063. Overview com gráficos para KP e dev: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0036, 0037, 0041, 0044, 0051
- **ADRs novos propostos:** nenhum (o 0051, Recharts, foi aceito antes desta spec)

## Abordagem

O `GET /api/overview` atual continua igual e segue alimentando os cards. Entram três leituras novas, todas
somente leitura, sem tabela nova nem migration:
- `/api/overview/time`: gráficos do escopo de times do KP. O escopo vem da mesma regra `_escopo` de hoje, então
  a spec 064 reaproveita esta rota para o gerente e o admin.
- `/api/overview/projetos/{id}`: burndown e Pass Rate do projeto escolhido.
- `/api/overview/pessoal`: gráficos do dev, só com os Test Cases em que ele é o responsável principal.

A entrada em `Done` sai da tabela de auditoria (ADR 0044), como o desempenho mensal da spec 039. Os dias e as
semanas são agrupados no fuso de quem consulta.

No frontend, a `OverviewPage` escolhe a visão pelo perfil (`KP`, `USUARIO_PADRAO`; os outros perfis ficam como
hoje até a spec 064). As visões do KP e do dev entram por `React.lazy`, então o Recharts só é baixado na Overview
(ADR 0051).

## Modelo de dados

Nenhuma tabela ou coluna nova. Leituras:

| Dado | Fonte | Regra |
|---|---|---|
| Entrada em `Done` | `auditoria_alteracoes` (INSERT já em Done ou `status` mudado para Done) | Vale a **última** entrada de cada Test Case (spec, RN-02) |
| Status num dia passado (burndown) | Última linha de auditoria do Test Case antes do fim do dia | Sem linha de auditoria, vale o status atual |
| Criação por dia | `casos_teste.created_at` | Só Test Cases ativos e não `Excluded` hoje |
| Pass Rate | `rodadas_form_factor` mais recente do projeto → `execucoes_sdf.rodada_id` → `resultados_form_factor` | % de `PASS` por `modelo_dispositivo_id` |
| Finalizados por dev | `time_membros` dos times do escopo × `casos_teste.responsavel_id` com status `Done` | Quem tem 0 aparece com 0 |

Linha de planejado do burndown: calculada no service, sem SQL. Começa no executado do primeiro dia, cai 2 por dia
útil (segunda a sexta) e para em 0. É uma função pura, coberta por testes de unidade.

## Contrato da API

Todas recebem `fuso_horario` (padrão `UTC`, IANA). Os erros saem como ProblemDetails (ADR 0006).

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/overview/time` | `?fuso_horario` | 200 `OverviewTimeResponse` | 401; 422 fuso inválido |
| GET | `/api/overview/projetos/{projeto_id}` | `?fuso_horario` | 200 `OverviewProjetoResponse` | 401; 404 projeto inexistente, inativo ou fora do escopo; 422 |
| GET | `/api/overview/pessoal` | `?fuso_horario` | 200 `OverviewPessoalResponse` | 401; 422 |

```jsonc
// OverviewTimeResponse
{ "projetos": [{ "id": "…", "nome": "…", "app": "…" }],          // ativos do escopo, em ordem alfabética (RN-04)
  "criacao_por_dia": [{ "projeto_id": "…", "projeto": "…", "media": 0.5 }],
  "concluidos_por_dev": [{ "usuario_id": "…", "nome": "…", "concluidos": 3 }],
  "concluidos_por_semana": [{ "semana": "2026-11-02", "concluidos": 2 }],   // 12 itens, segunda-feira
  "done_por_projeto": [{ "projeto_id": "…", "projeto": "…", "concluidos": 4, "total": 9 }] }
// OverviewProjetoResponse
{ "burndown": [{ "dia": "2026-11-05", "planejado": 20, "executado": 18 }],  // 30 itens
  "pass_rate": { "rodada_em": "…", "modelos": [{ "modelo_id": "…", "modelo": "…", "pass": 3, "total": 4 }] } | null }
// OverviewPessoalResponse
{ "concluidos": 5, "atribuidos": 12,
  "por_dificuldade": { "Low": 2, "Medium": 0, "High": 1 },
  "entregas_por_dia": [{ "dia": "2026-11-05", "concluidos": 1 }],           // 30 itens
  "entregas_por_semana": [{ "semana": "2026-11-02", "concluidos": 3 }] }    // 12 itens
```

A porcentagem é calculada no frontend (`concluidos / total`, `pass / total`), para o backend não arredondar.

## Backend: arquivos

Seguindo a skill `python-crud` (só leitura):
- `domain/queries/resumo_overview.py`: dataclasses `PontoDia`, `PontoSemana`, `CriacaoProjeto`, `ConcluidosDev`,
  `DoneProjeto`, `PassRateModelo`, `ResumoPessoal`.
- `domain/entities/interfaces/overview_repository.py`: `resumir_time`, `burndown_executado`, `pass_rate_ultima_rodada`,
  `resumir_pessoal`.
- `infrastructure/repositories/overview_repository.py`: as consultas. A expressão "entrou em Done" sai do
  `resumir` atual para um helper do módulo, usado pelas três.
- `application/schemas/overview.py`: `OverviewTimeResponse`, `OverviewProjetoResponse`, `OverviewPessoalResponse`
  (mapeamento manual, ADR 0007).
- `application/services/interfaces/overview_service.py` e `application/services/overview_service.py`:
  `obter_time`, `obter_projeto`, `obter_pessoal`, `linha_planejada` (pura) e a checagem de escopo do projeto,
  com o mesmo critério do `_obter_projeto_no_escopo` do Form Factor (404).
- `api/dependencies.py`: o `OverviewServiceImpl` passa a receber `ProjetoRepository` e `TimeRepository`.
- `api/routers/overview.py`: as três rotas.
- Testes: `tests/unit/application/services/test_overview_service.py`, `tests/integration/test_overview_repository.py`
  e `tests/functional/test_overview_api.py`, que já existem e ganham os casos novos.

## Frontend: arquivos

Seguindo a skill `react-crud`:
- `package.json`: `recharts` (ADR 0051).
- `core/global.css`: `--chart-4` e `--chart-5` nos dois temas e no `@theme inline` (ADR 0041). O teste de
  contraste do tema escuro passa a cobrir os tokens novos.
- `modules/overview/model/overview.ts`: os tipos novos (response e modelo da tela).
- `modules/overview/api/overview.api.ts` e `overview.mock.ts`: `obterTime`, `obterProjeto`, `obterPessoal`, com
  dados de exemplo no modo de demonstração (spec, RN-06).
- `modules/overview/hooks/`: `useOverviewTime`, `useOverviewProjeto(projetoId)` e `useOverviewPessoal` (TanStack Query).
- `modules/overview/components/graficos/`:
  - `GraficoCard.tsx`: cartão com título, resumo em texto (`sr-only`) e os estados de carregando (Skeleton do
    HeroUI), vazio (`EstadoVazio`) e erro (`ErroComRetry`). Todo gráfico fica dentro dele (RN-05).
  - `BurndownChart.tsx`: `LineChart`, com o planejado tracejado e o executado contínuo.
  - `BarrasHorizontais.tsx`: Pass Rate por modelo e Finalizados por dev.
  - `BarrasVerticais.tsx`: média de criação, Done por projeto, dificuldade e entregas por dia.
  - `LollipopChart.tsx`: `BarChart` com barra fina e um ponto na ponta, para Finalizados por semana e entregas
    por semana.
  - `DonutDone.tsx`: `PieChart` com o total de Done contra o atribuído (dev). Substitui o `TotalTcsDonePieChart`.
- `modules/overview/components/OverviewKp.tsx` e `OverviewDev.tsx`: a grade de cartões de cada perfil. O seletor
  de projeto reaproveita o `ProjetoSwitcher` de `modules/projetos`, como a Timeline já faz.
- `modules/overview/pages/OverviewPage.tsx`: escolhe a visão pelo perfil, com `React.lazy`. O dev perde o card
  All (spec, RN-13).
- `core/i18n/resources.ts`: títulos, resumos e rótulos em en, pt-BR e ko.
- `e2e/overview-graficos.spec.ts`: KP e dev com dados criados pela API, com o desenho, o seletor e o teclado.

O visual (cartões, fontes e cores) segue o protótipo do Figma. Não deu para ler o protótipo nesta fase (o MCP do
Figma bateu o limite do plano). Uma imagem exportada do protótipo resolve isso antes da Fase 3 do `tasks.md`.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + integração | `test_linha_planejada_cai_dois_por_dia_util`, `test_burndown_executado_por_dia` |
| CA-02 | Unidade (front) + e2e | `OverviewKp.test.tsx` "trocar de projeto refaz burndown e Pass Rate"; `overview-graficos.spec.ts` |
| CA-03 | Integração | `test_pass_rate_usa_so_a_rodada_mais_recente` |
| CA-04 | Integração | `test_criacao_por_dia_divide_por_trinta` |
| CA-05 | Integração | `test_concluidos_por_dev_ignora_backup` |
| CA-06 | Integração | `test_concluidos_por_semana_usa_ultima_entrada_em_done` |
| CA-07 | Integração | `test_done_por_projeto_ignora_excluded` |
| CA-08 | Funcional + unidade (front) | `test_pessoal_por_dificuldade`; `OverviewDev.test.tsx` "sem card All" |
| CA-09 | Unidade (front) + e2e | `GraficoCard.test.tsx` "título e resumo acessíveis"; e2e com axe e teclado |
| CA-10 (falha) | Funcional + unidade (front) | `test_projeto_sem_rodada_retorna_pass_rate_nulo`; `OverviewKp.test.tsx` "Pass Rate vazio" |
| CA-11 (falha) | Funcional | `test_projeto_de_outro_time_retorna_404`, `test_time_nao_lista_projeto_de_outro_time` |
| CA-12 (falha) | Unidade (front) | `OverviewKp.test.tsx` e `OverviewDev.test.tsx` "erro com tentar de novo" |

## Riscos e decisões pendentes

- **Burndown antes do histórico:** um Test Case sem linha de auditoria antes de um dia (criado antes do ADR 0044)
  usa o status atual. O executado dos dias antigos pode sair otimista. O e2e e a integração usam só dados novos.
- **Custo da consulta do burndown:** são 30 dias × os Test Cases do projeto, com a última linha de auditoria de
  cada um. Se a integração mostrar lentidão, entra um índice em `auditoria_alteracoes (row_id, created_at)` numa
  migration própria, citada aqui antes.
- **Recharts no jsdom:** o gráfico desenha vazio nos testes de unidade (ADR 0051). Os testes de unidade verificam
  os dados e o resumo em texto, e o desenho fica para o e2e.
- **Rota `/time` para outros perfis:** nesta spec, só a visão do KP usa essa rota. A spec 064 a reaproveita para o
  gerente e o admin.
- **Protótipo do Figma:** ainda não foi lido (ver Frontend).
