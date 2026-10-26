# 023. Ciclo de Status do Test Case com PR e correções: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0009, 0010, 0012, 0013, 0015, 0026, 0030, 0036
- **ADRs novos propostos:** nenhum

## Abordagem

Acrescentar o valor `InFixes` ao catálogo de Status e trocar a regra de resultados da rodada: com algum `FAIL`, o
TC vai para `InFixes`, e não mais para `InReview`. O valor interno `Cancelled` continua igual, para não migrar
dados nem mudar contratos. Só o rótulo muda para `Excluded`/`Excluído`/`제외됨`.

A tabela de transições do responsável principal passa a ser:
- `To-Do` → `InProgress`
- `InProgress` → `InReview`
- `InReview` → `InValidation`
- `InFixes` → `InReview`

`Cancelled` continua permitido a partir de qualquer Status, e o Backup continua podendo só cancelar. A gestão
continua com a edição livre que já existe, o que cobre `InReview` → `InValidation` (RN-04). Uma migration amplia
a constraint e move para `InFixes` os TCs em `InReview` cuja execução Form Factor mais recente tem `FAIL` (RN-07).
O frontend e o mock seguem as mesmas regras.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `CasoTeste` | `status` | enum ampliado | `To-Do`, `InProgress`, `InReview`, `InValidation`, `Done`, `InFixes`, `Cancelled`. A constraint `ck_casos_teste_status` passa a aceitar `InFixes` |

**Migration (RN-07).** Atualizar para `InFixes` todo TC ativo em `InReview` cuja execução ativa mais recente
(`execucoes_sdf` por `data_reportada`, depois `created_at`, de qualquer origem: rodada, manual ou importação SDF)
tenha ao menos um resultado ativo `FAIL`.

**Downgrade.** `InFixes` volta para `InReview`, que era o significado anterior.

## Contrato da API

Nenhuma rota nova. Mudam só os valores e as regras:

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| PUT | `/api/test-cases/{id}` | `{ status }` aceita `InFixes` no catálogo | 200 | 409 se a transição não estiver na tabela do DEV, ou se o DEV tentar `Done`/`InFixes`; 403 se não estiver atribuído; 422 se o Status for inválido |
| POST | `/api/projetos/{id}/form-factor/rodadas/{rodada_id}/test-cases/{caso_id}/resultados` | inalterado | 201; o Status do TC passa a `InFixes` quando há `FAIL` | inalterados |

As listagens de TC e da rodada passam a devolver `InFixes` no campo `status`.

## Backend: arquivos

- `domain/entities/caso_teste.py`
  - acrescentar `IN_FIXES = "InFixes"`;
  - em `registrar_resultado_form_factor`, trocar `IN_REVIEW` por `IN_FIXES`.
- `application/services/caso_teste_service.py`: nova tabela de transições do responsável. `Done` e `InFixes`
  ficam fora dela, então o DEV recebe 409.
- `infrastructure/data/models/caso_teste_model.py`: constraint com `InFixes`.
- `infrastructure/data/migrations/versions/<rev>_status_in_fixes.py`: nova revisão sobre `e8f901a2b3c4`, com a
  constraint, a migração dos dados (RN-07) e o downgrade.
