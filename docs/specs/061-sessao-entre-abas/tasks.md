# 061. Sessão entre abas: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> O backend roda em `backend/` (`uv run pytest ...`); o frontend, em `frontend/`, com caminhos relativos a
> `frontend/src`. Os testes de integração precisam de `SDF_TEST_DATABASE_URL`.

## Fase 1: backend

- [x] **T01. Sessão de 10 horas e service sem `RefreshRequest`**
  - Arquivos: `infrastructure/security/jwt.py`, `application/schemas/auth.py`,
    `application/services/interfaces/auth_service.py`, `infrastructure/services/auth_service.py`,
    `tests/integration/test_auth_sessao_cookie.py` (novo)
  - O que muda: `REFRESH_TOKEN_HOURS = 10` no lugar de `REFRESH_TOKEN_DAYS`. `SessaoEmitida` (access,
    refresh, expires_in) é o retorno de `login`, `renovar(refresh_token: str)` e `alterar_senha_inicial`.
    `logout(refresh_token: str)` revoga a sessão pela hash do refresh e ignora um token desconhecido.
    Sai o `RefreshRequest`. Testes: `expires_at` fica 10h depois do login; o refresh troca o token e
    recusa o anterior; o refresh depois do logout é recusado; o refresh de uma sessão revogada por
    `auth_version` é recusado; o refresh de uma sessão vencida é recusado; o logout com um token
    desconhecido não falha.
  - Cobre: CA-06, CA-07
  - Verificação: `uv run pytest tests/integration/test_auth_sessao_cookie.py` → verde.
- [x] **T02. Cookie `sdf_refresh` no router de auth**
  - Arquivos: `api/routers/auth.py`, `tests/functional/test_auth_api.py`
  - O que muda: o login, o refresh e a troca de senha gravam `sdf_refresh` (`HttpOnly`, `SameSite=Strict`,
    `Secure`, `Path=/api/auth`, `Max-Age=36000`) e respondem `{access_token, expires_in, token_type}`.
    O refresh lê o cookie e responde 401 sem ele. O logout não exige mais `Authorization`, revoga pelo
    cookie e sempre apaga o cookie. O `Secure` fixo leva o comentário `shortcut:` do plan. Testes:
    `test_login_grava_cookie_de_refresh`, `test_refresh_sem_cookie_retorna_401`,
    `test_refresh_com_cookie_invalido_retorna_401`, `test_refresh_rotaciona_o_cookie`,
    `test_trocar_senha_grava_cookie_novo`, `test_logout_apaga_cookie_mesmo_sem_access_token`. Ajusta o
    teste de login que esperava `refresh_token: ""` no corpo.
  - Cobre: CA-02, CA-04, CA-05, CA-07, CA-08
  - Verificação: `uv run pytest tests/functional/test_auth_api.py` → verde; `uv run pytest` → sem
    falha nova; `uv run ruff check src tests` limpo.

## Fase 2: frontend

- [x] **T03. Só o access token no `sessionStorage` e refresh com lock**
  - Arquivos: `core/auth/session.ts`, `core/api/http-client.ts`, `core/api/http-client.test.ts`,
    `core/auth/useSair.test.tsx`, `core/mock/database.ts` (tipo do `TokenResponse`)
  - O que muda: saem o `sdf.refresh` e o `getRefreshToken`. O `renovarSessao`, agora exportado, faz o
    `POST /api/auth/refresh` sem corpo, dentro de `navigator.locks.request("sdf.refresh", ...)` quando a
    API existe, e retorna `false` no modo mock. O retry no 401 tenta renovar sem depender de um refresh
    guardado. Testes: o refresh roda dentro do lock e não manda corpo; sem `navigator.locks`, renova do
    mesmo jeito; um refresh que falha limpa o access token e propaga o 401.
  - Cobre: CA-03, CA-06
  - Verificação: `npm test -- src/core/api src/core/auth` → verde.
- [x] **T04. Aba sem access token renova antes de ir para o login**
  - Arquivos: `core/layout/AppLayout.tsx`, `core/layout/AppLayout.test.tsx`
  - O que muda: sem access token, o `AppLayout` chama `renovarSessao` uma vez, mostra o esqueleto
    enquanto espera, segue para a tela se der certo e vai para `/login` se falhar. Testes: renova e
    mostra a tela pedida; o refresh falha e cai em `/login`; com access token guardado, não chama o refresh.
  - Cobre: CA-01, CA-08
  - Verificação: `npm test -- src/core/layout` → verde; `npm run lint` limpo.

## Fase 3: e2e

- [x] **T05. Ctrl+clique e logout entre abas**
  - Arquivos: `e2e/sessao-entre-abas.spec.ts` (novo), `e2e/api-fixtures.ts`, `e2e/form-factor-rodadas.spec.ts`
  - O que muda: as fixtures deixam de gravar o `sdf.refresh`. O e2e novo, contra a API real, faz login
    pela tela, abre `/usuarios` numa página nova do mesmo contexto e vê a tela sem login. Depois sai do
    sistema, abre outra página nova e cai no login. Se o Chromium não mandar o cookie `Secure` em
    `http://127.0.0.1`, para e registra no `## Backlog` antes de mudar o `Secure`.
  - Cobre: CA-01, CA-05
  - Verificação: `npm run e2e -- sessao-entre-abas` → verde, com a API e o banco de teste no ar; a suíte
    completa de e2e sem falha nova.

## Backlog
- Índice único em `auth_sessoes.refresh_hash` (achado da simplify na Fase 1). O refresh e agora também
  o logout buscam a sessão por essa coluna sem índice, e a tabela só cresce porque as sessões vencidas
  não são apagadas. O volume hoje é irrelevante. Pede uma migration, que está fora do escopo da spec.
- Três e2e já falham na `dev`, sem relação com esta spec: `form-factor-rodadas.spec.ts` (`toHaveText` na
  tabela de rodadas) e os dois de contraste AA do `tema.spec.ts` (botão primário `#0c8aff` com texto branco,
  contraste 3,44:1).
- O `setupProjectSession` não simula `GET /api/times` nem `GET /api/modelos-dispositivo/opcoes`. Essas
  chamadas vazam para a API real e voltam 401. A fixture agora simula o refresh para isso não derrubar a
  sessão, mas o certo é simular as duas rotas.
- O login pela tela (Email, Password, Sign in) se repete em `tema.spec.ts`, `cor-avatar.spec.ts`,
  `trocar-senha.spec.ts` e `sessao-entre-abas.spec.ts` (achado da simplify na Fase 3). Um
  `entrarPelaTela(page, email, senha)` em `api-fixtures.ts` evitaria ajustar quatro arquivos quando um
  rótulo mudar.
- Aba renovada como outra pessoa (achado do code-review). Se alguém fizer login como B em outra aba, o
  cookie passa a ser de B e a aba de A, no próximo refresh, segue mostrando os dados de A e gravando
  como B. Saída possível: recarregar a aba quando o usuário do token renovado mudar.
- O fetch do refresh não tem timeout (achado do code-review). Um refresh travado prende o Web Lock, e
  todas as abas ficam no esqueleto. Saída possível: `AbortSignal.timeout` no fetch.
- O login não revoga a sessão que o cookie anterior apontava, que fica válida até expirar (achado do
  code-review, comportamento que já existia antes desta spec).

