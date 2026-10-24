# 012. Perfil Dev em Projetos e Test Cases: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
- **Status:** Concluídas
- **Data:** 2026-10-24

> Cada task tem um objetivo, duração estimada de até 30 minutos e testes junto da alteração. Executar com a skill `implement-task`, uma fase por vez. Os caminhos entre chaves indicam arquivos individuais no mesmo diretório.
> Antes da implementação, seguir o fluxo de branch do ADR 0027. Não commitar sem pedido do usuário. Integração exige Docker; e2e exige API e PostgreSQL de teste configurados. Usar `uv run` ou o executável equivalente de `backend/.venv` quando uv não estiver no PATH.

## Fase 1: contratos de domínio e consultas de persistência

- [x] **T01. Consultar projetos com associação pessoal sem duplicação (25–30 min)**
  - Arquivos: `backend/src/domain/entities/interfaces/projeto_repository.py`, `backend/src/infrastructure/repositories/projeto_repository.py`, novo `backend/tests/integration/test_consultas_associadas_dev.py`.
  - Implementar consulta por times e usuário com `EXISTS`, associação principal/backup, atividade e unidade. Testar sucesso como principal e somente backup, exclusão de colegas e projeto inativo, ausência de associação e projeto com vários casos sem duplicação.
  - Cobre: CA-04, CA-05, CA-11, CA-12, CA-16.
  - Verificação: `cd backend && uv run pytest tests/integration/test_consultas_associadas_dev.py -k projetos` → projetos elegíveis retornam uma única vez; os demais não aparecem.

- [x] **T02. Filtrar casos por responsável principal ou backup (25–30 min)**
  - Arquivos: `backend/src/domain/entities/interfaces/caso_teste_repository.py`, `backend/src/infrastructure/repositories/caso_teste_repository.py`, `backend/tests/integration/test_consultas_associadas_dev.py`.
  - Acrescentar `associado_usuario_id` opcional, com OR entre principal e backup e AND com os outros filtros. Filtrar casos ativos na consulta pessoal e preservar consulta legada sem filtro pessoal. Testar principal, backup nulo, colegas, inativos e combinação com `responsavel_id`.
  - Cobre: CA-12, CA-13.
  - Verificação: `cd backend && uv run pytest tests/integration/test_consultas_associadas_dev.py -k casos` → consulta pessoal inclui principal/backup e respeita filtros adicionais.

- [x] **T03. Garantir contagens, páginas e isolamento das consultas pessoais (20–25 min)**
  - Arquivos: repositórios de projeto/caso e `backend/tests/integration/test_consultas_associadas_dev.py`.
  - Cobrir paginação de projetos após excluir não associados, contagem de casos antes do limite, ordenação estável e exclusão de outra unidade/time. Ajustar as consultas se necessário; a seleção e a contagem devem usar os mesmos predicados.
  - Cobre: CA-08, CA-10, CA-11, CA-13, CA-16.
  - Verificação: `cd backend && uv run pytest tests/integration/test_consultas_associadas_dev.py && uv run pytest tests/architecture` → contagens/páginas corretas, sem vazamento ou violação de camadas.

## Fase 2: regras de aplicação e contrato HTTP

- [x] **T04. Resolver identidade e escopo na consulta de projetos associados (20–25 min)**
  - Arquivos: `backend/src/application/services/{interfaces/projeto_service,projeto_service}.py`, `backend/tests/unit/application/services/test_projeto_service.py`.
  - Propagar `associados_a_mim=false`; usar identidade autenticada e escopo atual. Cobrir ausência de time, retorno vazio, principal/backup e negação por falta de permissão; manter comportamento de administrador, gerente e KP sem filtro.
  - Cobre: CA-04, CA-05, CA-08, CA-10, CA-11, CA-12, CA-16.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_projeto_service.py` → filtro pessoal usa a identidade atual, não amplia escopo e mantém regressões verdes.

- [x] **T05. Aplicar consulta pessoal de casos e validar projeto acessível (25–30 min)**
  - Arquivos: `backend/src/application/services/{interfaces/caso_teste_service,caso_teste_service}.py`, `backend/tests/unit/application/services/test_caso_teste_service.py`.
  - Alinhar assinatura ao `responsavel_id` existente e acrescentar filtro pessoal. Verificar projeto ativo, unidade, participação e permissão antes da consulta; testar 404/403 e que ser backup continua sem autorizar edição/transferência nem gerar commit.
  - Cobre: CA-08, CA-12, CA-13, CA-14.
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py` → consulta pessoal respeita escopo e posse das ações continua válida.

