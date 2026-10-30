# 036. Cor do avatar nas Configurações: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Backend (cor na conta e preferências parciais)
- [x] **T01. `CorAvatar` e cor padrão no `Usuario`**
  - Arquivos: `backend/src/domain/common/cor_avatar.py`, `backend/src/domain/entities/usuario.py`,
    `backend/tests/unit/domain/test_usuario.py`
  - Cobre: CA-02
  - Detalhe: `CorAvatar(StrEnum)` com os 8 códigos; `Usuario.cor_avatar = CorAvatar.AZUL` e
    `definir_cor_avatar()`. Testes: usuário novo em `azul`; `definir_cor_avatar(VERDE)` troca; código fora da
    paleta não vira `CorAvatar` (`ValueError`).
  - Verificação: `cd backend && uv run pytest tests/unit/domain/test_usuario.py` → verde
- [x] **T02. Coluna, constraint, migration e mapeamento no repositório**
  - Arquivos: `backend/src/infrastructure/data/models/usuario_model.py`,
    `backend/src/infrastructure/data/migrations/versions/<rev>_cor_avatar_por_conta.py`,
    `backend/src/infrastructure/repositories/usuario_repository.py`,
    `backend/tests/integration/test_migration_cor_avatar.py`
  - Cobre: CA-02, CA-06, CA-07
  - Detalhe: `VARCHAR(10)` não nulo, `server_default="azul"`, `ck_usuarios_cor_avatar`; `down_revision` no head
    atual. Testes: usuário existente antes da migration fica `azul`; `INSERT` com `dourado` viola a
    constraint; salvar `verde` em uma conta não altera outra da mesma unidade; `downgrade` remove a coluna.
  - Verificação: `cd backend && uv run pytest tests/integration/test_migration_cor_avatar.py && uv run alembic heads`
    → verde e um único head
- [x] **T03. Schemas e service de preferências com atualização parcial**
  - Arquivos: `backend/src/application/schemas/auth.py`,
    `backend/src/application/services/interfaces/auth_service.py`,
    `backend/src/infrastructure/services/auth_service.py`,
    `backend/tests/unit/application/services/test_auth_service.py`, `backend/tests/unit/application/schemas/`
  - Cobre: CA-03, CA-05, CA-07
  - Detalhe: `AtualizarPreferenciasRequest` com `idioma_preferido` e `cor_avatar` opcionais e `model_validator`
    que exige pelo menos um; `null` explícito recusado. `atualizar_preferencias` aplica só os campos enviados,
    dá um commit e devolve `PreferenciasResponse` com as duas preferências salvas. Testes: só cor mantém o
    idioma; só idioma mantém a cor; `{}`, `null` e `#ff0000` recusados no schema; usuário inexistente →
    `NotFoundException` sem commit.
  - Verificação: `cd backend && uv run pytest tests/unit/application` → verde
- [x] **T04. Router: cor no `/me` e resposta do PATCH**
  - Arquivos: `backend/src/api/routers/auth.py`, `backend/tests/functional/test_auth_api.py`
  - Cobre: CA-02, CA-04, CA-05, CA-07, CA-08
  - Detalhe: o `/me` lê `cor_avatar` junto com o idioma; o PATCH devolve o retorno do service. Testes:
    `/me` com `cor_avatar: "azul"`; PATCH `verde` → 200 com `{ idioma_preferido, cor_avatar: "verde" }`;
    `dourado`, `{}` → 422 ProblemDetails sem chamar o service; sem token → 401.
  - Verificação: `cd backend && uv run pytest` → verde

## Fase 2: Frontend (avatar colorido e seletor em Configurações)
- [x] **T05. Tokens da paleta e teste de contraste**
  - Arquivos: `frontend/src/core/global.css`, `frontend/src/core/theme/contraste-avatar.test.ts`
  - Cobre: CA-10
  - Detalhe: `--avatar-1` a `--avatar-8` e `--avatar-N-foreground` em `:root` e `.dark`, expostos no
    `@theme inline`. O teste lê os valores do CSS e confere ≥ 3:1 da cor sobre o fundo do card e ≥ 4.5:1 das
    iniciais sobre a cor, nos dois temas; falha apontando o token quando um par não atinge.
  - Verificação: `cd frontend && npx vitest run src/core/theme` → verde (inclui a varredura do ADR 0041)
- [x] **T06. Cor no contrato do frontend e no modo mock**
  - Arquivos: `frontend/src/core/auth/api.ts`, `frontend/src/core/mock/database.ts` e o teste dele
  - Cobre: CA-02, CA-04, CA-06
  - Detalhe: tipo `CorAvatar`, `cor_avatar` em `PerfilAtual`, `atualizarCorAvatar()` no mesmo PATCH (só o
    campo da cor). Mock: `corAvatarPorUsuario`, padrão `azul`, `updateAvatarColor()`. Testes: mock novo em
    azul; trocar a cor de um usuário não muda a de outro; a cor persiste após novo login mock.
  - Verificação: `cd frontend && npx vitest run src/core/auth src/core/mock` → verde
