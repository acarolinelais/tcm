# 024. Rodada Form Factor acumulada: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003 (camadas), 0004 (Repository + UnitOfWork), 0005 (SQLAlchemy), 0009 (frontend
  modular), 0010 (testes), 0013 (isolamento por unidade), 0015 (papéis e posse das tasks)
- **ADRs novos propostos:** nenhum

## Abordagem

Não há mudança de modelo de dados nem de contrato: a participação de cada TC numa rodada já está gravada nas
execuções de rodada (spec 022). A 024 muda três regras:

1. **Captura (RN-01):** `listar_em_validacao` vira `listar_elegiveis_para_rodada`, com Status `InValidation`
   ou `Done`. `criar_rodada` e a lista `casos_elegiveis` do Resumo passam a usá-lo.
2. **Status (RN-02):** `CasoTeste.registrar_resultado_form_factor` passa a tratar `Done`: algum `FAIL` leva a
   `InFixes`; o resto mantém `Done`. `InValidation` segue igual, e os demais Status continuam sem mudar.
3. **Resumo (RN-03):** em `listar_form_factor_por_projeto`, o filtro `status == InValidation` vira
   `status != Cancelled` E (`status == InValidation` OU o TC tem execução na rodada mais recente do projeto).
   A rodada mais recente do projeto é a rodada ativa com maior `created_at`. Corte (RN-12), SDF ID e ação de
   registrar (RN-13) não mudam.

O mock (`core/mock/database.ts`) recebe as três regras. No frontend muda só o texto de apoio acima da tabela,
que hoje diz que os TCs em `In Validation` estão prontos para uma rodada.

## Modelo de dados

Sem alteração. Sem migration.

## Contrato da API

Sem rota nova nem campo novo. Muda o comportamento de:

| Verbo | Rota | Mudança |
|---|---|---|
| POST | `/api/projetos/{id}/form-factor/rodadas` | Captura `InValidation` + `Done`; 409 se nenhum TC elegível |
| GET | `/api/projetos/{id}/form-factor` | Linhas: rodada mais recente do projeto + `InValidation` fora dela, sem `Cancelled`; `casos_elegiveis` com `InValidation` + `Done` |
| POST | `/api/projetos/{id}/form-factor/rodadas/{rodada_id}/test-cases/{caso_id}/resultados` | `Done` + `FAIL` passa a `InFixes` |

## Backend: arquivos

- `domain/entities/caso_teste.py`: `registrar_resultado_form_factor` trata `Done`.
- `domain/entities/interfaces/caso_teste_repository.py` e `infrastructure/repositories/caso_teste_repository.py`:
  `listar_em_validacao` → `listar_elegiveis_para_rodada` (`InValidation`, `Done`).
- `application/services/form_factor_service.py`: `criar_rodada` e `listar` usam o método renomeado; a
  mensagem do 409 passa a citar `In Validation` ou `Done`.
- `infrastructure/repositories/resultado_form_factor_repository.py`: filtro de casos do Resumo (RN-03).
- Testes: unidade de domínio (`tests/unit/domain/test_caso_teste.py`) e do service, integração do repositório de casos e do
  Resumo, e o ciclo de rodadas `tests/integration/test_ciclo_rodadas_form_factor.py`.

## Frontend: arquivos

- `core/mock/database.ts` e `database.test.ts`: `criarRodada` (captura), `listar` (linhas do Resumo) e
  `registrarResultadosRodada` (Status de `Done`).
- `modules/projetos/ProjetoDetalhePage.tsx` e `core/i18n/resources.ts`: novo texto de apoio em PT/EN/KO
  (algo como "Test Cases in In Validation or Done enter the next test round.").
- `e2e/form-factor-rodadas.spec.ts`: conferir e ajustar as contagens da segunda rodada.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração + mock | Três rodadas acumulam 200 → 400 → 500 com todos `PASS` (escala reduzida no teste) |
| CA-02 | Integração + mock | TC em `InFixes` fica fora da rodada e volta a entrar depois de `InValidation` |
| CA-03 | Unidade (domínio) + funcional | `Done` + `FAIL` → `InFixes`, salvo junto com os resultados |
| CA-04 | Unidade (domínio) | `Done` + `PASS` total ou parcial continua `Done` |
| CA-05 | Integração + mock | Resumo lista a rodada mais recente (incluindo `Done`) e os `InValidation` fora dela |
| CA-06 | Funcional | DEV principal/Backup registra resultados de um TC `Done` da rodada |
| CA-07 | Unidade (service) + mock | Sem `InValidation` nem `Done`: 409 e nenhuma rodada gravada |
| CA-08 | Integração | `InReview`, `InProgress`, `To-Do` e `Cancelled` não são capturados nem listados como da rodada |
| CA-09 | Funcional | DEV sem vínculo com TC `Done` recebe 403 e o Status continua `Done` |

## Riscos e decisões pendentes

- **Rodadas grandes:** cada rodada passa a gravar uma execução por TC aprovado (500 por SDF no exemplo). A
  criação continua numa transação só; o volume é baixo para o Postgres, mas o índice sobre
  `execucoes_sdf(caso_teste_id, data_reportada)` do Backlog da 022 ganha peso.
- **TC editado à mão para `Done`:** a gestão tem edição livre de Status (spec 023); um TC marcado `Done`
  manualmente também entra na rodada. Aceito, pela regra ser por Status.
- **Um TC `Excluded` depois de capturado** continua na rodada (histórico), mas some do Resumo pela RN-03.
- **E2E de duas rodadas:** o cenário atual pode assumir que um TC `Done` não volta na segunda rodada; ajustar
  na task de E2E.