- [x] **T06. Expor o filtro pessoal na listagem HTTP de projetos (20–25 min)**
  - Arquivos: `backend/src/api/routers/projetos.py`, `backend/tests/functional/test_projetos_api.py` e dublês necessários.
  - Declarar `associados_a_mim` booleano com padrão false e testar propagação, coleção vazia, ausência do parâmetro e valores/paginação inválidos com 422 ProblemDetails.
  - Cobre: CA-04, CA-05, CA-08, CA-10, CA-11, CA-16.
  - Verificação: `cd backend && uv run pytest tests/functional/test_projetos_api.py` → contrato paginado mantém compatibilidade e valida o parâmetro.

- [x] **T07. Expor o filtro pessoal na listagem HTTP de casos (20–25 min)**
  - Arquivos: `backend/src/api/routers/projetos.py`, `backend/tests/functional/test_casos_teste_api.py` e dublês necessários.
  - Testar propagação e combinação com `responsavel_id`, paginação e booleano inválidos; manter respostas de acesso negado e testes de tentativa de edição/transferência por backup.
  - Cobre: CA-08, CA-12, CA-13, CA-14.
  - Verificação: `cd backend && uv run pytest tests/functional/test_casos_teste_api.py && uv run ruff check .` → contratos e verificações de acesso verdes, sem mudanças de permissão.

## Fase 3: cliente, modo mock e consultas do frontend

- [x] **T08. Reproduzir consultas pessoais no modo mock (25–30 min)**
  - Arquivos: `frontend/src/core/mock/database.ts`, `frontend/src/core/mock/database.test.ts`.
  - Aplicar os mesmos filtros, escopo, associação principal/backup, atividade e contagem antes da paginação. Usar a identidade mock atual, sem reinicializar dados persistidos. Cobrir coleções vazias, outro time/unidade e ausência do filtro.
  - Cobre: CA-04, CA-05, CA-08, CA-11, CA-12, CA-13, CA-16.
  - Verificação: `cd frontend && npm test -- src/core/mock/database.test.ts` → modo mock reproduz consulta pessoal e mantém cenários existentes.

- [x] **T09. Transmitir filtros pessoais no cliente de projetos e casos (20–25 min)**
  - Arquivos: `frontend/src/modules/projetos/api/projetos.api.ts`, `frontend/src/modules/projetos/api/projetos.api.test.ts` (criar se ausente).
  - Acrescentar opção tipada `associadosAMim`; serializar como `associados_a_mim` e repassar ao mock. Testar URL/params, combinação com responsável, respostas vazias e propagação de erro.
  - Cobre: CA-06, CA-12, CA-13, CA-16.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/api/projetos.api.test.ts` → cliente usa contrato correto e não transforma erros em listas vazias.

- [x] **T10. Encapsular consultas pessoais e seus caches nos hooks (25–30 min)**
  - Arquivos: `frontend/src/modules/projetos/hooks/useProjetos.ts`, `frontend/src/modules/projetos/hooks/useProjetos.test.tsx`.
  - Incluir identidade/unidade, projeto, filtro pessoal e paginação/filtros nas chaves pertinentes. Disponibilizar consulta inicial de um projeto e consulta paginada de casos; manter assinaturas legadas compatíveis. Cobrir carregamento, falha e separação de caches entre usuários/filtros.
  - Cobre: CA-06, CA-07, CA-10, CA-12, CA-13.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/hooks/useProjetos.test.tsx` → hooks transmitem filtros e isolam resultados por contexto.

