# 033. Paginação na tela Resultados Gerais: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0010, 0013, 0022, 0034, 0039
- **ADRs novos propostos:** nenhum (o 0039, já aceito, cobre a decisão)

## Abordagem

O repositório passa a paginar os casos no banco (`OFFSET`/`LIMIT` + contagem), devolvendo `PagedResult` (ADR 0004).
As datas deixam de ser calculadas a partir da lista de IDs dos casos: o `listar_datas` recebe os mesmos filtros
do `listar_casos` e aplica a mesma condição por subconsulta. Assim as até 7 datas valem para todos os casos
filtrados (RN-03), sem trazer 800 IDs para a memória. Resultados e modelos da última execução continuam sendo
buscados por `IN`, agora só com os IDs da página. No frontend, a página guarda `page`/`pageSize` como as outras
telas, passa os dois na `queryKey` e volta para 1 ao trocar filtros, tamanho ou aba.

## Modelo de dados

Sem mudança de tabelas nem migration.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/form-factor/general/projetos/{projeto_id}/historico` | filtros atuais + `page` (≥ 1, padrão 1) e `page_size` (1 a 100, padrão 20) | 200 `HistoricoProjetoResponse` | 422 `page`/`page_size` inválidos (CA-08) e os de hoje (403 sem permissão, 404 projeto fora do escopo, 422 dia + semana) |

```python
class HistoricoProjetoResponse(BaseModel):
    modelos: list[FormFactorModeloResponse]
    datas: list[date]                   # até 7, de todos os casos filtrados (RN-03)
    modelo_destacado_id: UUID | None
    items: list[CasoHistoricoResponse]  # antes `casos`; só a página
    page: int
    page_size: int
    total_count: int
    total_pages: int
```

Página além da última (CA-09): 200 com `items: []`, `total_count` correto e as mesmas `datas`.

## Backend: arquivos

- `domain/entities/interfaces/historico_form_factor_repository.py`: `listar_casos` ganha `page`/`page_size` e
  devolve `PagedResult[CasoHistorico]`; `listar_datas` troca `caso_ids` pelos filtros de caso (`busca`, `tc_id`,
  `modelo_dispositivo_id`, período). Os filtros viram um objeto `FiltrosCasoHistorico` (dataclass no domain) para
  não repetir sete parâmetros nas duas assinaturas.
- `infrastructure/repositories/historico_form_factor_repository.py`: extrai a montagem dos filtros de caso para
  `_filtros_casos(...)`, usada pelo `listar_casos` (com contagem + `offset`/`limit`, ordem `tc_id, id`) e pelo
  `listar_datas` (subconsulta de IDs).
- `application/services/form_factor_service.py`: `historico_projeto` recebe `page`/`page_size`, usa os IDs da
  página para `listar_resultados` e `listar_modelos_da_ultima_execucao`.
- `application/schemas/form_factor_historico.py`: `HistoricoProjetoResponse` com os campos de página;
  `to_historico_response` recebe o `PagedResult`.
- `api/routers/form_factor_geral.py`: `page: int = Query(1, ge=1)`, `page_size: int = Query(20, ge=1, le=100)`,
  como nos outros routers.
- Testes: `tests/unit/application/services/test_form_factor_historico.py`,
  `tests/integration/test_historico_form_factor_repository.py`, `tests/functional/test_form_factor_geral_api.py`.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`: `HistoricoProjeto` passa a estender `PagedResult<CasoHistorico>` com
  `modelos`, `datas` e `modelo_destacado_id` (sai `casos`).
- `modules/projetos/api/projetos.api.ts`: `historicoProjeto(projetoId, filtros, page, pageSize)` envia `page` e
  `page_size`.
- `modules/projetos/hooks/useProjetos.ts`: `useHistoricoProjeto` com `page`/`pageSize` na `queryKey` e
  `placeholderData: keepPreviousData` para não piscar ao trocar de página.
- `core/mock/database.ts`: `historicoProjeto` pagina com o `page()` existente e calcula as datas sobre todos os
  casos filtrados.
- `modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx`: recebe `page`, `pageSize`,
  `onPageChange`, `onPageSizeChange` e passa `DataTablePagination` ao `DataTable`, como a
  `FormFactorResultadosTabela`; lê `dados.items`. Os comentários sobre o ADR 0038 saem.
- `modules/projetos/pages/ResultadosGeraisPage.tsx`: estado `pagina`/`tamanhoPagina`
  (`DEFAULT_TABLE_PAGE_SIZE`); `alterarFiltros`, `limparFiltros`, troca de tamanho e de aba voltam para a página 1.
  A escolha de modelo por linha (`escolhas`) fica como está: é por `caso_teste_id`, então sobrevive à troca de
  página e só é limpa ao trocar de aba (RN-05).
- Testes: `HistoricoProjetoTabela.test.tsx`, `ResultadosGeraisPage.test.tsx`, `core/mock/database.test.ts`,
  `e2e/resultados-gerais.spec.ts`.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração + unidade (front) | `test_listar_casos_pagina_por_tc_id_com_total`; `ResultadosGeraisPage` mostra 20 linhas e "página 1 de 3" |
| CA-02 | Integração + e2e | `test_listar_datas_iguais_em_todas_as_paginas`; e2e navega até a página 3 |
| CA-03 | Integração | `test_listar_datas_inclui_data_so_de_outra_pagina` |
| CA-04 | Unidade (front) | `ResultadosGeraisPage`: filtro, busca, período, limpar e tamanho voltam para a página 1 |
| CA-05 | Unidade (front) | `ResultadosGeraisPage`: trocar de aba abre na página 1 |
| CA-06 | Unidade (front) | `ResultadosGeraisPage`: modelo escolhido na linha persiste ao ir e voltar de página |
| CA-07 | Unidade (front) + mock | `database.test.ts`: `page_size` 50 com 45 casos dá 1 página |
| CA-08 (falha) | Funcional | novos casos `page=0`, `page_size=0` e `page_size=101` em `test_periodo_ou_filtro_invalido_retorna_422_problem_details` |
| CA-09 (falha) | Integração + unidade (service) | `test_listar_casos_pagina_alem_da_ultima_vem_vazia`; service devolve `items` vazio com `datas` |
| CA-10 (falha) | Funcional + unidade (service) | `test_403_e_404_saem_como_problem_details` (já existe) com `page=2`; service recusa o projeto fora do escopo antes de contar casos (`listar_casos` não é chamado) |

## Riscos e decisões pendentes

- **Contrato quebra:** `casos` vira `items`. Backend, frontend e mock mudam no mesmo PR; não há outro consumidor.
- **Consulta das datas:** passar de `IN (ids)` para subconsulta muda o SQL do `listar_datas`; os testes de
  integração de fuso horário e de filtro por modelo existentes cobrem a regressão.
- **Destaque do device da busca (RN-10 da spec 032):** continua por linha, calculado só para os casos da página;
  `modelo_destacado_id` não muda.
