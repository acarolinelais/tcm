# 022. Resultados Form Factor por rodada: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável. Os testes acompanham o código que cobrem.
> Implementar um bloco (fase) por vez e revisar o resultado antes de avançar.

## Fase 1: backend — domínio, persistência e permissões

- [ ] **T01. Ampliar o ciclo de Status dos Test Cases**
  - Arquivos: `domain/entities/caso_teste.py`, modelo/migration de `casos_teste`, schemas e testes de domínio.
  - Cobre: RN-09, CA-13.
  - Verificação: testes unitários validam `Done` e `Cancelled`, rejeitam Status inválido e preservam `To-Do`, `InProgress`, `InReview` e `InValidation`; migration atualiza a constraint sem perder dados existentes.
- [ ] **T02. Modelar rodada Form Factor e vincular execuções**
  - Arquivos: entidade/interface de repositório de rodada, modelos ORM, `ExecucaoSdf`, migration e testes de persistência.
  - Cobre: RN-01, RN-02, RN-05, RN-06, CA-01, CA-04, CA-05, CA-06.
  - Verificação: uma rodada mantém ID próprio, SDF ID opcional de até 50 caracteres e uma execução por TC elegível; execução sem resultados aparece no histórico; rodadas e resultados anteriores continuam consultáveis.
- [ ] **T03. Criar rodada com snapshot de TCs em validação**
  - Arquivos: repositórios de rodada/TC/execução, service e testes unitários/de integração.
  - Cobre: RN-01, RN-08, CA-01, CA-02, CA-07, CA-08.
  - Verificação: cria a rodada e todas as execuções em uma transação; captura todos os TCs em `InValidation`, ignora outros Status, aceita SDF ID vazio ou livre até 50 caracteres e não cria rodada se não houver TC elegível.
- [ ] **T04. Registrar resultados por TC e derivar o Status atomicamente**
  - Arquivos: entidades/services de Form Factor e Test Case, repositórios e testes unitários/de integração.
  - Cobre: RN-03, RN-04, RN-05, RN-10, CA-03, CA-04, CA-11, CA-14, CA-15, CA-16.
  - Verificação: salva de forma atômica resultados válidos para zero ou mais modelos; qualquer `FAIL` define `InReview`; todos os modelos com `PASS` definem `Done`; resultados parciais sem `FAIL` mantêm `InValidation`; falha de validação não grava resultado nem altera Status.
- [ ] **T05. Autorizar criação, registro, cancelamento e importação SDF**
  - Arquivos: catálogo/migration de permissões, services de Form Factor e importação SDF, testes funcionais de autorização.
  - Cobre: RN-03, RN-07, RN-11, CA-03, CA-09, CA-10, CA-12, CA-17, CA-18.
  - Verificação: Admin/Gerente/KP com escopo criam rodada, registram qualquer TC capturado, cancelam TCs no escopo e importam planilhas; DEV principal/Backup registra resultados e DEV atribuído cancela somente seus TCs; DEV e perfil personalizado não importam planilhas; acesso fora do escopo é recusado.
- [ ] **T06. Expor contratos e rotas da rodada e atualizar consultas históricas**
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
- [ ] **T09. Permitir entrada de resultados por DEV atribuído ou gestão**
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

- [ ] **T12. Cobrir o ciclo completo de duas rodadas e permissões**
  - Arquivos: `frontend/e2e` e fixtures relevantes; completar cobertura funcional backend.
  - Cobre: todos os critérios de aceite.
  - Verificação: gestão prepara rodada e SDF ID; DEV principal e Backup registram resultados; `FAIL` move para `InReview`, correção permite nova validação, `PASS` completo move para `Done`, parcial permanece em `InValidation`; cancelamento respeita atribuição; segunda rodada preserva o histórico da primeira; importação por planilha fica restrita aos perfis definidos.
- [ ] **T13. Revisar consistência da spec, migração e cobertura**
  - Arquivos: documentação 022, migrations e testes afetados.
  - Cobre: todos os critérios de aceite.
  - Verificação: conferir compatibilidade dos registros históricos, isolamento por unidade/escopo, comportamento no mock e alinhamento dos contratos backend/frontend; atualizar documentação de roadmap após a implementação e aprovação da spec.

> Validação executada: testes focados backend e frontend passaram; E2E de Form Factor passou (3 casos), build e lint passaram. Os testes de integração Postgres foram ignorados porque `SDF_TEST_DATABASE_URL` não está configurada. A suíte E2E completa depende do backend em `127.0.0.1:8000`; sem ele, os testes que criam usuários/projetos falham por conexão. T01–T03 e T12–T13 permanecem abertos até fechar a validação de persistência e o ciclo completo de duas rodadas.
