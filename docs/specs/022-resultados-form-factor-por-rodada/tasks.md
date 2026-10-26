# 022. Resultados Form Factor por rodada: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável. Os testes acompanham o código que cobrem.
> Implementar um bloco (fase) por vez e revisar o resultado antes de avançar.

## Fase 1: backend — domínio, persistência e permissões

- [x] **T01. Ampliar o ciclo de Status dos Test Cases**
  - Arquivos: `domain/entities/caso_teste.py`, modelo/migration de `casos_teste`, schemas e testes de domínio.
  - Cobre: RN-09, CA-13.
  - Verificação: testes unitários validam `Done` e `Cancelled`, rejeitam Status inválido e preservam `To-Do`, `InProgress`, `InReview` e `InValidation`; migration atualiza a constraint sem perder dados existentes.
- [x] **T02. Modelar rodada Form Factor e vincular execuções**
  - Arquivos: entidade/interface de repositório de rodada, modelos ORM, `ExecucaoSdf`, migration e testes de persistência.
  - Cobre: RN-01, RN-02, RN-05, RN-06, CA-01, CA-04, CA-05, CA-06.
  - Verificação: uma rodada mantém ID próprio, SDF ID opcional de até 50 caracteres e uma execução por TC elegível; execução sem resultados aparece no histórico; rodadas e resultados anteriores continuam consultáveis.
- [x] **T03. Criar rodada com snapshot de TCs em validação**
  - Arquivos: repositórios de rodada/TC/execução, service e testes unitários/de integração.
  - Cobre: RN-01, RN-08, CA-01, CA-02, CA-07, CA-08.
  - Verificação: cria a rodada e todas as execuções em uma transação; captura todos os TCs em `InValidation`, ignora outros Status, aceita SDF ID vazio ou livre até 50 caracteres e não cria rodada se não houver TC elegível.
- [x] **T04. Registrar resultados por TC e derivar o Status atomicamente**
  - Arquivos: entidades/services de Form Factor e Test Case, repositórios e testes unitários/de integração.
  - Cobre: RN-03, RN-04, RN-05, RN-10, CA-03, CA-04, CA-11, CA-14, CA-15, CA-16.
  - Verificação: salva de forma atômica resultados válidos para zero ou mais modelos; qualquer `FAIL` define `InReview`; todos os modelos com `PASS` definem `Done`; resultados parciais sem `FAIL` mantêm `InValidation`; falha de validação não grava resultado nem altera Status.
- [x] **T05. Autorizar criação, registro, cancelamento e importação SDF**
  - Arquivos: catálogo/migration de permissões, services de Form Factor e importação SDF, testes funcionais de autorização.
  - Cobre: RN-03, RN-07, RN-11, CA-03, CA-09, CA-10, CA-12, CA-17, CA-18.
  - Verificação: Admin/Gerente/KP com escopo criam rodada, registram qualquer TC capturado, cancelam TCs no escopo e importam planilhas; DEV principal/Backup registra resultados e DEV atribuído cancela somente seus TCs; DEV e perfil personalizado não importam planilhas; acesso fora do escopo é recusado.
- [x] **T06. Expor contratos e rotas da rodada e atualizar consultas históricas**
  - Arquivos: schemas, interfaces/services, `api/routers/projetos.py`, dependências, queries e testes funcionais.
  - Cobre: RN-01, RN-02, RN-05, RN-06, RN-08, CA-01 a CA-08.
  - Verificação: rotas criam rodada, listam TCs paginados e recebem resultados por TC; Resumo mostra TCs elegíveis; Results inclui execuções vazias, ID interno/SDF ID e histórico mesmo após mudança de Status; unidade/projeto são validados em todas as consultas.

## Fase 2: frontend — fluxo de rodada e Status

- [x] **T07. Conectar tipos, API, hooks e mock ao contrato de rodadas**
  - Arquivos: `model/projeto.ts`, `api/projetos.api.ts`, hooks e testes; `core/mock/database.ts` e `database.test.ts`.
  - Cobre: CA-01 a CA-12.
  - Verificação: tipos incluem estados de rodada e Status `Done`/`Cancelled`; hooks criam rodada, consultam páginas e enviam resultados; mock aplica mesmas permissões, transições, resultados vazios e histórico.
