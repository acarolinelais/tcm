# 071. Data planejada do projeto: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0012, 0013, 0015, 0016, 0030, 0037, 0051
- **ADRs novos propostos:** nenhum

## Abordagem

O projeto ganha duas colunas: `data_planejada` e `planejamento_iniciado_em`, as duas `date` e opcionais. O
`PUT /api/projetos/{id}` aceita `data_planejada`; só quando o campo vem no corpo a entidade troca a data e grava
`planejamento_iniciado_em` como o dia de hoje. O dia de hoje sai do fuso do navegador, que a rota recebe em
`fuso_horario`, como as rotas do Overview já fazem. Sem isso, um KP no Brasil depois das 21h teria a data de hoje
recusada como passado. No Overview, `linha_planejada` deixa de usar `META_DIARIA`: recebe o início, a data
planejada e os casos não Done no fim do dia do início (o `burndown_executado` já calcula isso para qualquer
instante), e devolve `None` para os dias antes do início. Sem data planejada, toda a linha é `None` e a meta também.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| Projeto | `data_planejada` | `date \| None` | não pode ser anterior a hoje no fuso de quem salva (RN-09) |
| Projeto | `planejamento_iniciado_em` | `date \| None` | gravado pelo sistema ao definir ou mudar a data; limpo ao apagar (RN-04, RN-08) |

Migration `g071..._data_planejada_projeto.py` com `down_revision = "g067a1b2c3d4"` (head atual da `dev`), só
`add_column` nullable, sem preencher nada.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| PUT | `/api/projetos/{id}?fuso_horario=` | o corpo de hoje + `data_planejada: date \| null` (opcional; ausente mantém, `null` apaga) | 200, `ProjetoResponse` com `data_planejada` | os de hoje (403 sem `projetos.gerenciar` ou time fora do escopo, 404 projeto inexistente); 422 data no passado, data inválida ou fuso inválido |
| GET | `/api/projetos` e `/api/projetos/{id}` | igual | `ProjetoResponse` com `data_planejada` | iguais |
| GET | `/api/overview/projetos/{id}` | igual | `burndown[].planejado: float \| null`; novos `data_planejada: date \| null` e `meta_diaria: float \| null` | iguais |

## Backend: arquivos

- `domain/entities/projeto.py`: `data_planejada`, `planejamento_iniciado_em` e `definir_data_planejada(data, hoje)`
  (recusa passado; `None` limpa as duas).
- `infrastructure/data/models/projeto_model.py`, o mapeamento no `projeto_repository.py` e a migration nova.
- `application/schemas/projeto.py`: `data_planejada` no request (com `model_fields_set`) e no response.
- `application/services/projeto_service.py`: `atualizar` recebe o fuso e chama `definir_data_planejada` quando o
  campo veio.
- `api/routers/projetos.py`: `fuso_horario` no PUT.
- `application/services/overview_service.py`: `linha_planejada(dias, inicio, data_planejada, restantes)` e a meta;
  sai `META_DIARIA` e o comentário `shortcut:`.
- `application/schemas/overview.py`: `planejado` opcional e decimal; `data_planejada` e `meta_diaria`.

## Frontend: arquivos

- `modules/projetos/api/projetos.api.ts` e o model: `data_planejada` no `Projeto` e no `AtualizarProjetoInput`;
  o PUT manda o fuso do navegador.
- `modules/projetos/components/EditarProjetoDrawer.tsx`: campo **Planned date** (`TextInputField type="date"`),
  com limpar; validação zod de data não passada.
- `modules/projetos/pages/ProjetosPage.tsx`: coluna **Planned date** (leitura, traço quando vazia, na exportação).
- `modules/overview/model/overview.ts`, `components/graficos/BurndownChart.tsx` e `components/OverviewKp.tsx`:
  linha planejada com lacunas, data e meta junto do título, aviso sem data planejada.
- `core/i18n/resources.ts`, `core/mock/database.ts` e `modules/overview/api/overview.mock.ts` (ADR 0030).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-09 a CA-12 | Unidade | `test_projeto.py`: data no passado recusa; `None` limpa; o início é o dia de hoje |
| CA-02, CA-04, CA-08, RN-10 | Unidade | `test_overview_service.py`: `linha_planejada` com o exemplo da CA-02, meta 3,3, lacuna antes do início e sem dia útil |
| CA-05, CA-07 | Unidade | mesmo arquivo: sem data, linha e meta `None` |
| CA-01, CA-06, CA-07 | Integração | `test_projeto_repository.py`: grava e lê as duas datas |
| CA-01, CA-09, CA-10, CA-11 | Funcional | `test_projetos_api.py`: KP salva; dev 403; passado 422; KP de outro time 403 |
| CA-02, CA-03 | Funcional | `test_overview_api.py`: o burndown traz `data_planejada` e `meta_diaria` |
| CA-01 | Unidade (Vitest) | `EditarProjetoDrawer.test.tsx` e `ProjetosPage.test.tsx`: campo, envio e coluna |
| CA-03, CA-05 | Unidade (Vitest) | `OverviewKp.test.tsx`: data e meta no título; aviso sem data |
| CA-01, CA-03 | E2E | `planejamento-projeto.spec.ts`: KP define a data e vê a meta no Overview |

## Riscos e decisões pendentes

- O `PUT` de projeto hoje é completo (`app` e `one_ui` obrigatórios). Com `model_fields_set`, quem não manda
  `data_planejada` não apaga a data por acidente.
- O planejado vira decimal (30 − 3,33 × dias). O gráfico já aceita número; a dica mostra uma casa decimal.
- O drawer de projeto e o `TextInputField` já são HeroUI (ADR 0037); o campo de data usa o `type="date"` nativo
  dele, como os filtros de data das tabelas. Sem DatePicker novo.
