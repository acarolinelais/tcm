# 017. Status In Validation do Test Case: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0005, 0006, 0009, 0010, 0012
- **ADRs novos propostos:** nenhum

## Abordagem
O Status já é um enum fechado validado em três camadas: `StatusCasoTeste` no domínio, que o Pydantic usa
para validar a entrada (ADR 0006); o CHECK `ck_casos_teste_status` no banco; e a lista
`STATUS_CASO_TESTE` no frontend. Basta incluir `InValidation` entre `InReview` e `Pass` nas três e criar
uma migration Alembic aplicada na subida da API (ADR 0012). A coluna `status` é `VARCHAR(10)` e
`InValidation` tem 12 caracteres, então a migration também aumenta a coluna para `VARCHAR(20)` (o mesmo
tamanho de `situation`). As regras de permissão e de Data final não mudam: elas não dependem do valor do
Status, exceto `Pass`.

## Modelo de dados
| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `casos_teste` | `status` | `VARCHAR(10)` → `VARCHAR(20)` | CHECK passa a aceitar `To-Do`, `InProgress`, `InReview`, `InValidation`, `Pass`, `Fail` |

Migration `b3c4d5e6f708_status_in_validation` (`down_revision = "a2b3c4d5e6f7"`):
- `upgrade`: aumenta a coluna, troca o CHECK.
- `downgrade`: move os casos em `InValidation` para `InReview` (o valor anterior mais próximo), restaura o
  CHECK antigo e a coluna em `VARCHAR(10)`.

## Contrato da API
Nenhuma rota nova. `POST /api/projetos/{id}/test-cases` e `PUT /api/test-cases/{id}` passam a aceitar
`status: "InValidation"`; os demais valores fora do enum continuam retornando `422` (ProblemDetails com
o campo `status`).

## Backend: arquivos
- `src/domain/entities/caso_teste.py`: `StatusCasoTeste.IN_VALIDATION = "InValidation"`.
- `src/infrastructure/data/models/caso_teste_model.py`: `String(20)` e o CHECK atualizado.
- `src/infrastructure/data/migrations/versions/b3c4d5e6f708_status_in_validation.py`: novo.
- Testes: `tests/functional/test_casos_teste_api.py`, `tests/integration/test_caso_teste_repository.py`.

## Frontend: arquivos
- `src/modules/projetos/model/projeto.ts`: tipo, `STATUS_CASO_TESTE` e `ROTULO_STATUS`.
- `src/core/i18n/resources.ts`: `statusInValidation` em en ("In Validation"), pt ("Em validação") e
  ko ("검증 중").
- `src/modules/projetos/ProjetoDetalhePage.tsx`: entrada em `statusBadges` (violeta, ícone `ShieldCheck`),
  distinta do âmbar de In Review e do verde de Pass.
- `src/core/mock/database.ts`: conferir se valida Status; se validar, incluir o novo valor.
- Testes: `ProjetoDetalhePage.test.tsx`, `resources.test.ts`.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional | `test_responsavel_atualiza_status_para_in_validation` |
| CA-01 | Integração | `test_persiste_status_in_validation` (repositório no Postgres, valida o CHECK e o tamanho da coluna) |
| CA-01 | Unidade (front) | linha exibe o badge "In Validation" após escolher no select |
| CA-02 | Unidade (front) | filtro de Status lista "In Validation" entre "In Review" e "Pass" e filtra |
| CA-03 | Unidade (front) | drawer de edição oferece "In Validation" na ordem certa |
| CA-04 | Unidade (front) | caso em "In Validation" mostra "—" na Data final |
| CA-05 | Funcional | `test_atualizar_status_invalido_retorna_422` |
| CA-06 | Funcional | `test_membro_nao_altera_status_de_caso_alheio_para_in_validation` (403) |
| CA-07 | Integração | migration aplicada sobre casos existentes mantém o Status de cada um |

## Riscos e decisões pendentes
- **Tamanho da coluna:** sem o `ALTER COLUMN`, gravar `InValidation` falha no Postgres com erro de tamanho,
  e os testes unitários (sem banco) não pegariam. O teste de integração cobre isso.
- **Downgrade com perda:** casos em `InValidation` voltam para `InReview`. Aceitável: é só para rollback.
- **Cor do badge:** violeta é uma proposta; ajustável na revisão visual sem impacto no resto.
