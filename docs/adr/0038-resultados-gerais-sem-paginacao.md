# 0038. Resultados Gerais sem paginação de Test Cases

- **Status:** Aceito
- **Data:** 2026-10-28
- **Relacionado:** ADRs 0022 e 0034, spec 032
- **Exceção a:** a regra de paginação de 20 itens do ADR 0034 (e da composição de tabela do ADR 0022), só na tela
  Resultados Gerais. Os dois ADRs continuam valendo para todas as outras tabelas.

## Contexto

Na spec 032 a tela Resultados Gerais vira uma matriz por projeto: uma linha por Test Case e uma coluna por data
de execução, para comparar a evolução dos casos lado a lado. A usuária pediu que cada aba mostre todos os casos
do projeto de uma vez, sem paginação, e limitou a largura a no máximo 7 colunas de data; as datas mais antigas
só aparecem filtrando um dia ou uma semana. Os ADRs 0022 e 0034 exigem paginação com 20 itens por padrão em
toda tabela, e o `docs/specs/README.md` pede ADR para qualquer exceção.

## Decisão

- Na tela Resultados Gerais (rota `/projetos/resultados-gerais`), cada aba de projeto lista **todos** os Test
  Cases do projeto, sem `DataTablePagination` e sem `page`/`page_size` no endpoint.
- O volume é limitado pelas colunas, não pelas linhas: o endpoint devolve no máximo **7 datas**. Sem filtro, as 7
  mais recentes; com filtro de dia ou semana, as datas desse período.
- O endpoint da tela devolve a lista completa num objeto próprio, e não em `PagedResult`:

  ```python
  class HistoricoProjetoResponse(BaseModel):
      modelos: list[ModeloResponse]
      datas: list[date]          # no máximo 7, da mais recente para a mais antiga
      casos: list[CasoHistoricoResponse]  # todos os casos do projeto que passam pelos filtros
  ```

- A tabela continua com o resto da composição do ADR 0022: `DataTable`, estados de carregando, erro e vazio
  (`estadoDaTabela`) e filtros de coluna no cabeçalho. Só a paginação sai.
- Qualquer outra tela que queira dispensar a paginação precisa de um ADR próprio.

## Alternativas consideradas

- **Paginar 20 casos por página, como nas outras tabelas:** atende aos ADRs, mas a usuária quer comparar todos os
  casos do projeto de relance, e trocar de página quebra essa leitura.
- **Rolagem infinita (carregar mais ao rolar):** ainda divide a lista em lotes, exige mais estado no cliente e
  complica a busca e os filtros, sem ganho para projetos do tamanho atual (centenas de casos).
- **Virtualizar as linhas:** resolve listas muito grandes, mas acrescenta dependência e complexidade que o volume
  atual não justifica. Fica como evolução se o desempenho medido pedir.

## Consequências

- ✅ A pessoa vê todos os casos do projeto e a evolução por data numa tela só, como pedido.
- ✅ A resposta é limitada a 7 datas, o que mantém o tamanho proporcional ao número de casos.
- ⚠️ Projetos com milhares de casos geram respostas maiores e mais linhas no DOM; se ficar lento, a saída é
  virtualizar as linhas (nova decisão), não voltar a paginar sem conversar.
- ⚠️ Esta tela passa a ser a única exceção conhecida ao padrão de tabela; quem mantiver os ADRs 0022 e 0034
  precisa lembrar dela.
