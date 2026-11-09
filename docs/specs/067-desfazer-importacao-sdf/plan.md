# 067. Desfazer a última importação do relatório SDF: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0008, 0010, 0012, 0013, 0015, 0037, 0044
- **ADRs novos propostos:** nenhum

## Abordagem

Desfazer é exclusão lógica (ADRs 0004 e 0008): a importação fica com `ativo = false`, `desfeita_por` e
`desfeita_em`. Todas as leituras de resultado (General Results, histórico de execuções, End date, a checagem de SDF ID
repetido) já filtram `importacoes_sdf.ativo`, então os resultados somem e o SDF ID fica livre sem mexer nas consultas.
Para saber o que voltar, a importação passa a gravar, para cada caso que ela mudou de Status, o Status que aplicou
(tabela nova `importacoes_sdf_status`). Ao desfazer, o service confere que a importação é a mais recente ativa do
projeto, desativa a importação, volta para In Validation os casos que ainda estão no Status aplicado e não tiveram
outra mudança de Status depois dela, zera a End date dos casos do relatório e roda o `marcar_todos_aprovados` de novo.
Tudo num único `commit`. A origem da auditoria nessa transação é `importacao_sdf_desfeita`.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `importacoes_sdf` | `desfeita_por` | UUID, FK `usuarios.id` | nulo até desfazer |
| `importacoes_sdf` | `desfeita_em` | timestamp | nulo até desfazer |
| `importacoes_sdf_status` (nova) | `id`, `unidade_id` | UUID | tenant (ADR 0013) |
| | `importacao_sdf_id` | UUID, FK | o único (importação, caso) serve de índice |
| | `caso_teste_id` | UUID, FK | único por importação |
| | `status_aplicado` | texto | `Done` ou `InFixes` |

Uma migration Alembic (ADR 0012) com as duas colunas e a tabela. Importações anteriores à migration não têm linhas em
`importacoes_sdf_status`: desfazê-las tira os resultados, mas não mexe no Status (ver Riscos).

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{id}/relatorios-sdf/ultimo` | — | 200 `{id, sdf_id, device, data_execucao, importado_por_nome, importado_em}` ou `null` sem importação ativa | 403 sem permissão, 404 projeto fora do escopo |
| POST | `/api/projetos/{id}/relatorios-sdf/{importacao_id}/desfazer` | — | 200 `{casos_revertidos}` | 403 sem permissão; 404 projeto fora do escopo, importação inexistente ou já desfeita; 409 a importação não é mais a mais recente |

Os erros saem como ProblemDetails (ADR 0006). O POST recebe o id que o diálogo mostrou, para a CA-10 recusar se outra
importação entrou no meio. As permissões são as da importação (`form_factor.importar`, perfis admin, gerente e KP).

## Backend: arquivos

- `domain/entities/importacao_sdf.py`: `desfazer(usuario_id)` (ativo, desfeita_por, desfeita_em).
- `domain/entities/caso_teste.py`: `desfazer_resultado_sdf(status_aplicado)`: volta para In Validation se o Status
  atual é o aplicado.
- `domain/entities/importacao_sdf_status.py` (nova) e a interface do repositório.
- `domain/entities/interfaces/importacao_sdf_repository.py`: `obter_ultima_ativa(unidade_id, projeto_id)`, `atualizar`.
- `domain/queries/auditoria.py`: `OrigemAuditoria.IMPORTACAO_SDF_DESFEITA`.
- `infrastructure/data/models/importacao_sdf_model.py`, `importacao_sdf_status_model.py` (novo) e a migration.
- `infrastructure/repositories/importacao_sdf_repository.py` e `importacao_sdf_status_repository.py` (novo). O
  `listar_revertiveis` lê a auditoria e devolve os casos cuja única mudança de Status desde a importação é a dela.
- `infrastructure/repositories/caso_teste_repository.py`: `limpar_todos_aprovados(caso_ids)` (zera `all_passed_em`
  mantendo o `updated_at`, como o `marcar`).
- `application/services/importacao_sdf_service.py`: `importar` grava `importacoes_sdf_status`; novos `obter_ultima` e
  `desfazer`.
- `application/schemas/importacao_sdf.py`: `UltimaImportacaoSdfResponse`, `DesfazerImportacaoSdfResponse`.
- `api/routers/projetos.py` e `api/dependencies.py`: as duas rotas e a injeção do repositório novo.

## Frontend: arquivos

- `modules/projetos/api/projetos.api.ts`: `formFactorApi.ultimaImportacao` e `desfazerImportacao`. No modo mock a
  importação não grava nada, então `ultimaImportacao` devolve `null`.
- `modules/projetos/hooks/useProjetos.ts`: `useUltimaImportacaoSdf` (chave `["projetos", projetoId, "ultima-importacao"]`,
  invalidada pela importação) e `useDesfazerImportacaoSdf`, que invalida as mesmas consultas da importação.
- `modules/projetos/components/form-factor/AcoesGerenciaFormFactor.tsx`: botão "Undo last import" (outline) ao lado do
  Import, só quando há importação ativa.
- A confirmação usa o `AlertConfirm` de `shared/ui` (HeroUI, ADR 0037), com SDF ID, device, data da execução, quem
  importou e quando.
- `modules/projetos/components/casos-teste/AlteracaoCasoTesteItem.tsx` e a tela de Auditoria: rótulo da origem nova.
- `core/i18n/resources.ts`: textos nos três idiomas.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-02, CA-03 | Unidade | `test_caso_teste_status_sdf.py`: `desfazer_resultado_sdf` volta só no Status aplicado |
| CA-08, CA-09, CA-10, CA-11 | Unidade | `test_importacao_sdf_service.py`: permissão, sem importação, não é a mais recente, fora do escopo |
| CA-01, CA-02, CA-03, CA-04 | Integração | `test_importacao_sdf_fluxo.py`: resultados somem, Status volta, caso movido fica, End date recalculada, histórico com a origem nova |
| CA-05, CA-06 | Integração | mesmo arquivo: a anterior vira a última; o SDF ID volta a ser aceito |
| CA-08 a CA-11 | Funcional | `test_relatorios_sdf_desfazer_api.py`: 403, 404 e 409 em ProblemDetails; 200 no caminho feliz |
| CA-01, CA-07 | Unidade (Vitest) | `AcoesGerenciaFormFactor.test.tsx`: botão aparece com importação, diálogo confirma e chama a API, cancelar não chama |
| CA-09 | Unidade (Vitest) | mesmo arquivo: sem importação o botão não aparece |
| CA-10 | Unidade (Vitest) | mesmo arquivo: 409 mostra o aviso no toast |

## Riscos e decisões pendentes

- **"Ninguém moveu depois"** é: desde o `created_at` da importação (o `now()` da transação dela), a única mudança de
  Status do caso na auditoria é a própria, para o Status aplicado. A auditoria grava com `clock_timestamp()`, sempre
  depois do `now()` da mesma transação. O `transaction_id` da auditoria foi descartado: nos testes tudo roda numa
  transação só e ele não separaria a importação de uma mudança posterior.
- Importações feitas antes desta spec não têm `importacoes_sdf_status`: desfazê-las não volta Status. O diálogo não
  distingue isso; aceito porque essas importações já foram conferidas em dev.
- O `atualizar` do caso grava o caso inteiro; ele roda antes do `limpar_todos_aprovados` e do `marcar_todos_aprovados`,
  na mesma ordem da importação (spec 066, Riscos).
- O modo mock não oferece o desfazer, porque a importação mock não grava resultados.
