# 018. Form Factor em matriz por modelo: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0017, 0022, 0030, 0034
- **ADRs novos propostos:** nenhum

## Abordagem
O endpoint `GET /api/projetos/{id}/form-factor` passa a paginar **Test Cases** em vez de resultados. O
repositório faz a consulta em dois passos: (1) a página de casos ativos do projeto, ordenada por `tc_id`,
com os filtros `responsavel_id` e semana; (2) para os casos dessa página, o resultado mais recente de cada
par (caso, modelo vinculado), com `DISTINCT ON (caso_teste_id, modelo_dispositivo_id)` ordenado por
`data_reportada DESC, importacoes_sdf.created_at DESC` (PostgreSQL, ADR 0005). O SDF ID e a Date de cada
linha vêm do resultado mais recente entre as células. A resposta mantém os campos do `PagedResult` e
ganha `modelos` (colunas da matriz, independentes da página), para o frontend montar o cabeçalho mesmo
quando a página não tem resultados. Não há mudança de schema nem migration. O filtro `one_ui`, que já não
tinha controle na interface, sai do contrato (ADR 0017: só filtros com controle na tela).

## Modelo de dados
Sem tabelas ou colunas novas. Tipos de consulta (`domain/queries`):

| Tipo | Campo | Tipo | Regras |
|---|---|---|---|
| `FormFactorModelo` | `id`, `nome` | UUID, str | Modelos com vínculo ativo em `projeto_modelos`, ordem alfabética do nome |
| `FormFactorLinha` | `caso_teste_id` | UUID | Caso ativo do projeto |
| | `tc_id` | str | Ordenação da página |
| | `responsavel_id` | UUID | Responsável principal |
| | `sdf_id` | str \| None | Execução do resultado mais recente da linha; `None` sem resultado |
| | `data_reportada` | datetime \| None | Maior data entre as células; `None` sem resultado |
| | `resultados` | dict[UUID, str] | `modelo_dispositivo_id → resultado`; modelos sem resultado ficam fora |

