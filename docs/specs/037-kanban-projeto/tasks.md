# 037. Kanban do projeto e Board por setor e time: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: consulta do Kanban (backend)

- [x] **T01. Repositório: cards do projeto**
  - Arquivos: interface do repositório em `backend/src/domain/`, `backend/src/infrastructure/repositories/caso_teste_repository.py`,
    `backend/tests/integration/test_caso_teste_repository.py`
  - Cobre: CA-01, CA-13
  - Verificação: `cd backend && uv run pytest tests/integration/test_caso_teste_repository.py -k cards` → retorna
    todos os casos do projeto, com o nome do responsável e sem paginação, filtrados por `unidade_id`.
- [x] **T02. Service `obter_kanban` com `destinos`**
  - Arquivos: `backend/src/application/schemas/kanban.py` (novo), `backend/src/application/services/caso_teste_service.py`,
    `backend/src/application/services/interfaces/`, `backend/tests/unit/application/services/test_caso_teste_service.py`
  - Cobre: CA-01, CA-02, CA-04, CA-07, CA-09, CA-20
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py -k kanban` →
    - sempre 7 colunas, na ordem da RN-02 e com os totais;
    - `destinos` tem todos os outros Status para gestão e responsável, `["Cancelled"]` para o backup e `[]`
      para os demais;
    - o dev vê todos os casos;
    - um projeto fora do escopo levanta `NotFound`.
- [x] **T03. Rota `GET /api/projetos/{id}/kanban`**
  - Arquivos: `backend/src/api/routers/projetos.py`, `backend/tests/functional/test_projetos_api.py`
  - Cobre: CA-01, CA-02, CA-13, CA-20
  - Verificação: `cd backend && uv run pytest tests/functional/test_projetos_api.py -k kanban` → 200 com os totais
    (inclusive para 1.000 casos); 404 para outro setor, outra unidade ou projeto inexistente; 403 sem
    `test_cases.consultar`.

## Fase 2: navegação do Board (backend)

- [x] **T04. Repositório: árvore setor → time → projeto**
  - Arquivos: `backend/src/infrastructure/repositories/projeto_repository.py` (+ interface),
    `backend/tests/integration/test_projeto_repository.py`
  - Cobre: CA-15
  - Verificação: `cd backend && uv run pytest tests/integration/test_projeto_repository.py -k navegacao` → só traz
    setores, times e projetos ativos, filtra por `time_ids` e põe os projetos `Completed` e `Canceled` por último.
- [x] **T05. Service e rota `GET /api/projetos/navegacao`**
  - Arquivos: `backend/src/application/schemas/navegacao_board.py` (novo), `backend/src/application/services/projeto_service.py`,
    `backend/src/api/routers/projetos.py`, `backend/tests/unit/application/services/test_projeto_service.py`,
    `backend/tests/functional/test_projetos_api.py`
  - Cobre: CA-15, CA-19
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_projeto_service.py tests/functional/test_projetos_api.py -k navegacao`
    → o escopo de admin, gerente de dois setores (incluindo um time em que só participa), KP e dev está certo;
    quem não tem times recebe uma árvore vazia; a rota não é capturada por `/{projeto_id}`.

## Fase 3: base do frontend (modelo, API, mock e hooks)

- [ ] **T06. Tipos, cliente HTTP e mock do Kanban e da navegação**
  - Arquivos: `frontend/src/modules/projetos/model/projeto.ts`, `frontend/src/modules/projetos/api/projetos.api.ts`,
    `frontend/src/core/mock/database.ts` e os testes de ambos
  - Cobre: CA-01, CA-02, CA-07, CA-09, CA-15, CA-19
  - Verificação: `cd frontend && npm test -- projetos.api database` → o mock aplica o mesmo escopo e os mesmos
    `destinos` do backend e devolve as 7 colunas na ordem.
- [ ] **T07. Hooks `useKanban` (mutation otimista) e `useNavegacaoBoard`**
  - Arquivos: `frontend/src/modules/projetos/hooks/useKanban.ts`, `frontend/src/modules/projetos/hooks/useNavegacaoBoard.ts`, os testes
  - Cobre: CA-03, CA-10
  - Verificação: `cd frontend && npm test -- useKanban` → a mutation move o card e ajusta os totais na hora;
    um erro faz rollback; o sucesso invalida `kanban` e `test-cases`.

## Fase 4: aba Kanban do projeto