## Fase 4: acesso por Projects, estado vazio e troca de projeto

- [x] **T11. Criar estado vazio e mensagens nos três idiomas (20–25 min)**
  - Arquivos: novos `frontend/src/modules/projetos/components/ProjetosDevEmptyState.tsx` e `.test.tsx`; `frontend/src/core/i18n/{resources.ts,resources.test.ts}`.
  - Reutilizar painel compartilhado com título/explicação únicos, sem ações de gestão. Adicionar textos de carregamento, falha e repetição usados pelo fluxo; verificar en, pt-BR e ko.
  - Cobre: CA-04, CA-05, CA-09.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/components/ProjetosDevEmptyState.test.tsx src/core/i18n/resources.test.ts` → mensagens traduzidas, acessíveis e sem ações indevidas.

- [x] **T12. Encaminhar o dev antes de montar a listagem de projetos (25–30 min)**
  - Arquivos: novos `frontend/src/modules/projetos/ProjetosEntradaPage.tsx` e `.test.tsx`; `frontend/src/modules/projetos/{routes.tsx,routes.test.ts}`.
  - Decidir por `USUARIO_PADRAO`; consultar primeiro projeto associado e navegar com `replace`. Cobrir zero, um e múltiplos projetos, dev somente backup, loading, erro/repetição e perfil sem permissão. Os demais perfis montam a tela atual; dev nunca a monta.
  - Cobre: CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-10, CA-11, CA-12.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/ProjetosEntradaPage.test.tsx src/modules/projetos/routes.test.ts` → entrada direta e pelo menu encaminham corretamente, sem flash da listagem.

- [x] **T13. Garantir o item Projects na sidebar do dev (15–20 min)**
  - Arquivos: `frontend/src/core/layout/{Sidebar.tsx,Sidebar.test.tsx}`, recursos i18n se necessário.
  - Manter `/projetos` como destino, rótulo traduzido Projects e visibilidade por permissão, independentemente de associações. Cobrir sidebar recolhida/expandida e preservar os demais perfis.
  - Cobre: CA-01, CA-04, CA-09.
  - Verificação: `cd frontend && npm test -- src/core/layout/Sidebar.test.tsx` → link permanece disponível nos estados vazios e mantém nome acessível.

- [x] **T14. Exibir casos pessoais e ações por posse no detalhe (25–30 min)**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx`, `frontend/src/modules/projetos/ProjetoDetalhePage.test.tsx`, hooks do módulo se necessário.
  - Dev inicia em Test Cases e usa o filtro pessoal em cada página. Cobrir principal e backup, exclusão de colegas e controles somente por posse; erro 403/404 não renderiza dados negados. Preservar Form Factor e navegação de gestão.
  - Cobre: CA-08, CA-12, CA-13, CA-14.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/ProjetoDetalhePage.test.tsx` → casos pessoais corretos e backup não recebe ações de responsável.