Com semana selecionada, os dois passos só consideram execuções com `data_reportada` no intervalo, e o
passo (1) exige `EXISTS` de resultado na semana em modelo vinculado (RN-06). Sem semana, entram todos os
casos (RN-01).

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{projeto_id}/form-factor` | query: `page` (≥1, padrão 1), `page_size` (1–100, padrão 20), `semana` (`YYYY-Www`, opcional), `responsavel_id` (UUID, opcional) | 200 `FormFactorResponse` | 403 sem `form_factor.consultar`; 404 projeto inexistente, de outra unidade ou fora do escopo; 422 `semana` ou `responsavel_id` inválidos |

```json
{
  "modelos": [{ "id": "…", "nome": "SAMSUNG S25" }, { "id": "…", "nome": "SAMSUNG S26" }],
  "items": [{
    "caso_teste_id": "…", "tc_id": "TC-001", "responsavel_id": "…",
    "sdf_id": "SDF-10", "data_reportada": "2026-10-20T12:00:00Z",
    "resultados": { "<id S25>": "Pass", "<id S26>": "Fail" }
  }],
  "page": 1, "page_size": 20, "total_count": 1, "total_pages": 1
}
```

## Backend: arquivos
- `domain/queries/form_factor_linha.py`: substitui os campos de `FormFactorLinha` e adiciona `FormFactorModelo`.
- `domain/entities/interfaces/resultado_form_factor_repository.py`: `listar_form_factor_por_projeto(unidade_id, projeto_id, page, page_size, inicio, fim, responsavel_id)` e `listar_modelos_do_projeto(unidade_id, projeto_id)`.
- `infrastructure/repositories/resultado_form_factor_repository.py`: nova consulta em dois passos, sempre filtrando `unidade_id` em todas as tabelas (ADR 0013).
- `application/schemas/form_factor.py`: `FormFactorModeloResponse`, nova `FormFactorLinhaResponse`, `modelos` em `FormFactorResponse`, mapeamento manual (ADR 0007).
- `application/services/interfaces/form_factor_service.py` e `application/services/form_factor_service.py`: troca `one_ui` por `responsavel_id`; autorização e escopo intactos (RN-10).
- `api/routers/projetos.py`: troca o query param `one_ui` por `responsavel_id: UUID | None`.

## Frontend: arquivos
- `modules/projetos/model/projeto.ts`: `LinhaFormFactor` e `ModeloFormFactor` novos; `FormFactorResultado` (PagedResult + `modelos`).
- `modules/projetos/api/projetos.api.ts`: `formFactorApi.listar` com `responsavelId`, sem `oneUi`.
- `core/mock/database.ts`: `mockFormFactorApi.listar` monta a matriz a partir de `casosTeste`, `formFactor` e dos modelos do projeto, com os mesmos filtros (ADR 0030).
- `modules/projetos/hooks/useProjetos.ts`: `useFormFactor` com `responsavelId` na query key; a página passa a usar o hook.
- `modules/projetos/components/FormFactorTabela.tsx` (novo): tabela da aba com colunas dinâmicas, filtro de coluna Assignee (`TableColumnFilter`, igual ao da aba Test Cases), badge para `Pass`/`Fail`, "—" nas células vazias, estado vazio com "Limpar filtros", paginação padrão 20 (skill `table-rules`, ADRs 0022 e 0034).
- `modules/projetos/ProjetoDetalhePage.tsx`: estado do filtro Assignee do Form Factor e uso de `FormFactorTabela`; remove a coluna One UI.
- `core/i18n/resources.ts`: textos novos em en/pt/ko; remove `oneUi` se ficar sem uso.
- `e2e/form-factor.spec.ts` e `e2e/projetos-fixtures.ts`: cenários da matriz.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração | `test_form_factor_lista_todos_os_casos_mesmo_sem_resultado` |
| CA-01 | Unidade (front) | `FormFactorTabela.test.tsx`: colunas por modelo e "—" sem resultado |
| CA-02 | Integração | `test_form_factor_agrupa_resultados_por_modelo_na_mesma_linha` |
| CA-02 | Unidade (front) | `FormFactorTabela.test.tsx`: badges de `Pass` e `Fail` |
| CA-03 | Integração | `test_form_factor_mostra_resultado_mais_recente_por_modelo` |
| CA-04 | Unidade (front) | `FormFactorTabela.test.tsx`: sem coluna One UI |
| CA-05 | Funcional | `test_consultar_form_factor_filtrando_por_responsavel` |
| CA-05 | Unidade (front) | `ProjetoDetalhePage.test.tsx`: filtro Assignee volta para a página 1 |
| CA-06 | Integração | `test_form_factor_com_semana_considera_so_resultados_da_semana` |
| CA-07 | Integração | `test_form_factor_pagina_por_caso_de_teste` |
| CA-08 | Unidade (front) | `FormFactorTabela.test.tsx`: estado vazio com "Limpar filtros" |
| CA-09 | Funcional | `test_gerente_nao_consulta_form_factor_de_setor_fora_do_escopo`, `test_form_factor_de_projeto_de_outra_unidade_nao_e_consultado` (existentes) |
| CA-10 | Unidade | `test_perfil_sem_permissao_nao_consulta_form_factor` (existente) |
| CA-11 | Funcional | `test_filtro_de_semana_com_formato_invalido_retorna_422` (existente), `test_responsavel_id_invalido_retorna_422` |
| CA-01, CA-02, CA-05 | E2E | `form-factor.spec.ts`: matriz após importar relatório e filtro Assignee |

## Riscos e decisões pendentes
- **`modelos` junto do `PagedResult`:** o ADR 0004 pede `PagedResult` nas listagens; os campos dele continuam
  iguais e `modelos` é metadado extra da página. Se isso for visto como desvio, a alternativa é um endpoint
  separado para as colunas (mais uma requisição).
- **Desempate de resultados com a mesma `data_reportada`:** vence a importação mais recente
  (`importacoes_sdf.created_at`).
- **Performance:** `DISTINCT ON` roda só para os casos da página (até 100). Sem índice novo por enquanto; se
  ficar lento, um índice em `execucoes_sdf (caso_teste_id, data_reportada)` resolve, com migration própria.
- **Contrato quebra para clientes antigos:** o formato da resposta muda; o único cliente é o frontend deste
  repositório, atualizado na mesma spec.