- Testes:
  - unidade: entidade e service (transições permitidas e recusadas);
  - integração: migration (TC em `InReview` com e sem `FAIL` na última execução) e o ciclo de rodadas da spec
    022 (`test_ciclo_rodadas_form_factor.py`) atualizado para `InFixes`;
  - funcional: o `PUT` devolve 409 numa transição proibida.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`: `InFixes` em `STATUS_CASO_TESTE` e em `ROTULO_STATUS` (`statusInFixes`).
- `modules/projetos/components/status-badge-estilos.ts`: estilo e ícone de `InFixes`, um tom de destrutivo/laranja
  diferente do `InReview` (âmbar).
- `modules/projetos/ProjetoDetalhePage.tsx`: opções do seletor de Status do DEV conforme a nova tabela.
- `core/i18n/resources.ts`: `statusInFixes` (`In Fixes` / `Em correção` / `수정 중`) e `statusCancelled`
  renomeado nos três idiomas (`Excluded` / `Excluído` / `제외됨`).
- `core/mock/database.ts`: as mesmas transições, `FAIL` → `InFixes` e a migração do schema mock 17 → 18 (aplica
  RN-07 sobre os dados mockados).
- Testes:
  - `database.test.ts`;
  - testes de componente da tabela de Test Cases e da rodada;
  - `resources.test.ts`;
  - E2Es `form-factor.spec.ts` e `form-factor-rodadas.spec.ts` atualizados para `In Fixes` e para o caminho
    `In Progress` → `In Review` → `In Validation`.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade/E2E | Transições do responsável no service; E2E move `To-Do` → `InProgress` → `InReview` → `InValidation` e o TC fica elegível |
| CA-02 | Unidade | Gestor no escopo move `InReview` → `InValidation` |
| CA-03, CA-04 | Unidade/integração/E2E | `registrar_resultado_form_factor` (`FAIL` → `InFixes`, `PASS` total → `Done`, parcial mantém); ciclo de rodadas |
| CA-05 | Integração/E2E | `InFixes` → `InReview` pelo DEV; histórico preservado |
| CA-06, CA-07 | Unidade/funcional | DEV para `InValidation` a partir de `InProgress`/`InFixes`, e DEV para `Done`/`InFixes`: 409, Status inalterado |
| CA-08, CA-09 | Unidade/E2E | Cancelamento pelo principal/Backup/gestão; DEV não atribuído recebe 403 (regras da 022, agora com o rótulo `Excluded`) |
| CA-10 | Integração | Migration: `InReview` com `FAIL` na última execução vira `InFixes`; sem `FAIL`, continua `InReview`; o downgrade reverte |
| CA-11 | Unidade/componente | `resources.test.ts` (chaves em PT/EN/KO) e badges/seletores exibem `In Fixes` e `Excluded` |

## Simplificação do Resumo (RN-08, RN-09)

**Backend.** Cada linha do Resumo (`FormFactorLinha` e `FormFactorLinhaResponse`) ganha dois campos:
- `backup_id`, para o frontend decidir se o Backup vê a ação;
- `rodada_pendente_id`: a rodada mais recente do TC com execução ainda sem resultados
  (`resultados_registrados = false`), ou `null`.

O campo `casos_elegiveis` continua na resposta para não quebrar contrato, mas a interface deixa de usá-lo. O
envio continua na rota existente
`POST /api/projetos/{id}/form-factor/rodadas/{rodada_id}/test-cases/{caso_id}/resultados`, que já revalida
perfil, escopo e atribuição.

**Frontend.**
- `ProjetoDetalhePage.tsx`:
  - remover a seção de elegíveis, o painel "Test Cases in round" e o estado `rodadaId`;
  - depois de criar a rodada, mostrar só o toast.
- `FormFactorTabela.tsx`: coluna de ações com "Registrar resultado" quando `rodada_pendente_id` existe e o
  usuário é da gestão, o principal ou o Backup. O diálogo de resultado usa os modelos já carregados na tabela.
- A aba Results perde a ação "Abrir rodada". `FormFactorRodadaTabela.tsx`, `useCasosRodadaFormFactor` e as
  chaves i18n que ficarem sem uso são removidos.
- Mock e testes de componente acompanham a mudança. Os E2Es de Form Factor passam a registrar pela linha da
  tabela.

| CA | Nível | Teste |
|---|---|---|
| CA-12 | Componente/E2E | O Resumo renderiza uma tabela, sem a lista de elegíveis nem o painel da rodada |
| CA-13 | Integração/componente/E2E | O repositório devolve `rodada_pendente_id`; a ação da linha envia para essa rodada e o Status muda |
| CA-14 | Integração/componente | Sem rodada pendente, `rodada_pendente_id` é `null`; usuário sem vínculo não vê a ação |

## Riscos e decisões pendentes

- A migration da spec 022 converteu o Status antigo `Fail` em `InReview` sem guardar a origem. TCs que estavam
  `Fail` e não têm execução com `FAIL` continuam em `InReview` e precisam de ajuste manual pela gestão.
- RN-07 fala em "rodada mais recente". O plano usa a execução Form Factor mais recente de qualquer origem,
  incluindo a importação SDF, porque as importações também registram `FAIL` por modelo.
- O DEV perde o atalho `InProgress` → `InValidation`. TCs parados em `InProgress` com o PR já aprovado precisam
  passar por `InReview`.
- O valor interno `Cancelled` não muda. Filtros, exportações ou integrações que usam o texto `Cancelled`
  continuam funcionando; só a interface muda o rótulo.
