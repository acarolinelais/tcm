# 051. Estilização da tela de redefinição de senha: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: peças compartilhadas
- [x] **T01. Extrair o `AuthLayout` (a moldura do login) e aplicar na `LoginPage`**
  - Arquivos: `frontend/src/core/auth/AuthLayout.tsx`, `frontend/src/core/auth/LoginPage.tsx`
  - Cobre: RN-01, RN-02 (base de CA-01 e CA-02)
  - Verificação: `cd frontend && npx vitest run src/core/auth/LoginPage.test.tsx && npx tsc -b && npm run lint` → verde.
- [x] **T02. Extrair o `useSair` e usar no `Navbar`**
  - Arquivos: `frontend/src/core/auth/useSair.ts`, `frontend/src/core/auth/useSair.test.tsx`, `frontend/src/core/layout/Navbar.tsx`
  - Cobre: base de CA-06
  - Verificação: `cd frontend && npx vitest run src/core/auth/useSair.test.tsx src/core/layout/Navbar.test.tsx` → verde (sair com sucesso e com falha do logout).

## Fase 2: tela de redefinição de senha
- [x] **T03. Reescrever a `AlterarSenhaPage` em HeroUI com o `AuthLayout`, o olho e o "Sair"**
  - Arquivos: `frontend/src/core/auth/AlterarSenhaPage.tsx`, `frontend/src/core/auth/AlterarSenhaPage.test.tsx`,
    `frontend/src/core/i18n/resources.ts` (só se faltar chave)
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-06, CA-08, CA-09, CA-10
  - Verificação: `cd frontend && npx vitest run src/core/auth/AlterarSenhaPage.test.tsx` → passam os casos
    de elementos, olho independente e acessível, idioma mantendo os valores, sair, campo vazio, senhas
    diferentes e falha da API.
- [x] **T04. Revisar a acessibilidade e os textos da tela**
  - Arquivos: `frontend/src/core/auth/AlterarSenhaPage.tsx` (ajustes)
  - Cobre: CA-04, RN-01
  - Verificação: `better-accessibility` e `better-writing` sem achado aberto; a tela conferida nos dois
    temas; `cd frontend && npm run lint && npm test` → verde.

## Fase 3: e2e
- [x] **T05. E2E do fluxo de primeiro acesso**
  - Arquivos: `frontend/e2e/trocar-senha.spec.ts`
  - Cobre: CA-01, CA-02, CA-06, CA-07
  - Verificação: `cd frontend && npx playwright test e2e/trocar-senha.spec.ts` → passam os casos de
    redirecionamento, layout em 1440px e 375px, sair e entrar de novo, e troca com sucesso.

## Backlog
- Testes instáveis com a suíte inteira rodando em paralelo: `SetoresPage` ("pede confirmação antes de inativar"),
  `KanbanBoard` (dois casos de filtro), `Navbar` ("avatar do usuário logado"), `ProjetosPage` ("cria projeto manual"), `ProjetoDetalhePage` ("filtra TCs por semana")
  e `UsuarioDrawer` ("e-mail inválido e User ID acima do limite") falharam em execuções diferentes e
  passam quando rodam sozinhos. Em outras execuções completas, todos passaram. Investigar timeouts sob carga
  numa spec ou fix próprio.
- `passwordChangeError` ("Não foi possível alterar sua senha. Tente de novo.") aparece para qualquer
  `ApiError`, inclusive um 403 em que a troca já foi feita em outra aba e tentar de novo não resolve.
  Mapear o status para uma mensagem específica, ou redirecionar, quando a troca já tiver sido feita.
- O ícone do olho (`EyeOff` ou `PasswordEyeIcon`, conforme o estado) se repete no `LoginPage` e no `CampoSenha`.
  Dá para extrair um `OlhoSenha` em `shared/ui/figma-icons.tsx`, que é só SVG e serve para shadcn e HeroUI.
  Como o login agora também é HeroUI (spec 050), o login pode usar o próprio `CampoSenha`; mover para
  `core/auth` ou `shared/ui` quando isso for feito ou quando a spec 042 precisar dele.
- O olho do login troca o rótulo ("Show"/"Hide password") e usa `aria-pressed` ao mesmo tempo, e o leitor de
  tela anuncia o estado duas vezes. Na tela de troca de senha o rótulo é fixo. Resolve junto com o item
  acima, quando o login passar a usar o `CampoSenha`.
