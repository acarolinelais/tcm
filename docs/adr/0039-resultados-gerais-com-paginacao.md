# 0039. Resultados Gerais com paginação de Test Cases

- **Status:** Aceito; limite de 7 datas substituído por [0046](0046-resultados-gerais-com-cinco-datas.md)
- **Data:** 2026-10-29
- **Relacionado:** ADRs 0004, 0022 e 0034, spec 032
- **Substitui:** [0038](0038-resultados-gerais-sem-paginacao.md) (Resultados Gerais sem paginação)

## Contexto

O ADR 0038 tirou a paginação da tela Resultados Gerais para que cada aba mostrasse todos os Test Cases do projeto
de uma vez. Num projeto com centenas de casos (ex.: 800), a tela vira uma rolagem longa demais: fica difícil achar
um caso, perder o cabeçalho de datas é fácil, e o DOM e a resposta da API crescem com o projeto inteiro. O limite
de 7 colunas de data controla a largura, mas não o comprimento. A tela precisa voltar ao padrão de tabela dos
ADRs 0022 e 0034.

## Decisão

- A tabela da tela Resultados Gerais (rota `/projetos/resultados-gerais`) volta a ter `DataTablePagination`, com
  `DEFAULT_TABLE_PAGE_SIZE` (20) como padrão e as opções de `TABLE_PAGE_SIZE_OPTIONS`, como as outras tabelas.
- A paginação é feita no servidor (ADR 0004): o endpoint `GET .../projetos/{projeto_id}/historico` recebe
  `page` e `page_size`, e só a lista de casos é paginada.
- As **datas** (no máximo 7) e os **modelos** continuam calculados sobre todos os casos do projeto que passam
  pelos filtros, não só sobre a página. Assim as colunas não mudam quando a pessoa troca de página.
- A resposta segue o formato de página já usado em `RodadaFormFactorCasosResponse` e
  `FormFactorResultadosResponse`: os dados da tela ao lado dos campos do `PagedResult`.

  ```python
  class HistoricoProjetoResponse(BaseModel):
      modelos: list[FormFactorModeloResponse]
      datas: list[date]                  # no máximo 7, calculadas sobre todos os casos filtrados
      modelo_destacado_id: UUID | None
      items: list[CasoHistoricoResponse]  # só os casos da página (antes: `casos`, com todos)
      page: int
      page_size: int
      total_count: int
      total_pages: int
  ```

- Trocar filtro, busca, período ou aba volta para a página 1; página e tamanho entram na `queryKey` do TanStack
  Query (`docs/tables-rules.md`).
- Não há mais exceção à regra de paginação: toda tabela do frontend é paginada.

## Alternativas consideradas

- **Manter sem paginação (ADR 0038):** com 800 casos, a navegação fica inviável, que é justamente o problema que
  motiva esta decisão.
- **Virtualizar as linhas (saída prevista no ADR 0038):** resolve o custo do DOM, mas a resposta continua trazendo
  o projeto inteiro e a pessoa ainda precisa rolar centenas de linhas para achar um caso. Também adiciona uma
  dependência nova.
- **Paginar no cliente:** a API continuaria devolvendo todos os casos, e o tamanho da resposta seguiria crescendo
  com o projeto. Contraria o `docs/tables-rules.md`, que reserva a paginação no cliente para listas pequenas.

## Consequências

- ✅ A tela volta ao mesmo padrão das outras tabelas, e o tamanho da resposta e do DOM fica limitado à página.
- ✅ Os ADRs 0022 e 0034 deixam de ter exceção, o que simplifica a manutenção.
- ⚠️ Comparar todos os casos do projeto de uma vez deixa de ser possível; a pessoa compara uma página por vez ou
  usa os filtros.
- ⚠️ O endpoint muda de contrato (`casos` vira `items` paginado), o que exige ajustar backend, frontend, mock e testes
  da spec 032.
