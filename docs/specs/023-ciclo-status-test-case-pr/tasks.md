# 023. Ciclo de Status do Test Case com PR e correções: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Acrescentar `InFixes` e levar `FAIL` para ele**
  - Arquivos: `domain/entities/caso_teste.py`, `infrastructure/data/models/caso_teste_model.py`, testes de domínio.
  - Cobre: CA-03, CA-04.
  - Verificação: `uv run pytest tests/unit/domain` → `FAIL` em algum modelo leva a `InFixes`, `PASS` em todos leva a `Done`, parcial mantém `InValidation`, Status inválido é rejeitado.
- [x] **T02. Migration da constraint e dos TCs em revisão com `FAIL`**
  - Arquivos: `infrastructure/data/migrations/versions/<rev>_status_in_fixes.py`, `tests/integration/test_migration_status_in_validation.py` (ou um teste novo de migration).
  - Cobre: CA-10.
  - Verificação: `uv run pytest tests/integration -k migration` (com `SDF_TEST_DATABASE_URL`) → `InReview` com `FAIL` na execução mais recente vira `InFixes`; `InReview` sem `FAIL`, ou com `FAIL` só numa execução antiga, continua `InReview`; o downgrade devolve `InFixes` para `InReview`.
- [x] **T03. Nova tabela de transições do responsável**
  - Arquivos: `application/services/caso_teste_service.py`, testes unitários do service, `tests/functional/test_casos_teste_api.py`.
  - Cobre: CA-01, CA-02, CA-05, CA-06, CA-07, CA-08, CA-09.
  - Verificação: `uv run pytest tests/unit/application/services/test_caso_teste_service.py tests/functional/test_casos_teste_api.py` →
    - o principal faz `To-Do`→`InProgress`→`InReview`→`InValidation` e `InFixes`→`InReview`;
    - `InProgress`/`InFixes`→`InValidation` e DEV para `Done`/`InFixes` dão 409;
    - o gestor move `InReview`→`InValidation`;
    - o principal, o Backup e a gestão cancelam;
    - o DEV não atribuído recebe 403.
- [x] **T04. Atualizar o ciclo de rodadas para `InFixes`**
  - Arquivos: `tests/integration/test_ciclo_rodadas_form_factor.py`, `tests/unit/application/services/test_form_factor_service.py`.
  - Cobre: CA-03, CA-05.
  - Verificação: `uv run pytest tests/integration/test_ciclo_rodadas_form_factor.py tests/unit/application/services/test_form_factor_service.py` → `FAIL` leva a `InFixes`, a correção passa por `InReview` → `InValidation` e a segunda rodada preserva o histórico.

## Fase 2: frontend e E2E

- [x] **T05. Tipos, rótulos e badge de `InFixes` e `Excluded`**
  - Arquivos: `modules/projetos/model/projeto.ts`, `components/status-badge-estilos.ts`, `core/i18n/resources.ts` e `resources.test.ts`.
  - Cobre: CA-11.
  - Verificação: `npm test -- resources status` → `statusInFixes` existe em PT/EN/KO (`Em correção`/`In Fixes`/`수정 중`) e `statusCancelled` exibe `Excluído`/`Excluded`/`제외됨`.
- [x] **T06. Opções de Status do DEV na tabela de Test Cases**
  - Arquivos: `modules/projetos/ProjetoDetalhePage.tsx` e `ProjetoDetalhePage.test.tsx`.
  - Cobre: CA-01, CA-05, CA-06, CA-07, CA-08, CA-09.
  - Verificação: `npm test -- ProjetoDetalhePage` → cada Status mostra só o próximo passo permitido mais `Excluded`; `Done`/`In Fixes` nunca aparecem como opção do DEV; o Backup vê só `Excluded`.
- [x] **T07. Mock com as mesmas regras e migração do schema 17 → 18**
  - Arquivos: `core/mock/database.ts` e `database.test.ts`.
  - Cobre: CA-03, CA-06, CA-10.
  - Verificação: `npm test -- database` → transições do mock iguais às da API, `FAIL` leva a `InFixes` e o schema 18 converte `InReview` com `FAIL` na última execução.

## Fase 3: Resumo do Form Factor simplificado e E2E

- [x] **T08. Rodada pendente e Backup nas linhas do Resumo**
  - Arquivos: `domain/queries/form_factor_linha.py`, `infrastructure/repositories/resultado_form_factor_repository.py`, `application/schemas/form_factor.py` e testes de integração do repositório.
  - Cobre: CA-13, CA-14.
  - Verificação: `uv run pytest tests/integration/test_resultado_form_factor_repository.py tests/unit/application/services/test_form_factor_service.py` →
    - a linha traz `backup_id`;
    - `rodada_pendente_id` aponta para a rodada mais recente sem resultados;
    - o campo fica `null` depois do registro e para TC sem rodada.
