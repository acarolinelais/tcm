# 065. Datas de finalização do Test Case: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0007, 0010, 0012, 0013, 0022, 0037, 0044
- **ADRs novos propostos:** nenhum

## Abordagem

Duas colunas novas em `casos_teste`, as duas só de leitura para a API. A finalização do código é regra de domínio:
`CasoTeste._mudar_status`, por onde passa toda mudança de Status, grava a data na primeira entrada em In Review.
A finalização de tudo depende de resultados de vários devices e execuções, então fica num método do
`CasoTesteRepository` que faz um `UPDATE` só: usa `_resultados_validos` e `_ordem_de_gravacao` do histórico
(a mesma regra de "mais recente" da General Results) e grava a data só onde ela ainda está vazia. Os três caminhos
que gravam resultado (importação SDF, rodada manual avulsa e registro numa rodada) chamam esse método antes do
`commit`, na mesma transação. Uma migration cria as colunas, preenche o retroativo com SQL próprio e liga as duas
colunas como ignoradas no trigger de auditoria, para elas não aparecerem no histórico nem na tela de auditoria.
No frontend, duas colunas na tabela de Test Cases de Projects, sem filtro e sem exportação (fora de escopo).

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `CasoTeste` / `casos_teste` | `code_done_em` | `timestamp` (UTC, sem fuso), nulo | Gravado na primeira transição para In Review; não muda depois (RN-01, RN-02) |
| `CasoTeste` / `casos_teste` | `all_passed_em` | `timestamp` (UTC, sem fuso), nulo | Maior `data_reportada` entre os últimos resultados de cada device do projeto, quando todos são PASS; não muda depois (RN-03 a RN-08) |

- Sem índice novo: as colunas só são lidas junto com o caso.
- Trigger de auditoria: `auditoria_ativar('casos_teste', ARRAY['updated_at', 'code_done_em', 'all_passed_em'])`.
  Um `UPDATE` que só mexe nelas não gera linha de auditoria; quando o Status muda junto, a linha sai com o campo
  `status` e sem os dois.
- Retroativo (RN-09), na migration:
  - `code_done_em`: menor `created_at` (convertido para UTC) da auditoria de `casos_teste` desse caso em que
    `new_values->>'status' = 'InReview'` e o Status anterior era outro (ou foi a criação).
  - `all_passed_em`: o mesmo cálculo do repositório, escrito em SQL na migration (a migration não importa código
    da aplicação).

## Contrato da API

Nenhuma rota nova. Mudam só as respostas que já devolvem o caso:

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{id}/casos-teste` | sem mudança | `CasoTesteResponse` ganha `code_done_em` e `all_passed_em` (`datetime \| null`, UTC) | sem mudança |
| GET/PUT | `/api/casos-teste/{id}` | sem mudança; `extra="forbid"` recusa os dois campos com 422 (CA-14) | idem, também no detalhe | 422 para campo desconhecido |

## Backend: arquivos

- `src/domain/entities/caso_teste.py`: atributos `code_done_em` e `all_passed_em`; `_mudar_status` grava `code_done_em`.
- `src/domain/entities/interfaces/caso_teste_repository.py`: `marcar_todos_aprovados(unidade_id, projeto_id, caso_ids)`.
- `src/infrastructure/data/models/caso_teste_model.py`: duas colunas.
- `src/infrastructure/repositories/caso_teste_repository.py`: mapeamento nos dois sentidos e `marcar_todos_aprovados`.
- `src/infrastructure/data/migrations/versions/g065a1b2c3d4_datas_finalizacao_caso_teste.py`: colunas, trigger e retroativo.
- `src/application/schemas/caso_teste.py`: dois campos na resposta.
- `src/application/services/importacao_sdf_service.py` e `form_factor_service.py`: chamada antes do `commit`.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`: `code_done_em` e `all_passed_em` em `CasoTeste`.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: coluna **Code done** antes de End date; a End date (célula,
  filtro por dia e exportação) passa a ler `all_passed_em`.
- `core/i18n/resources.ts`: rótulos em en, pt-BR e ko.
- `core/mock/database.ts`: o modo mock grava `code_done_em` na primeira entrada em In Review (ADR 0030).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-02 | Unidade | `test_code_done_em_*` em `tests/unit/domain/test_caso_teste_datas_finalizacao.py` |
| CA-03 | Unidade | o mesmo teste: o Board usa o mesmo `atualizar_campos_do_responsavel` do caso |
| CA-04 a CA-08, CA-12 | Integração | `tests/integration/test_caso_teste_todos_aprovados.py` (repositório contra Postgres) |
| CA-09 | Unidade | `test_form_factor_service.py`: registrar resultados chama `marcar_todos_aprovados` |
| CA-13 | Unidade | `test_importacao_sdf_service.py`: relatório recusado não chama `marcar_todos_aprovados` |
| CA-10, CA-11 | Integração | `tests/integration/test_migration_datas_finalizacao.py` |
| CA-14 | Funcional | `test_casos_teste_api.py`: PUT com `code_done_em` responde 422 |
| RN-10 | Unidade (Vitest) | `ProjetoDetalhePage.test.tsx`: Code done e End date com a data e o traço; filtro e exportação da End date pelo `all_passed_em` |

## Riscos e decisões pendentes

- O `UPDATE` em massa não passa pelo mapa de identidade da sessão (`synchronize_session=False`). Os casos carregados
  na mesma requisição ficam com o valor antigo em memória; nenhum dos três caminhos devolve o caso depois, então
  não há leitura errada. O repositório dá `flush` antes, para o `UPDATE` ver os resultados recém-adicionados.
- RN-10 pede a hora ao passar o mouse ou focar. A célula usa `<time>` com `title`; o foco por teclado não mostra a
  hora (a data continua visível). Se precisar, um Tooltip do HeroUI entra depois.