- [x] **T15. Trocar projetos associados pelo dropdown existente (20–25 min)**
  - Arquivos: `frontend/src/modules/projetos/components/{ProjetoSwitcher.tsx,ProjetoSwitcher.test.tsx}`, `frontend/src/modules/projetos/ProjetoDetalhePage.tsx` e `.test.tsx`.
  - Usar opções pessoais para dev e opções atuais para os demais perfis; ao trocar, limpar filtros, reiniciar página e abrir a aba Test Cases. Cobrir projeto único, seleção por teclado e projeto em que o dev é somente backup.
  - Cobre: CA-12, CA-15, CA-16.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/components/ProjetoSwitcher.test.tsx src/modules/projetos/ProjetoDetalhePage.test.tsx` → troca mantém o fluxo de TCs, o foco e o contexto correto.

- [x] **T16. Paginar opções do dropdown além dos primeiros 100 projetos (25–30 min)**
  - Arquivos: `frontend/src/modules/projetos/hooks/{useProjetos.ts,useProjetos.test.tsx}`, `frontend/src/modules/projetos/components/{ProjetoSwitcher.tsx,ProjetoSwitcher.test.tsx}`.
  - Carregar mais opções sob demanda até `total_count`, em páginas de até 100, sem duplicação. Testar seleção na segunda página, erro/repetição preservando opções anteriores e associação em página posterior.
  - Cobre: CA-06, CA-15, CA-16.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/hooks/useProjetos.test.tsx src/modules/projetos/components/ProjetoSwitcher.test.tsx` → projetos após a primeira página são selecionáveis e falha não simula ausência.

- [x] **T17. Recuperar a navegação quando a última associação é removida (25–30 min)**
  - Arquivos: `frontend/src/modules/projetos/ProjetoDetalhePage.tsx` e `.test.tsx`, `frontend/src/modules/projetos/hooks/{useProjetos.ts,useProjetos.test.tsx}`.
  - Invalidar casos e projetos pessoais após transferência/atribuição; reconsultar associações quando o projeto acessível deixa de ter casos pessoais. Abrir outro projeto ou o vazio sem loops. Distinguir ausência real de casos e resultado vazio causado por filtros locais; erro de acesso mantém tratamento próprio.
  - Cobre: CA-04, CA-05, CA-06, CA-08, CA-11, CA-15.
  - Verificação: `cd frontend && npm test -- src/modules/projetos/ProjetoDetalhePage.test.tsx src/modules/projetos/hooks/useProjetos.test.tsx` → perda da associação recupera o fluxo; filtros sem resultados não provocam redirecionamento indevido.

## Fase 5: jornadas de ponta a ponta e fechamento

- [x] **T18. Cobrir entrada e estado vazio do dev no navegador (25–30 min)**
  - Arquivos: novo `frontend/e2e/projetos-dev.spec.ts` e helpers/fixtures locais ao teste, conforme o padrão existente.
  - Preparar dados isolados por execução usando os fluxos/fixtures existentes. Cobrir dev sem associação, único projeto, somente backup, URL direta/recarregamento e navegação lateral. Usar API real no sucesso; interceptar somente o cenário de falha de consulta.
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-09, CA-12.
  - Verificação: `cd frontend && npm run e2e -- e2e/projetos-dev.spec.ts --grep entrada` → jornadas agrupadas como `entrada` passam com API/Postgres de teste e não exibem a listagem de projetos.

- [x] **T19. Cobrir múltiplos projetos e limites de posse no navegador (25–30 min)**
  - Arquivos: `frontend/e2e/projetos-dev.spec.ts` e seus helpers/fixtures.
  - Cobrir projeto inicial, dropdown, casos principal/backup, ausência de casos de colegas e tentativa de acesso fora do escopo. Verificar ações de backup e troca após perder associação. Seleção após 100 opções já é coberta por componente/integração; não exigir montar 101 projetos em cada jornada e2e.
  - Cobre: CA-08, CA-10, CA-11, CA-12, CA-13, CA-14, CA-15, CA-16.
  - Verificação: `cd frontend && npm run e2e -- e2e/projetos-dev.spec.ts` → jornadas pessoais passam sem conceder ações ao backup e sem regressão de isolamento.

