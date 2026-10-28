# 026. Justificativa ao excluir um Test Case: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0009, 0010, 0012, 0013, 0016, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

O Test Case ganha o campo `justificativa_exclusao` (texto opcional, até 500 caracteres). A entidade passa a
controlar o campo numa única mudança de Status: ao entrar em `Cancelled`, grava a justificativa recebida; ao
sair de `Cancelled`, apaga a justificativa (RN-06). Se o TC já estava em `Cancelled`, a justificativa atual
é mantida.

A regra "excluir exige justificativa" (RN-01 e RN-03) fica no request, com o Pydantic (ADR 0006):
- `status = Cancelled` sem justificativa válida dá `422`;
- justificativa enviada sem `status = Cancelled` também dá `422`.

O texto chega já sem espaços nas pontas, e um texto vazio conta como ausente. A entidade não exige a
justificativa na reidratação, porque os TCs excluídos antes desta spec não têm uma (RN-07).

O service aceita `justificativa_exclusao` nos três caminhos que já existem:
- **gestão:** entra em `CAMPOS_GESTAO`;
- **responsável:** entra em `CAMPOS_RESPONSAVEL`;
- **Backup:** que hoje só pode enviar `{status: Cancelled}`, passa a enviar `{status, justificativa_exclusao}`.

As permissões não mudam (CA-07).

No frontend:
- **Confirmação de exclusão na linha:** o `AlertConfirm` ganha um campo de texto de justificativa e
  `isConfirmDisabled`.
- **Painel de edição da gestão:** mostra o mesmo campo quando o Status muda para `Excluded`.
- **Listagem:** ganha uma coluna "Notes" com um ícone. O clique abre um `SideDrawer` só de leitura com o rótulo
  "Justificativa" e o texto. Tudo em HeroUI (ADR 0037).

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| CasoTeste | justificativa_exclusao | `str \| None` (500) | Preenchido só ao entrar em `Cancelled`. Apagado ao sair. Nulo nos excluídos antigos |

A migration Alembic nova adiciona `casos_teste.justificativa_exclusao VARCHAR(500) NULL`, sem preencher
dados. Ela é aplicada quando a API inicia (ADR 0012).

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| PUT | `/api/test-cases/{id}` | Campo novo e opcional: `justificativa_exclusao: string` (1 a 500 caracteres, sem os espaços nas pontas). Obrigatório quando `status = "Cancelled"` | `200` com `justificativa_exclusao` no `CasoTesteResponse` | `422`: `status = Cancelled` sem justificativa, justificativa vazia ou acima de 500 caracteres, ou justificativa sem `status = Cancelled`. `403` e `404` como hoje |
| GET | `/api/projetos/{id}/test-cases` (listagem) | sem mudança | Cada item traz `justificativa_exclusao: string \| null` | sem mudança |

## Backend: arquivos

- `domain/entities/caso_teste.py`:
  - `JUSTIFICATIVA_EXCLUSAO_MAX_LENGTH = 500`;
  - atributo `justificativa_exclusao`;
  - `_mudar_status(status, justificativa)`, usado por `atualizar_campos_do_responsavel` e
    `atualizar_gerenciamento`;
  - `cancelar(justificativa)`.
- `infrastructure/data/models/caso_teste_model.py`: a coluna nova.
- `infrastructure/data/migrations/versions/<rev>_justificativa_exclusao_caso_teste.py`: a migration, com
  `down_revision = f901a2b3c4d5`.
- `infrastructure/repositories/caso_teste_repository.py`: `_to_entity` e `_to_model` levam o campo novo.
- `application/schemas/caso_teste.py`:
  - campo no `AtualizarCasoTesteRequest`, com normalização `mode="before"`, e regra cruzada no
    `model_validator`;
  - campo no `CasoTesteResponse` e no `to_response`.
- `application/services/caso_teste_service.py`:
  - os conjuntos de campos de cada caminho;
  - o caminho do Backup;
  - repassar a justificativa à entidade.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts` (tipos `CasoTeste` e `AtualizarCasoTesteInput`): `justificativa_exclusao`.
- `shared/ui/alert-confirm.tsx`: `children` opcional no corpo e `isConfirmDisabled`.
- `shared/ui/form-field.tsx`: `TextAreaField`, no mesmo padrão do `TextInputField`, com limite e contador.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`:
  - a confirmação de exclusão passa a pedir a justificativa, e ela vai no `PUT` junto com o status;
  - a coluna "Notes" com o ícone e o drawer de leitura, visíveis para qualquer perfil (RN-05).
- `modules/projetos/components/casos-teste/CasoTesteDrawer.tsx`: o campo de justificativa aparece quando o
  Status muda para `Cancelled`. Ele é obrigatório para salvar.
- `modules/projetos/components/casos-teste/JustificativaExclusaoDrawer.tsx` (novo): o painel só de leitura.
- `core/i18n/resources.ts`: as chaves novas em EN, PT e KO.
- `core/mock/database.ts`: as mesmas regras do backend.
- A coluna nova segue a skill `table-rules`: largura fixa, ícone com `aria-label` e célula vazia sem texto.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + Funcional + Componente | `test_responsavel_altera_o_status_livremente[Done-Cancelled]`; `test_backup_exclui_tc_atribuido_com_justificativa`; `test_excluir_com_justificativa_retorna_200`; Vitest "permite ao backup cancelar, sem liberar edição dos demais campos" |
| CA-02 | Componente | Vitest "abre a justificativa pelo ícone de observações para o perfil Developer" |
| CA-03 | Unidade + Componente | `test_gestor_exclui_com_justificativa_e_reativar_apaga`; Vitest "exige justificativa no drawer de edição ao mudar o Status para Excluded e a esconde ao voltar" |
| CA-04 | Domínio + Schema + Funcional + Componente | `test_excluir_sem_justificativa_levanta_erro_e_nao_muda_o_status`; `test_request_exige_justificativa_ao_excluir`; `test_excluir_sem_justificativa_valida_retorna_422`; Vitest do backup (botão desabilitado com texto vazio ou só espaços) |
| CA-05 | Domínio + Schema + Funcional | `test_excluir_com_justificativa_acima_de_500_levanta_erro`; `test_request_aceita_justificativa_de_500_caracteres_e_recusa_acima`; `test_excluir_sem_justificativa_valida_retorna_422` |
| CA-06 | Domínio + Unidade + Integração | `test_sair_de_cancelled_apaga_justificativa`; `test_gestor_exclui_com_justificativa_e_reativar_apaga`; `test_caso_persiste_com_responsaveis_e_tc_id_e_unico_no_projeto` (trecho da spec 026) |
| CA-07 | Unidade | `test_backup_e_dev_sem_vinculo_nao_mudam_status` |
| RN-07 | Integração | `test_migration_justificativa_exclusao_mantem_excluidos_sem_texto` |
| Mock | Vitest | `exige justificativa ao excluir o TC e a apaga ao reativar` |

## Riscos e decisões pendentes

- **Mock antigo:** um mock persistido no localStorage tem TCs excluídos sem o campo. O frontend trata
  `undefined` como `null`, sem bump de schema do mock.
- **Nome da coluna:** fica "Notes" (Observações em PT). Se quiser outro rótulo, é só trocar a chave i18n.