- [ ] **T08. `KanbanBoard`, `KanbanColuna` e `KanbanCard` com `useDrag`/`useDrop`**
  - Arquivos: `frontend/src/modules/projetos/components/kanban/*`, `KanbanBoard.test.tsx`, `resources.ts`
  - Cobre: CA-01, CA-09, CA-11, CA-12, CA-13
  - Verificação: `cd frontend && npm test -- KanbanBoard && npm run lint` →
    - 7 colunas na ordem, com os totais;
    - "Mostrar mais" quando a coluna passa de 50 cards;
    - um card com `destinos` vazio não é arrastável;
    - o projeto vazio mostra o aviso;
    - o erro mostra "Tentar de novo" sem o aviso de vazio.
- [ ] **T09. "Mover para", exclusão com justificativa e toast de erro**
  - Arquivos: `frontend/src/modules/projetos/components/kanban/MoverParaMenu.tsx`, `KanbanBoard.tsx`, `KanbanBoard.test.tsx`, `resources.ts`
  - Cobre: CA-05, CA-06, CA-07, CA-08, CA-10
  - Verificação: `cd frontend && npm test -- KanbanBoard` →
    - por teclado, o menu move o caso;
    - o backup só vê `Excluded`;
    - `Excluded` abre o `ExcluirCasoTesteDialog`, e cancelar não chama a mutation;
    - uma recusa volta o card e mostra a mensagem.
- [ ] **T10. Aba `kanban` na tela do projeto, com a aba na URL**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetoDetalhePage.tsx`, `ProjetoDetalhePage.test.tsx`
  - Cobre: CA-02, CA-14, CA-20
  - Verificação: `cd frontend && npm test -- ProjetoDetalhePage` →
    - `?aba=kanban` abre o Kanban;
    - um valor inválido cai no padrão;
    - a aba Test Cases do dev continua filtrada;
    - um projeto fora do escopo mostra "não encontrado".

## Fase 5: Board na navegação lateral

- [ ] **T11. `BoardPage` com escolha em cascata**
  - Arquivos: `frontend/src/modules/projetos/pages/BoardPage.tsx`, `frontend/src/modules/projetos/routes.tsx`,
    `frontend/src/core/router.tsx`, `BoardPage.test.tsx`, `resources.ts`
  - Cobre: CA-15, CA-16, CA-17, CA-18, CA-19
  - Verificação: `cd frontend && npm test -- BoardPage routes && npm run lint` →
    - a cascata respeita o escopo;
    - um setor único é escolhido sozinho;
    - time e projeto únicos navegam para `?aba=kanban`;
    - trocar o setor limpa time e projeto;
    - "sem times" e "time sem projetos" têm avisos próprios.

## Fase 6: ponta a ponta

- [ ] **T12. e2e do Kanban e do Board**
  - Arquivos: `frontend/e2e/projetos-kanban.spec.ts` (novo), `frontend/e2e/projetos-fixtures.ts`
  - Cobre: CA-02, CA-03, CA-05, CA-07, CA-13, CA-17, CA-20
  - Verificação: `cd frontend && npm run e2e -- projetos-kanban` com a API real →
    - KP arrasta de `In Review` para `In Validation`, e a aba Test Cases reflete a mudança;
    - excluir pelo Kanban grava a justificativa;
    - o dev vê todos os cards, mas só arrasta os dele;
    - o backup só exclui;
    - um link fora do escopo mostra "não encontrado";
    - um projeto com 1.000 casos abre com os totais certos;
    - o Board leva direto ao Kanban.
- [ ] **T13. Suíte completa**
  - Arquivos: —
  - Cobre: todos
  - Verificação: `cd backend && uv run pytest` e `cd frontend && npm test && npm run lint && npm run e2e` → tudo verde.

## Backlog
- **`destinos` repetido em cada card** (simplify da fase 1): com 1.000 cards, a mesma lista de até 6 Status
  volta em quase todos. Trocar por destinos por coluna e uma marcação por card muda o contrato da API da spec
  037; vale só se o tamanho da resposta virar problema.
- **Escopo de times do admin repetido** (simplify da fase 2): `None if usuario_atual.eh_administrador else
  usuario_atual.times_no_escopo` aparece em `ProjetoServiceImpl.listar` e em `listar_navegacao`. Uma
  property em `UsuarioAutenticado` resolveria, mas mexe no domínio compartilhado por outros services.
- **`test_bootstrap` falha na segunda rodada no mesmo banco** (visto na fase 2, anterior a esta spec):
  `test_usuario_user_id_persistence.py` grava unidades sem o perfil `USUARIO_PADRAO` e não as apaga, e a
  migration de perfil KP reaplicada pelo `test_bootstrap` recusa essas unidades. A suíte passa num banco recém-
  migrado.
