# 075. End date e Planned date nos Test Cases: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0006 (ProblemDetails), 0007, 0010 (testes), 0033 (erros de planilha com código), 0034,
  0042 (exportação para Excel), 0054 (termos em inglês)
- **ADRs novos propostos:** nenhum

## Abordagem
Sem coluna nova no banco. A Planned date da planilha vira a `data_planejada` do projeto que a spec 071 já tem, e o
início do planejamento é o dia da importação. O leitor da planilha existe nos dois lados (backend, que valida e cria,
e frontend, que monta a prévia), e os dois ganham a coluna opcional com as mesmas regras. Na tabela de Test Cases, o
rótulo "Dev done" passa a "End date" sobre o mesmo `code_done_em`; a coluna de `all_passed_em` sai da tabela, mas o
campo continua sendo calculado. A nova coluna Planned date lê a `data_planejada` do projeto que a página já carrega.
O filtro por dia, o seletor de semana e a exportação trocam `all_passed_em` por `code_done_em`.

## Modelo de dados
Não muda. `Projeto.data_planejada` e `Projeto.planejamento_iniciado_em` vêm da spec 071; `CasoTeste.code_done_em` e
`all_passed_em`, da 065.

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/projetos/importar` | planilha com a coluna opcional `Planned date` | 201 (projeto com `data_planejada`) | 422 com os códigos `data_planejada_invalida`, `data_planejada_fora_do_intervalo` e `data_planejada_divergente`, por linha (ADR 0033) |
| GET | `/api/projetos/{id}/casos-teste` | `data_final_inicio`, `data_final_fim`, `semana` | 200 (filtros sobre `code_done_em`) | como hoje |

`data_planejada_invalida` é o texto que não é data; `data_planejada_fora_do_intervalo`, a data no passado ou a mais de
dois anos (spec 071, RN-09).

## Backend: arquivos
- `application/validators/importacao_projeto.py`: coluna `Planned date` opcional, leitura de data (célula de data do
  Excel ou `dd/mm/aaaa`), mesma data em todas as linhas preenchidas, códigos novos.
- `application/services/importacao_projeto_service.py`: cria o projeto com `data_planejada` e o início do
  planejamento, com `Projeto.definir_data_planejada(data, hoje)` da 071.
- `infrastructure/repositories/caso_teste_repository.py`: filtros de data sobre `code_done_em`.

## Frontend: arquivos
- `modules/projetos/utils/planilha-projeto.ts` (e o worker): mesma leitura e os mesmos códigos; a prévia mostra a data.
- `modules/projetos/components/importacao/*`: data na prévia; mensagens dos códigos novos.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: colunas End date (`code_done_em`) e Planned date; sai a de
  `all_passed_em`; `dataFinalDoCaso`, filtros e exportação sobre `code_done_em`.
- `core/mock/database.ts`: importação com a data e filtros sobre `code_done_em`.
- `core/i18n/resources.ts`: rótulos e mensagens em en, pt-BR e ko.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + funcional | `test_importacao_projeto` (validador lê a data); `test_projetos_api`: importar cria o projeto com `data_planejada` e início no dia |
| CA-02 | Unidade | validador sem a coluna: projeto sem data |
| CA-03 | Unidade + funcional | datas diferentes: `data_planejada_divergente` na linha, 422, nada criado |
| CA-04 | Unidade | passado, mais de dois anos e texto: `data_planejada_invalida` |
| CA-05 | Unidade (front) | `ProjetoDetalhePage.test`: coluna End date com `code_done_em`, sem Code done nem a data de todos passaram |
| CA-06 | Unidade | `test_caso_teste`: segunda entrada em In Review não muda `code_done_em` (já coberto pela 065; reforçar na correção) |
| CA-07 | Unidade (front) | coluna Planned date com a data do projeto e traço sem data |
| CA-08 | Unidade (front) | nenhuma das duas colunas é editável |
| CA-09 | Integração + unidade (front) | filtro de semana sobre `code_done_em`; exportação com a nova End date |
| CA-01, CA-03 | e2e | `importacao-planilha.spec.ts`: planilha com Planned date e com datas diferentes |

## Riscos e decisões pendentes
- O Excel guarda data como número de série; o leitor precisa aceitar a célula de data e o texto `dd/mm/aaaa`, nos dois
  lados, para a prévia e o backend não discordarem.
- Os filtros de data mudam de significado para quem já usava a semana pela data em que todos passaram.
- Uma planilha de modelo em `docs/planilhas-importacao` precisa ganhar a coluna.
