# 061. Sessão entre abas: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0006, 0007, 0010, 0020, 0047, 0048
- **ADRs novos propostos:** nenhum (0047 e 0048 já aceitos)

## Abordagem
O backend passa a entregar o refresh token só no cookie `sdf_refresh` (httpOnly, `SameSite=Strict`,
`Secure`, `Path=/api/auth`, `Max-Age` de 10 horas). O router de auth grava o cookie no login, no
refresh e na troca de senha, lê o cookie no refresh e no logout, e o apaga no logout. O service segue
igual, recebendo o refresh token como `str` em vez de `RefreshRequest`. A sessão no banco passa a
expirar 10 horas depois do login.

No frontend, o `sessionStorage` guarda só o access token. Quando a aba abre sem access token, o
`AppLayout` tenta renovar a sessão antes de mandar para o login. O refresh roda dentro de
`navigator.locks.request("sdf.refresh")`, assim duas abas não gastam o mesmo refresh token ao mesmo
tempo. O modo mock não usa cookie e continua como está.

## Modelo de dados
Não muda o modelo. Só muda a validade gravada em `auth_sessoes.expires_at`, de 7 dias para 10 horas
depois do login (`REFRESH_TOKEN_DAYS = 7` vira `REFRESH_TOKEN_HOURS = 10`). Não há migration. As
sessões já criadas mantêm o prazo antigo (ADR 0048).

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{email, senha}` | 200 `{access_token, expires_in, token_type}` e `Set-Cookie: sdf_refresh` | 401, 422 |
| POST | `/api/auth/refresh` | corpo vazio e cookie `sdf_refresh` | 200, mesmo corpo do login, com o cookie rotacionado | 401 sem cookie, com cookie inválido, expirado ou revogado |
| POST | `/api/auth/trocar-senha` | `{nova_senha}` e `Authorization` | 200, mesmo corpo do login, com o cookie novo | 401, 403, 422 |
| POST | `/api/auth/logout` | cookie `sdf_refresh` e, se vier, `Authorization` (deixa de ser exigido) | 204, `Set-Cookie: sdf_refresh=; Max-Age=0`. Revoga a sessão do cookie e a do access token, se existirem | nenhum: sem cookie nem token válido, também responde 204 |

O corpo das respostas não traz mais `refresh_token`. O logout deixa de exigir o access token porque,
com o access vencido, a pessoa não conseguiria sair e o cookie ficaria vivo, o que quebra o CA-05.

## Backend: arquivos
- `src/infrastructure/security/jwt.py`: `REFRESH_TOKEN_DAYS = 7` vira `REFRESH_TOKEN_HOURS = 10`.
- `src/application/schemas/auth.py`: tira `refresh_token` do `TokenResponse` público e cria
  `SessaoEmitida` (access, refresh e expires_in) como retorno interno do service. Remove
  `RefreshRequest`.
- `src/application/services/interfaces/auth_service.py` e `src/infrastructure/services/auth_service.py`:
  `login`, `renovar(refresh_token: str)` e `alterar_senha_inicial` devolvem `SessaoEmitida`. O
  `logout(refresh_token: str)` revoga pela hash do refresh. O prazo da sessão passa a ser
  `timedelta(hours=REFRESH_TOKEN_HOURS)`.
- `src/api/routers/auth.py`: lê `Cookie(alias="sdf_refresh")`, grava e apaga o cookie num helper
  local do router e mapeia `SessaoEmitida` para `TokenResponse`.
- Testes: `tests/functional/test_auth_api.py` (cookie e contrato) e um arquivo novo,
  `tests/integration/test_auth_sessao_cookie.py`, para o prazo de 10 horas, a rotação, o logout e a
  sessão expirada ou revogada.

## Frontend: arquivos
- `src/core/auth/session.ts`: só o access token. Saem `getRefreshToken` e `refresh_token` do tipo.
- `src/core/api/http-client.ts`: `renovarSessao` exportado, com `POST /api/auth/refresh` sem corpo,
  dentro do `navigator.locks.request` (sem a API, roda direto) e retornando `false` no modo mock. O
  retry no 401 deixa de depender de existir refresh token guardado.
- `src/core/layout/AppLayout.tsx`: sem access token, chama `renovarSessao` uma vez e mostra o
  esqueleto enquanto espera. Se der certo, segue. Se falhar, vai para `/login`.
- `src/core/auth/useSair.ts`: sem mudança de comportamento. O `POST /api/auth/logout` já leva o
  cookie, porque a requisição é da mesma origem.
- Testes: `http-client.test.ts` (lock e corpo vazio), `AppLayout.test.tsx` (renova sem token e manda
  para o login se falhar) e um e2e novo, `e2e/sessao-entre-abas.spec.ts`.
- `e2e/api-fixtures.ts` e `e2e/form-factor-rodadas.spec.ts`: tiram a linha do `sdf.refresh`.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | e2e | `sessao-entre-abas.spec.ts`: login pela tela, nova página no mesmo contexto em `/usuarios`, sem pedir login |
| CA-01 | Unidade | `AppLayout.test.tsx`: sem access token, renova e mostra a tela |
| CA-02 | Funcional | `test_login_grava_cookie_de_refresh`: `HttpOnly`, `SameSite=Strict`, `Path=/api/auth` e `Max-Age=36000` |
| CA-03 | Unidade | `http-client.test.ts`: o refresh roda dentro do lock `sdf.refresh` e não manda o token no corpo |
| CA-04 | Funcional | `test_trocar_senha_grava_cookie_novo` |
| CA-05 | Funcional | `test_logout_apaga_cookie_mesmo_sem_access_token` |
| CA-05 | e2e | `sessao-entre-abas.spec.ts`: sair, abrir uma página nova e cair no login |
| CA-06 | Integração | `test_refresh_depois_do_logout_e_recusado` |
| CA-07 | Integração | `test_sessao_expira_dez_horas_depois_do_login` e `test_refresh_de_sessao_revogada_e_recusado` |
| CA-07 | Funcional | `test_refresh_com_cookie_invalido_retorna_401` |
| CA-08 | Funcional | `test_refresh_sem_cookie_retorna_401` |
| CA-08 | Unidade | `AppLayout.test.tsx`: refresh falha e manda para `/login` |

## Riscos e decisões pendentes
- **`Secure` sempre ligado:** o ADR 0047 pede `Secure` fora do local. Ligo sempre, sem variável de
  ambiente, porque Chrome e Firefox aceitam cookie `Secure` em `http://localhost` e `127.0.0.1`. Quem
  abrir o front por um IP da rede via `http` perde o cookie: cai no login a cada aba e depois de 15
  minutos. Hoje a API não é exposta fora do local, então aceito o risco e marco com `shortcut:`.
- **`Max-Age` fixo de 10 horas no refresh:** o cookie renovado ganha 10 horas a cada rotação, mas o
  prazo vale no banco (`expires_at`). Depois das 10 horas do login o cookie ainda existe, e o refresh
  devolve 401, que leva ao login. O efeito é o mesmo de um cookie vencido.
- **Sessões de 7 dias já emitidas:** continuam válidas até expirar, sem migration (ADR 0048).
- **Modo mock:** a aba nova continua sem sessão, porque o mock não tem cookie. Fica fora de escopo.
- **Logout sem `Authorization`:** qualquer requisição com o cookie revoga a própria sessão. Um site de
  fora não consegue disparar isso por causa do `SameSite=Strict`, e o pior caso seria deslogar a
  própria pessoa.