- [x] **T20. Verificar a entrega e registrar o resultado (20–30 min)**
  - Arquivos: diff desta spec; `docs/specs/012-perfil-dev-projetos-test-cases/{spec.md,plan.md,tasks.md}`, `docs/specs/README.md`; registro em `docs/learning/` conforme convenção existente.
  - Conferir a cobertura dos 16 critérios e executar as verificações finais abaixo. Revisar simplificação do diff de cada fase antes do respectivo relatório; no fechamento, revisar código e segurança das consultas/permissões conforme as instruções locais. Registrar limitações reais no backlog e só marcar conclusão com verificações verdes. Se surgir correção que não caiba nesta task, desdobrá-la com seu teste antes de concluir.
  - Cobre: CA-01 a CA-16 (validação consolidada, complementando os testes entregues junto das alterações).
  - Verificação backend: `cd backend && uv run pytest && uv run ruff check .` → testes, arquitetura e lint verdes.
  - Verificação frontend: `cd frontend && npm test && npm run lint && npm run build && npm run e2e -- e2e/projetos-dev.spec.ts` → componentes, lint, build e jornadas verdes.
  - Resultado documental: registrar verificações realizadas e atualizar status/roadmap quando a entrega estiver efetivamente concluída.

## Backlog

- [x] **B01. Harmonizar documentação de paginação — resolvido.** [ADR 0034](../../adr/0034-paginacao-padrao-vinte-itens.md) aceito pelo usuário. Atualizados o status da regra substituída no ADR 0022, o índice de ADRs e o resumo de tabelas no índice de specs, mantendo o comportamento atual de 20 itens.
- [x] **B02. Atualizar o nome da constante HTTP 422 — resolvido.** Os três usos no handler agora empregam `HTTP_422_UNPROCESSABLE_CONTENT`. Suíte completa: 334 testes passaram sem os avisos de depreciação, preservando status 422 e ProblemDetails.
- [ ] **B03. Avaliar divisão dos bundles do frontend — manutenção futura.** O build já emitia aviso de chunks acima de 500 kB antes desta spec; considerar carregamento sob demanda do leitor de planilhas e módulos. Build segue aprovado; otimização não faz parte das regras de acesso do dev.
- [ ] **B04. Harmonizar numeração das specs criadas em paralelo.** O PR #18 integrou `012-identificador-externo-usuario` enquanto esta branch já continha `012-perfil-dev-projetos-test-cases`. Os diretórios, referências e históricos foram preservados na integração da `dev`; coordenar a renumeração documental sem recriar branches ou PRs nesta atualização.

## Registro de execução

### Fase 1 — concluída em 2026-10-24

- T01: 3 testes de projetos passaram; T02: 3 testes de casos passaram; T03: 10 testes novos de integração e 1 de arquitetura passaram.
- Banco PostgreSQL 18 separado em container temporário, migrado pelo runner da aplicação; nenhum teste executado contra o banco de desenvolvimento. Fixtures novas usam transações sem commit.
- Suíte completa do backend: **319 passaram, nenhum pulado, 15 avisos** (B02). `ruff check .` e `ruff format --check .` passaram (218 arquivos).
- A skill `simplify` não estava disponível nos diretórios de skills. Revisão equivalente realizada por um único subagente, conforme `implement-task`: reuso, simplificação, eficiência e nível de abstração, incluindo isolamento das consultas; sem achados ou mudanças adicionais.
- Aprovação de spec/plano/tasks registrada; implementação na branch `feat/012-perfil-dev-projetos-test-cases`. Próximo bloco: Fase 2 (T04–T07).

### Fase 2 — concluída em 2026-10-24

- T04–T07 implementadas: identidade e escopo resolvidos nos services, parâmetros booleanos nas duas consultas HTTP, contratos preservados sem filtro pessoal, projeto inativo recusado.
- Testes filtrados dos services/contratos: 71 passaram. Suíte completa posterior: 334 passaram; lint e formatação aprovados.
- Revisão de simplificação por um único subagente, sem achados. A consulta pessoal de administrador aceita `time_ids=None` apenas a partir do service autorizado e mantém o filtro de unidade.

### Fases 3 e 4 — concluídas em 2026-10-24