- [x] **T08. Criar e acompanhar rodadas no Form Factor**
  - Arquivos: componentes de criação/listagem da rodada, `ProjetoDetalhePage.tsx`, tabelas Form Factor e testes de componentes.
  - Cobre: CA-01 a CA-08.
  - Verificação: lista TCs em `InValidation` como elegíveis; Admin/Gerente/KP criam rodada com SDF ID opcional; a seleção capturada pode ser consultada com paginação; histórico distingue rodadas mesmo sem SDF ID e inclui TCs ainda sem resultados.
- [x] **T09. Permitir entrada de resultados por DEV atribuído ou gestão**
  - Arquivos: formulário de resultado por TC, componentes Form Factor e testes de componentes/hooks.
  - Cobre: CA-03, CA-04, CA-09, CA-10, CA-11, CA-14, CA-15, CA-16, CA-18.
  - Verificação: gestor autorizado registra qualquer TC da rodada; DEV principal/Backup registra somente os atribuídos; campos vazios são aceitos; o Status exibido reflete a regra de resultados depois do salvamento.
- [x] **T10. Exibir e permitir as transições de Status autorizadas**
  - Arquivos: seletor/badges da tabela Test Cases, `ProjetoDetalhePage.tsx`, traduções e testes.
  - Cobre: RN-09, RN-11, CA-13, CA-14, CA-17, CA-18.
  - Verificação: mostra `Done` e `Cancelled`; DEV atribuído pode cancelar e devolver `InReview` para `InValidation`; gestão autorizada pode cancelar no escopo; DEV não atribuído não consegue cancelar.
- [x] **T11. Restringir importação por planilha e traduzir estados/mensagens**
  - Arquivos: controles de importação Form Factor, `core/i18n/resources.ts` e testes de interface.
  - Cobre: CA-10, CA-12.
  - Verificação: somente Admin/Gerente/KP autorizados veem e usam importação SDF; textos de rodada, SDF ID, resultados pendentes, `Done`, `Cancelled` e erros existem em PT/EN/KO.

## Fase 3: integração ponta a ponta e fechamento

- [x] **T12. Cobrir o ciclo completo de duas rodadas e permissões**
  - Arquivos: `frontend/e2e` e fixtures relevantes; completar cobertura funcional backend.
  - Cobre: todos os critérios de aceite.
  - Verificação: gestão prepara rodada e SDF ID; DEV principal e Backup registram resultados; `FAIL` move para `InReview`, correção permite nova validação, `PASS` completo move para `Done`, parcial permanece em `InValidation`; cancelamento respeita atribuição; segunda rodada preserva o histórico da primeira; importação por planilha fica restrita aos perfis definidos.
- [x] **T13. Revisar consistência da spec, migração e cobertura**
  - Arquivos: documentação 022, migrations e testes afetados.
  - Cobre: todos os critérios de aceite.
  - Verificação: conferir compatibilidade dos registros históricos, isolamento por unidade/escopo, comportamento no mock e alinhamento dos contratos backend/frontend; atualizar documentação de roadmap após a implementação e aprovação da spec.

> Validação executada (Fase 3): backend completo (482 testes) passou contra um banco PostgreSQL limpo; frontend completo (224 testes) e lint passaram. Com a API real em `127.0.0.1:8000`, passaram o ciclo E2E de duas rodadas (`e2e/form-factor-rodadas.spec.ts`) e os E2Es de Form Factor e de DEV. Na suíte E2E completa, 6 cenários do diálogo de criação de projeto falham por motivo anterior a esta spec (veja o Backlog).

## Fase 4: correção do Resumo por rodada atual

