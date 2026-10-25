# 019. Escopo do gerente nos times em que participa: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: backend

- [x] **T01. Regra de escopo no `UsuarioAutenticado`**
  - Arquivos: `backend/src/domain/common/usuario_autenticado.py`,
    `backend/tests/unit/domain/test_usuario_autenticado.py` (novo)
  - Cobre: base de CA-01 a CA-10
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_usuario_autenticado.py` → verde.
    Casos: admin sempre no escopo; gerente pelo setor; gerente por participação; gerente sem relação fora;
    KP e Developer só por participação (setor gerenciado não conta); `times_no_escopo` do gerente junta
    setores e participação sem duplicar.
- [x] **T02. Projetos usam a regra (listar, abrir, criar, editar, importar planilha)**
  - Arquivos: `backend/src/application/services/projeto_service.py`,
    `backend/tests/unit/application/services/test_projeto_service.py`
  - Cobre: CA-01, CA-05, CA-06, CA-07
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_projeto_service.py
    tests/unit/application/services/test_importacao_projeto_service.py` → verde. Novos:
    `test_gerente_membro_lista_projetos_do_time`, `test_gerente_membro_cria_projeto_no_time`; os testes de
    gerente fora do escopo seguem recusando; Developer continua sem criar projeto.
- [x] **T03. Test Cases, importação SDF e Form Factor usam a regra**
  - Arquivos: `backend/src/application/services/caso_teste_service.py`,
    `backend/src/application/services/form_factor_service.py`,
    `backend/tests/unit/application/services/test_caso_teste_service.py`,
    `backend/tests/unit/application/services/test_form_factor_service.py`,
    `backend/tests/functional/test_casos_teste_api.py`
  - Cobre: CA-02, CA-03, CA-04, CA-07, CA-09
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_caso_teste_service.py
    tests/unit/application/services/test_form_factor_service.py tests/functional/test_casos_teste_api.py`
    → verde. Novos: `test_gerente_membro_consulta_e_gerencia_casos_do_time`,
    `test_gerente_membro_sem_permissao_nao_cria_caso`, `test_gerente_membro_consulta_form_factor`; funcional
    com gerente membro (200) e gerente sem relação (404).
- [x] **T04. Times: membros e listagem para o gerente que participa**
  - Arquivos: `backend/src/application/services/time_service.py`,
    `backend/tests/unit/application/services/test_time_service.py`
  - Cobre: CA-02, CA-04, CA-05, CA-07, CA-08
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_time_service.py` → verde.
    Novos: `test_gerente_membro_lista_membros_do_time`, `test_gerente_sem_relacao_nao_lista_membros`,
    `test_gerente_lista_times_do_setor_e_em_que_participa`,
    `test_gerente_membro_nao_gerencia_composicao_do_time`. Suíte completa `uv run pytest` verde no fim do
    bloco (com `SDF_TEST_DATABASE_URL`), incluindo `test_isolamento_tenant.py` (CA-10).

## Fase 2: frontend

- [x] **T05. Detalhe do time e modo mock com a participação do gerente**
  - Arquivos: `frontend/src/modules/times/TimeDetalhePage.tsx`,
    `frontend/src/modules/times/TimeDetalhePage.test.tsx`, `frontend/src/core/mock/database.ts`,
    `frontend/src/core/mock/database.test.ts`
  - Cobre: CA-01, CA-02, CA-05, CA-08
  - Verificação: `cd frontend && npm test -- TimeDetalhePage database` → verde. O gerente membro abre o
    detalhe do time sem as ações de gestão; no mock, o gerente membro lista o projeto e o time, cria um
    projeto e um Test Case nele, e perde o acesso ao sair do time. (O mock não checa escopo ao alterar membros;
    ver Backlog.) `cd frontend && npm test && npm run lint` verde no
    fim do bloco.

## Backlog
- `TimeServiceImpl.listar` tem dois ramos idênticos para KP e Developer (listam `time_ids`). Dá para juntar em
  `perfil_codigo in {"KP", "USUARIO_PADRAO"}`. Ficou fora porque já existia antes desta spec e não muda o
  escopo do gerente (achado da simplify do bloco 1).
- O modo mock não checa escopo em `mockTimesApi.adicionar`/`remover`: qualquer perfil altera membros, ao
  contrário do backend (que exige o setor para o gerente). Já era assim antes desta spec; alinhar o mock exige
  revisar os fluxos de Times em modo mock (achado do bloco 2).
- `projectInMockScope` chama `mockProfile()` (que relê e faz `JSON.parse` do localStorage) uma vez por projeto
  dentro do filtro de `listar`. Passar `db`, `user` e `profile` já carregados, como `canManageMockTeam` faz.
  Já existia antes desta spec (achado da simplify do bloco 2).
- [x] ~~Setores dos times em que o gerente só participa~~: descartado. A API já devolve `setor_nome` em cada
  time, e a tabela e o detalhe de Times usam esse campo, então o nome do setor aparece. O filtro de Setor
  oferece só os setores que o gerente gerencia, o que segue a regra confirmada pelo usuário: o gerente é
  responsável pelos setores dele (ver, criar e editar times, adicionar pessoas, ADR 0021) e, nos times em que só
  participa, atua nos projetos (ADR 0036) (achado do code-review).