- T08–T17 implementadas, incluindo mock, cliente, hooks, entrada direta, estado vazio traduzido, sidebar, dropdown paginado e recuperação da última associação.
- A revisão de simplificação apontou a repetição da página seguinte do dropdown e a prioridade dos erros sobre dados antigos do cache; correções aplicadas com testes de regressão. Testes também verificam separação de cache por usuário/unidade e invalidação de consultas pessoais após transferência.
- Skills globais `simplify`, `code-review` e `security-review` não estão instaladas neste ambiente; a revisão equivalente foi feita pelo único subagente de revisão, sem alterações delegadas. A última revisão não encontrou bloqueios restantes.
- Build e lint aprovados. Verificações finais do frontend e jornadas reais registradas no fechamento abaixo.

### Fase 5 e fechamento — concluídos em 2026-10-24

- **Backend:** 334 testes passaram, nenhum pulado e nenhum aviso de depreciação 422; `ruff check .` e `ruff format --check .` aprovados (219 arquivos).
- **Frontend:** 126 testes passaram em 27 arquivos (`npm test -- --maxWorkers=2 --minWorkers=1`); `npm run lint` e `npm run build` aprovados. O limite de workers foi usado para reduzir concorrência durante a verificação.
- **Navegador:** 6 jornadas passaram: as 5 de `e2e/projetos-dev.spec.ts`, com API/Postgres reais no sucesso, e a regressão existente `e2e/projetos.spec.ts`. Cobrem vazio, projeto único como backup, múltiplos projetos, transferência e recuperação da associação, falha de consulta e projeto fora do escopo. Testes de componentes cobrem paginação do seletor após 100 opções e os três idiomas.
- **Ambiente de e2e:** API dedicada na porta 8001 e PostgreSQL temporário na porta 32768; `SDF_E2E_API_URL=http://127.0.0.1:8001` aponta tanto o cliente de preparação quanto o proxy Vite. Neste host sem bibliotecas globais do Chromium, foi necessário usar `LD_LIBRARY_PATH` apontado a bibliotecas extraídas em diretório temporário. Nenhuma resposta de sucesso foi interceptada; apenas o cenário 500 é simulado.
- **Revisão final:** correções de repetição da página seguinte e supressão de dados antigos após erro de acesso confirmadas. Nenhum bloqueio restante na revisão equivalente de código/segurança. As revisões de fases e o fechamento foram feitos pelo mesmo único subagente de revisão, sem alterações de código delegadas.
- **Backlog atualizado:** B01 e B02 resolvidos; B03 registrado como otimização futura. O ADR 0034 foi aceito pelo usuário após a conclusão das verificações.
- **Aprendizado:** [Associação, paginação e cache no fluxo do dev](../../learning/2026-10-24-associacao-paginacao-cache-dev.md).
- Commit e abertura de PR para `dev` solicitados pelo usuário após aprovação da entrega. Alterações pré-existentes em `.env.example` preservadas e excluídas do commit.

### Integração com a dev após o PR #18 — 2026-10-24

- Integrada `origin/dev` em `1683d42` à branch desta spec, preservando o identificador externo de usuário e o fluxo de projetos/TCs pessoais.
- Resolvidos os conflitos no índice de specs, nas traduções e no import dos testes do mock, mantendo as contribuições dos dois PRs. A duplicidade de numeração das specs foi registrada em B04.
- Atualizadas as fixtures de navegador para informar identificadores externos; verificada sua apresentação em responsável/backup sem alterar os UUIDs usados nas atribuições e permissões.
- **Verificação conjunta:** 350 testes backend e 134 testes frontend passaram; Ruff, formatação, lint, build e convenções de Git aprovados. Passaram também 13 jornadas de navegador de projetos pessoais, criação/transferência de TCs, importação e gestão de identificadores de usuários.
- Migration nova validada em PostgreSQL temporário, separado do banco de desenvolvimento. Alteração local de `.env.example` preservada fora do merge. Esta atualização foi concluída localmente, sem push.