- [x] **T14. Resumo considera só a rodada mais recente do TC (backend)**
  - Arquivos: `infrastructure/repositories/resultado_form_factor_repository.py` e `tests/integration/test_resultado_form_factor_repository.py`.
  - Cobre: RN-12, CA-19, CA-20.
  - Verificação: testes de integração provam que uma nova rodada esvazia as colunas e mostra o SDF da rodada, que o registro parcial não traz de volta os resultados anteriores, que o filtro por resultado ignora rodadas anteriores e que o histórico mantém tudo; um TC sem rodada continua com o último resultado por modelo.
- [x] **T15. Aplicar a mesma regra no mock do frontend**
  - Arquivos: `frontend/src/core/mock/database.ts` e `database.test.ts`.
  - Cobre: RN-12, CA-19, CA-20.
  - Verificação: teste do mock reproduz o CA-19 (rodada nova com colunas vazias e registro parcial) e o CA-20.

> Validação executada (Fase 4): os testes novos falham sem a correção e passam com ela. Backend completo (501 testes) num PostgreSQL limpo com as variáveis da CI, ruff e import-linter; frontend completo (230 testes), lint e tsc. A simplify extraiu `_execucao_de_rodada_do_projeto` (filtros de rodada compartilhados pelo corte e pela rodada pendente), trocou o `or_` por `coalesce` e passou o setup de rodada dos testes para `_Cenario.rodada`/`registrar`.

## Fase 5: só a rodada atual recebe resultados

- [x] **T16. Rodada atual no Resumo e na API (backend)**
  - Arquivos: `resultado_form_factor_repository.py`, `execucao_sdf_repository.py` (+ interface), `form_factor_service.py` e testes de integração/unidade.
  - Cobre: RN-13, CA-21, CA-22.
  - Verificação: com o TC em três rodadas sem resultado, o Resumo aponta a mais recente; após registrar nela, a linha fica sem rodada pendente; registrar numa rodada anterior dá `ConflictException` sem gravar.
- [x] **T17. Mesma regra no mock do frontend**
  - Arquivos: `frontend/src/core/mock/database.ts` e `database.test.ts`.
  - Cobre: RN-13, CA-21, CA-22.
  - Verificação: teste do mock reproduz o CA-21 e o CA-22.

> Validação executada (Fase 5): reproduzido no banco local (Keyboard_0008 com execuções pendentes em SDF-002/003 depois de registrar na SDF-005). Os testes novos falham sem a correção e passam com ela. Backend completo (503 testes) num PostgreSQL limpo com as variáveis da CI, ruff e import-linter; frontend completo (231 testes), lint e tsc. A simplify concentrou a regra da rodada atual em `filtros_execucao_de_rodada_ativa` e `ordem_rodada_atual` (`execucao_sdf_repository.py`), usadas pelo corte, pelo Resumo e pelo registro, e tirou do mock a busca redundante da rodada.

## Backlog

- **E2E do diálogo de criação de projeto quebrados (anterior à 022).** `projetos.spec.ts`, `projetos-importacao.spec.ts` (4) e `modelos-dispositivo.spec.ts` falham: a aba "Criar manualmente" não é encontrada e `getByLabel("Time")` resolve dois comboboxes (importação e manual). Esta spec não tocou o diálogo, então a correção fica fora do escopo: ajustar os seletores ou o diálogo numa task própria.
- **Pagination cobre as ações da tabela da rodada.** Na viewport padrão do Playwright, a barra de paginação intercepta o clique em "Actions for <TC>" na seção da rodada. Os E2Es usam teclado (Enter) para contornar. Revisar o layout da seção (`ProjetoDetalhePage.tsx`) com `ui-density`.
- **A seção da rodada não tem landmark acessível.** Ela não tem `aria-labelledby` no `<section>` com o título "Test Cases in round", então o E2E localiza por `section` + `.last()`. Dar nome à região e usar `getByRole("region")`.
- **Helpers E2E contra a API real duplicados.** `form-factor-rodadas.spec.ts` repete o login, a criação de usuários/time e o `trocar-senha` de `projetos-dev.spec.ts`. Extrair para um `e2e/api-real.ts` compartilhado.
- **`_Cenario` importado de outro módulo de teste.** `test_ciclo_rodadas_form_factor.py` importa o helper privado de `test_resultado_form_factor_repository.py`. Mover para um módulo de helpers de integração.
- **Montagem repetida do `FormFactorServiceImpl` nos testes unitários.** Os testes de `test_form_factor_service.py` constroem 8 mocks em vários lugares. Criar um helper `_service(**mocks)`.
- **Versão do schema mock fixa nos testes.** `core/mock/database.test.ts` repete o número da versão em 5 asserções, e cada migração do mock quebra todas elas. Exportar a constante de `database.ts`.
- **Dropdown inline de Assignee/Backup (spec 011, achado na code-review da 022).** Em `ProjetoDetalhePage.tsx`:
  - Em TC sem backup, trocar o Assignee dá 409.
  - Assignee ou Backup inativo aparece em branco.
  - O controle aparece para um KP fora do time e a API devolve 403.
  - Não há opção vazia (`SELECT_EMPTY_VALUE`).
  - As opções e as classes estão duplicadas.

  Além disso, o nome padrão do projeto é derivado em dois lugares em `ProjetosPage.tsx`. Isso cabe numa task da 011 ou numa spec de correção.
