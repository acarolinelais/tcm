# 025. SDF ID único por rodada no projeto: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0009, 0010, 0013, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

A verificação fica no `FormFactorServiceImpl.criar_rodada`, antes de criar a rodada e as execuções. O
repositório de rodadas ganha uma consulta que diz se o projeto já tem uma rodada ativa com aquele SDF ID,
comparando `lower(trim(sdf_id))`. O request normaliza o SDF ID: remove os espaços das pontas e trata o
texto vazio como "sem SDF ID", para que rodadas sem SDF ID não colidam entre si (RN-03).

A repetição sai como `409` com `errors: [{campo: "sdf_id", ...}]`. O `errors` já faz parte do
ProblemDetails (ADR 0006). Hoje o `409` não informa o campo, e a criação já devolve `409` por outro motivo
(nenhum TC em `In Validation`). Por isso `ConflictException` passa a aceitar um `campo` opcional, e o handler
o traduz para `errors`. O diálogo usa esse campo para mostrar o erro no SDF ID e manter o modal aberto
(RN-04). Os outros erros continuam no toast.

Não há índice único no banco: o banco local já tem rodadas repetidas, e a RN-05 as mantém.

## Modelo de dados

Sem mudança de schema e sem migration.

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| RodadaFormFactor | sdf_id | `str \| None` (50) | Gravado sem espaços nas pontas. Vazio vira `None`. Único por projeto, sem diferenciar maiúsculas, verificado só no service |

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/projetos/{id}/form-factor/rodadas` | `{ sdf_id?: string }` (sem mudança) | `201` (sem mudança) | Novo: `409` com `errors: [{campo: "sdf_id", mensagem}]` quando o SDF ID já tem rodada no projeto. Os demais (`403`, `404`, `409` sem TCs, `422`) não mudam |

## Backend: arquivos

- `src/domain/common/exceptions.py`: `ConflictException(mensagem, campo=None)`.
- `src/api/error_handling/handlers.py`: `handle_conflict` inclui `errors` quando há `campo`.
- `src/application/schemas/form_factor.py`: `CriarRodadaFormFactorLoteRequest` com `field_validator` que
  remove os espaços das pontas e converte `""` em `None`.
- `src/domain/entities/interfaces/rodada_form_factor_repository.py`: `existe_sdf_id_no_projeto(unidade_id,
  projeto_id, sdf_id) -> bool`.
- `src/infrastructure/repositories/rodada_form_factor_repository.py`: implementação com
  `func.lower(func.trim(...))`, filtrando `unidade_id`, `projeto_id` e `ativo`.
- `src/application/services/form_factor_service.py`: `criar_rodada` verifica a repetição antes de qualquer
  escrita, depois da checagem de permissão e de escopo do projeto.

## Frontend: arquivos

- `modules/projetos/components/form-factor/FormFactorCriarRodadaDialog.tsx`: recebe um `erroSdfId` e o
  mostra no `TextField` (`isInvalid` + `FieldError` do HeroUI). Esse erro some quando o valor muda (CA-06).
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: no `onError` da criação, um `ApiError` com
  `errors[].campo === "sdf_id"` vira o `erroSdfId` do diálogo. Os demais erros seguem no toast.
- `core/i18n/resources.ts`: a chave `sdfIdAlreadyUsed` em EN, PT e KO.
- `core/mock/database.ts`: `criarRodada` faz a mesma verificação e lança o mesmo erro de campo, para o modo
  mock se comportar como a API.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `test_criar_rodada_captura_todos_os_tcs_em_validacao` (SDF ID novo, já sem espaços) |
| CA-02 | Unidade + Funcional + Componente | `test_criar_rodada_com_sdf_id_repetido_recusa_sem_gravar`; `test_criar_rodada_com_sdf_id_repetido_retorna_409_com_campo`; `test_conflito_com_campo_retorna_409_com_errors`; `avisa no toast que o SDF ID já tem rodada e mantém o diálogo aberto` |
| CA-03 | Unidade (schema) + Integração | `test_request_rodada_remove_espacos_e_vazio_vira_none`; `test_existe_sdf_id_ignora_maiusculas_e_espacos` |
| CA-04 | Integração | `test_existe_sdf_id_nao_considera_outro_projeto_outra_unidade_nem_rodada_inativa` |
| CA-05 | Unidade | `test_criar_rodada_sem_sdf_id_nao_verifica_repeticao` |
| CA-06 | Componente (Vitest) | `avisa no toast que o SDF ID já tem rodada e mantém o diálogo aberto`; `mantém no toast os outros erros ao criar a rodada` |
| CA-02 a CA-05 (mock) | Vitest | `recusa SDF ID repetido no mesmo projeto, sem diferenciar maiúsculas e espaços` |

## Riscos e decisões pendentes

- **Corrida:** duas criações simultâneas com o mesmo SDF ID podem passar as duas, porque não há índice único.
  É aceitável para um fluxo manual da gestão. Um índice único parcial pode vir depois, junto com a limpeza das
  duplicatas antigas, que está fora de escopo.
- O `campo` opcional em `ConflictException` vale para qualquer service. Este plano só o usa aqui.