- [x] **T07. `AvatarUsuario` compartilhado e uso na `Navbar`**
  - Arquivos: `frontend/src/shared/ui/avatar-usuario.tsx`, `avatar-usuario.test.tsx`,
    `frontend/src/core/layout/Navbar.tsx`, `Navbar.test.tsx`
  - Cobre: CA-02, CA-03
  - Detalhe: HeroUI `Avatar` só com `Avatar.Fallback`, função `iniciais` movida da `Navbar`, ícone genérico com
    nome vazio, classes da cor por mapa fixo (sem classe dinâmica). Sai a `AVATAR_PADRAO_URL`. Testes:
    `Ana Lais` + `verde` → `AL` com a classe do verde; sem cor conhecida → azul; nome vazio → ícone; segue
    `aria-hidden`. Os testes da `Navbar` que esperavam a imagem passam a esperar as iniciais.
  - Verificação: `cd frontend && npx vitest run src/shared/ui/avatar-usuario.test.tsx src/core/layout` → verde
- [x] **T08. Textos da seção nos três idiomas**
  - Arquivos: `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-11
  - Detalhe: `settingsAvatarTitle`, `settingsAvatarHint`, `avatarColorSaveError` e os 8 nomes de cor em `en`,
    `pt-BR` e `ko` (skill `better-writing`).
  - Verificação: `cd frontend && npx vitest run src/core/i18n` → verde (cobertura de chaves nos três idiomas)
- [x] **T09. `SeletorCorAvatar` com gravação otimista e rollback**
  - Arquivos: `frontend/src/modules/configuracoes/components/SeletorCorAvatar.tsx`,
    `SeletorCorAvatar.test.tsx`
  - Cobre: CA-01, CA-03, CA-09, CA-11
  - Detalhe: `RadioGroup` do HeroUI (se não existir no v3 instalado, `role="radiogroup"` com botões
    `role="radio"`), amostras redondas com o token da cor e nome acessível; atualiza o cache
    `["auth", "me", token]` antes da chamada, desfaz e mostra `toast.error` em falha. Testes: 8 opções com a
    salva marcada; clicar verde chama a API com `{ cor_avatar: "verde" }`; API rejeita → volta para a anterior
    com toast; setas e `Space` trocam a seleção.
  - Verificação: `cd frontend && npx vitest run src/modules/configuracoes` → verde
- [x] **T10. Seção "Cor do avatar" na `ConfiguracoesPage`**
  - Arquivos: `frontend/src/modules/configuracoes/pages/ConfiguracoesPage.tsx`, `ConfiguracoesPage.test.tsx`
  - Cobre: CA-01, CA-03
  - Detalhe: nova linha abaixo do idioma, separada por divisor, no mesmo padrão título + dica. Teste: a página
    renderiza as duas seções e, ao escolher verde, o avatar renderizado no layout muda sem reload.
  - Verificação: `cd frontend && npm test && npm run lint` → verde

## Fase 3: E2E
- [ ] **T11. E2E da cor do avatar**
  - Arquivos: `frontend/e2e/cor-avatar.spec.ts`
  - Cobre: CA-03, CA-04, CA-09, CA-11
  - Detalhe: entrar → avatar azul → Configurações → escolher verde pelo teclado → avatar verde sem reload →
    sair e entrar → verde mantido e marcado. Falha: PATCH interceptado com 500 → toast e cor anterior.
  - Verificação: `cd frontend && npm run e2e -- cor-avatar` → verde

## Backlog
- `/me` consulta o banco direto no router (`api/routers/auth.py`), contra o ADR 0003. Já era assim antes desta
  spec; mover para um service/repositório é refatoração própria. (simplify, bloco 1)
- `/me` faz duas idas ao banco seguidas (nome da unidade e preferências) que caberiam numa consulta com
  `join`. Fica junto com o item acima. (simplify, bloco 1)
- `AtualizarPreferenciasRequest` e o schema de edição de Test Case repetem a checagem "ao menos um campo".
  Extrair um helper só se surgir um terceiro caso. (simplify, bloco 1)
- Testes de integração existentes (ex.: `test_usuario_user_id_persistence.py`) deixam unidades sem perfil
  `USUARIO_PADRAO` no banco; numa segunda rodada no mesmo banco,
  `test_migration_seed_perfil_kp_por_unidade_e_idempotente` falha. Não afeta o CI (banco novo a cada run).
  (verificação, bloco 1)
- `LanguageSelector` e `SeletorCorAvatar` repetem a atualização otimista do perfil em cache (aplica, grava,
  restaura e avisa em falha). Extrair um helper em `core/auth` e passar o `LanguageSelector` a usar
  `perfilAtualQueryKey()`. Fica fora porque mexe no seletor de idioma, que não é desta spec. (simplify, bloco 2)
- Cada teste de tela monta a sua fixture de `PerfilAtual`; incluir `cor_avatar` tocou 10 arquivos. Criar uma
  fixture única (`perfilFake(overrides)`) para os testes. (simplify, bloco 2)