- [x] **T09. Tabela única no Resumo com "Registrar resultado" na linha**
  - Arquivos: `ProjetoDetalhePage.tsx`, `FormFactorTabela.tsx`, `FormFactorResultadosTabela.tsx`, remoção de `FormFactorRodadaTabela.tsx` e do hook da rodada, `model/projeto.ts`, `api/projetos.api.ts`, `core/mock/database.ts`, i18n e testes de componente.
  - Cobre: CA-12, CA-13, CA-14.
  - Verificação: `npm test && npm run lint` →
    - sem a lista de elegíveis nem o painel da rodada;
    - a ação aparece só para gestão/principal/Backup com rodada pendente;
    - o registro envia para `rodada_pendente_id` e atualiza a linha.
- [x] **T10. E2Es do novo ciclo e do Resumo simplificado**
  - Arquivos: `frontend/e2e/form-factor-rodadas.spec.ts`, `frontend/e2e/form-factor.spec.ts`.
  - Cobre: CA-01, CA-03, CA-05, CA-11, CA-12, CA-13.
  - Verificação: `npx playwright test e2e/form-factor-rodadas.spec.ts e2e/form-factor.spec.ts` (com a API real ativa) →
    - o setup passa por `In Review` antes de `In Validation`;
    - o DEV registra pela linha do Resumo;
    - o `FAIL` exibe `In Fixes` e a correção volta por `In Review`;
    - o histórico das duas rodadas é preservado.

> Validação executada: backend completo (500 testes) num PostgreSQL limpo; frontend completo (229 testes), tsc e lint; E2Es de Form Factor e DEV (10) contra uma API dedicada na porta 8001. A code-review da spec foi aplicada: o resultado não tira da validação um TC que já saiu dela, a migration ignora importações removidas, o mock filtra vínculos inativos e a coluna Actions só aparece quando há ação. O restante foi para o Backlog.

## Backlog

- **Setup duplicado nos testes de migration.** `test_migration_status_in_fixes.py` repete a busca de time/usuários e o INSERT de projeto de `test_migration_status_in_validation.py`, de onde também importa `_inserir_caso`/`_status`. Extrair para um `tests/integration/_migration_helpers.py` compartilhado.
- **`casos_elegiveis` sem leitor.** O backend (`form_factor_service.py`) e o mock ainda montam `casos_elegiveis`, e o tipo `CasoFormFactorElegivel` continua no frontend, mas a tela deixou de usá-los. O campo faz parte do contrato da API. Removê-lo exige uma decisão de contrato.
- **Rota de TCs da rodada sem consumidor.** `GET /api/projetos/{id}/form-factor/rodadas/{rodada_id}/test-cases` (router, `listar_casos_rodada` e o método do repositório) não tem mais chamada no frontend. Avaliar se ela deve ser removida ou mantida para integrações.
- **Campos de rodada não lidos no histórico.** O frontend não lê mais `rodada_id` nem `resultados_registrados` de `FormFactorExecucao`; o mock ainda os preenche.
- **Teste de seed sensível ao estado do banco.** `test_bootstrap.py::test_migration_seed_perfil_kp_por_unidade_e_idempotente` falha quando a suíte roda pela segunda vez no mesmo banco ("não possui perfil USUARIO_PADRAO"), mas passa num banco limpo. Isolar o teste num schema descartável.
- **Rodada pendente antiga fica inacessível (decisão de produto).** Se um TC em `In Validation` entra na rodada 1 sem receber resultados e a gestão cria a rodada 2, ele é capturado de novo. A ação da linha grava na rodada 2, e a execução da rodada 1 fica vazia para sempre no histórico. Decidir entre: (a) não recapturar TCs com execução pendente; (b) permitir escolher a rodada no diálogo; (c) aceitar a linha vazia no histórico.
- **Filtros do Resumo escondem TCs sem resultado.** Os filtros de semana, SDF ID ou resultado mantêm só TCs que já têm resultado. Com um deles ativo, os TCs recém-capturados numa rodada e a ação "Registrar resultado" deles somem. O comportamento vem da spec 018, mas pesa mais agora que a linha é o único ponto de registro.
- **Casos de borda da migração 18 do mock.** A migração considera só `caso_teste_id`, ignorando linhas antigas que têm apenas `tc_id`, e trata `execucao_id` ausente como uma execução única. O impacto se limita ao modo mock.