- **Teste de migração sensível ao estado do banco.** `test_caso_teste_repository.py::test_migration_preserva_progresso...` falha quando o banco de teste já tem dados criados pela API ou pelos E2Es (`ck_casos_teste_situation`). Ele passa em um banco limpo. Isolar o teste num schema descartável (`schema_alembic`).
- **Resumo global (spec 021) ainda mistura rodadas.** `listar_form_factor_global` e `mockFormFactorApi.listarGlobal` pegam o resultado mais recente por modelo em todas as rodadas, sem o corte da RN-12. Decidir se a RN-12 vale para o Resumo global e, se valer, reaproveitar o corte (`_execucao_de_rodada_do_projeto`, com o projeto vindo de `CasoTesteModel.projeto_id`).
- **Índice para o corte por rodada.** `execucoes_sdf` não tem índice começando por `caso_teste_id`, então as subconsultas do corte e da rodada pendente fazem scan. Irrelevante na escala atual; criar `(caso_teste_id, data_reportada)` por migration se o Resumo filtrado ficar lento.
- **Lançamento manual avulso durante rodada pendente.** `criar_rodada_manual` cria execução sem `rodada_id` com `data_reportada=now()`, que passa pelo corte e aparece no Resumo ao lado do SDF da rodada pendente. A RN-12 só cita importações SDF; definir se esse caso deve aparecer.
- **API ainda expõe rodadas encerradas como pendentes (RN-13).** `listar_casos` (`GET .../rodadas/{id}/test-cases`) e os históricos de projeto e global devolvem `resultados_registrados=false` para execuções de rodadas anteriores sem resultado, iguais a uma pendente de verdade. Nenhuma tela lê esse campo hoje; se uma tela de detalhe da rodada ou um badge "pendente" surgir, expor um campo calculado `encerrada` usando `ordem_rodada_atual`.
- **Diálogo de resultado aberto durante a criação de uma rodada.** O diálogo do Resumo guarda o `rodada_pendente_id` ao abrir; se a gestão criar outra rodada nesse intervalo, salvar dá 409 (comportamento esperado pela RN-13). Conferir se a mensagem aparece e se o Resumo é recarregado.
- **Setup repetido nos testes de registro do `FormFactorServiceImpl`.** Cada teste monta 8 `AsyncMock`s e o caso/usuário à mão; uma fábrica `(service, mocks)` com `obter_rodada_atual_do_caso` apontando para a rodada do teste reduziria ~40 linhas por teste (complementa o item da montagem repetida acima).
- **Correção pós-fechamento.** A migration `e8f901a2b3c4` passou a usar `DROP CONSTRAINT IF EXISTS ck_execucoes_sdf_origem`. Bancos que aplicaram uma versão antiga de `a4b5c6d7e8f9` não têm essa constraint, e a API não subia (o login dava 500 pelo proxy do Vite).
