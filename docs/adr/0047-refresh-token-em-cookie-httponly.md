# 0047. Refresh token em cookie httpOnly

- **Status:** Aceito
- **Data:** 2026-11-05
- **Relacionado:** spec 061, ADRs 0014 e 0020
- **Substitui em parte:** [0020](0020-sessoes-jwt-e-refresh-rotativo.md), só o armazenamento dos tokens no frontend

## Contexto

O ADR 0020 guarda o access e o refresh token no `sessionStorage`, que é separado por aba. Quando a
pessoa abre uma tela em outra aba (Ctrl+clique num link do menu, por exemplo), a aba nova não tem
token e cai no login. Isso quebra um uso comum do sistema. Passar o refresh token para o
`localStorage` resolveria, mas deixaria a credencial da sessão legível por qualquer script da página.

## Decisão

- O backend grava o refresh token num cookie `sdf_refresh` com `HttpOnly`, `SameSite=Strict`,
  `Path=/api/auth` e `Max-Age` igual à validade da sessão (10 horas, ADR 0048). Em ambiente fora do local o
  cookie também leva `Secure`.
- Login, refresh e troca obrigatória de senha gravam o cookie. O corpo da resposta deixa de trazer
  `refresh_token`.
- `POST /api/auth/refresh` lê o refresh token do cookie, não do corpo. A rotação e o uso único do
  ADR 0020 continuam iguais.
- Logout revoga a sessão e apaga o cookie (`Max-Age=0`).
- O access token continua por aba, no `sessionStorage`. Uma aba sem access token chama o refresh ao
  abrir e só manda para o login se ele falhar.
- O frontend faz o refresh dentro de um Web Lock com nome fixo, para que duas abas não gastem o mesmo
  refresh token ao mesmo tempo. A segunda aba espera a primeira e envia o cookie já rotacionado:

```ts
navigator.locks.request("sdf.refresh", () =>
  fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" }),
);
```

O restante do ADR 0020 (duração dos tokens, sessões persistidas, hash do refresh, `auth_version`)
continua valendo.

## Alternativas consideradas

- **Tokens no `localStorage`:** é o menor diff, mas expõe o refresh token a qualquer XSS durante toda a validade da sessão.
  Com o cookie httpOnly, um script injetado consegue usar a sessão enquanto a página está aberta, mas
  não leva o token embora.
- **Copiar a sessão para a aba nova via `BroadcastChannel`:** a aba nova pediria os tokens a uma aba
  aberta. Não funciona quando nenhuma outra aba está aberta (fechar tudo e abrir de novo) e acrescenta
  um protocolo entre abas para manter.
- **Access token também em cookie:** removeria o `Authorization` do http-client, mas exigiria
  proteção contra CSRF em todas as rotas da API, não só em `/api/auth`.

## Consequências

- ✅ Uma aba nova, ou o navegador reaberto dentro da validade da sessão, continua logada sem novo login.
- ✅ O refresh token sai do alcance do JavaScript da página.
- ⚠️ Logout numa aba não derruba as outras na hora: elas seguem com o access token por até 15 minutos,
  até o próximo refresh falhar.
- ⚠️ O cookie com `SameSite=Strict` pressupõe frontend e API na mesma origem (hoje via proxy do
  Vite). Uma API em outro domínio exige rever o cookie e o CORS.
- ⚠️ O Web Lock depende de `navigator.locks`, presente nos navegadores atuais. Sem ele, duas abas
  podem renovar juntas e uma delas cai no login.
