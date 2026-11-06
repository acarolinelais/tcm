# 051. Estilização da tela de redefinição de senha: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0014, 0020, 0023, 0025, 0037, 0040, 0041
- **ADRs novos propostos:** nenhum

## Abordagem
A mudança fica só no frontend. A `AlterarSenhaPage` (rota `/trocar-senha`, que o `AppLayout` já protege)
é redesenhada, então passa a usar só HeroUI (ADR 0037). Ela fica visualmente igual ao login porque usa
as mesmas classes e tokens semânticos (ADR 0041). A moldura do login (tema e idioma no canto, cartão com
ilustração, logo e crédito) é só marcação com Tailwind, sem componente de biblioteca, e por isso vira um
`AuthLayout` compartilhado pelas duas telas sem misturar shadcn e HeroUI. O login continua em shadcn
dentro dessa moldura e não muda de visual. O "sair" do `Navbar` vira o hook `useSair`, que a tela nova
também usa. A validação, a chamada `alterarSenhaInicial` e o redirecionamento continuam como estão
(ADR 0023: campo obrigatório, máximo de 128).

## Modelo de dados
Sem mudanças.

## Contrato da API
Sem mudanças. A tela usa estes endpoints, que já existem:

| Verbo | Rota | Uso |
|---|---|---|
| POST | `/api/auth/trocar-senha` | Salvar a nova senha (CA-07, CA-10) |
| POST | `/api/auth/logout` | Sair (CA-06) |
| PATCH | `/api/auth/preferencias` | Idioma preferido, pelo `LanguageSelector` com `perfil` (CA-05, ADR 0025) |

## Backend: arquivos
Nenhum.

## Frontend: arquivos
- **Novo** `frontend/src/core/auth/AuthLayout.tsx`: `<main>` com `ThemeToggle` e `LanguageSelector` no
  canto, o cartão de duas colunas (a ilustração aparece em `lg+` e some abaixo disso), o logo e o crédito
  (`loginCredits`). Recebe `children` e um `perfil?` opcional, repassado ao `LanguageSelector` para que a
  troca de idioma de quem está logado seja persistida.
- **Novo** `frontend/src/core/auth/useSair.ts`: chama `POST /api/auth/logout`, depois `clearTokens()` e
  `navigate("/login", { replace: true })`, como o `Navbar` faz hoje.
- **Alterado** `frontend/src/core/auth/LoginPage.tsx`: passa a usar o `AuthLayout`. Os campos e o botão
  continuam em shadcn, sem mudança visual.
- **Alterado** `frontend/src/core/layout/Navbar.tsx`: usa `useSair`.
- **Alterado** `frontend/src/core/auth/AlterarSenhaPage.tsx`: usa o `AuthLayout` com
  `perfil = useOutletContext<PerfilAtual>()`. O formulário fica em HeroUI: um `CampoSenha` local
  (`TextField` + `Label` + `Input` + `FieldError`) com o botão de olho (`aria-label` mostrar/ocultar e
  `aria-pressed`), usado nos dois campos, cada um com estado próprio; um `Button` primário arredondado; um
  `Button variant="ghost"` "Sair" que chama `useSair`; e o erro geral com `role="alert"`. O `CampoSenha`
  fica no próprio arquivo porque só esta tela o usa.
- **Alterado** `frontend/src/core/i18n/resources.ts`: só se faltar alguma chave nos três idiomas. A ideia
  é reaproveitar `showPassword`, `hidePassword`, `logout` e `loginCredits`.
- **Testes:** `frontend/src/core/auth/AlterarSenhaPage.test.tsx` (novo), `LoginPage.test.tsx` e
  `Navbar.test.tsx` (já existem, servem de regressão) e `frontend/e2e/trocar-senha.spec.ts` (novo).

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `AlterarSenhaPage.test`: mostra o logo, o título, a orientação, os dois campos, o botão, o idioma, o tema, "Sair" e o crédito |
| CA-01 | E2E | `trocar-senha.spec`: um usuário com a senha padrão faz login e cai em `/trocar-senha` |
| CA-02 | E2E | `trocar-senha.spec`: com 1440px a ilustração aparece; com 375px ela some e `scrollWidth <= clientWidth` |
| CA-03 | Unidade | `AlterarSenhaPage.test`: o olho alterna o `type` entre `password` e `text`, e cada campo alterna sozinho |
| CA-04 | Unidade | `AlterarSenhaPage.test`: o olho é alcançável com Tab e tem `aria-label` e `aria-pressed` corretos |
| CA-05 | Unidade | `AlterarSenhaPage.test`: com os campos preenchidos, trocar o idioma muda os textos e mantém os valores |
| CA-06 | Unidade | `AlterarSenhaPage.test`: "Sair" chama o logout, limpa os tokens e navega para `/login` |
| CA-06 | E2E | `trocar-senha.spec`: depois de sair, um novo login com a senha padrão volta para `/trocar-senha` |
| CA-07 | E2E | `trocar-senha.spec`: com as senhas iguais, a tela vai para `/overview` |
| CA-08 | Unidade | `AlterarSenhaPage.test`: um campo vazio mostra "senha obrigatória" e fica inválido |
| CA-09 | Unidade | `AlterarSenhaPage.test`: com as senhas diferentes, a mensagem aparece no campo de confirmação |
| CA-10 | Unidade | `AlterarSenhaPage.test`: se a API falhar, a mensagem aparece, a tela continua e o botão volta a ficar habilitado |
| — | Regressão | `LoginPage.test` e `Navbar.test` continuam verdes depois das extrações |

## Atualização no merge com a `dev`
A spec 050 (ajustes visuais e fim do shadcn) entrou na `dev` durante esta implementação: ela migrou o login para
HeroUI e pôs o tema e o idioma numa linha acima do cartão. No merge, o `AuthLayout` adotou essa moldura nova
e o login (já em HeroUI) passou a usá-lo. Por isso, a regra "login continua em shadcn" deste plano deixou de
valer. O número desta spec passou de 050 para 051.

## Riscos e decisões pendentes
- **Regressão visual do login** ao extrair o `AuthLayout`. Para evitar, as classes saem do login sem
  nenhuma mudança, o `LoginPage.test` serve de regressão e a tela é conferida no navegador nos dois temas.
- **HeroUI imitando o shadcn do login:** o `Input` e o `Button` do HeroUI recebem as mesmas classes de
  tokens do login (`rounded-full`, `bg-field`, `bg-accent`...). Se ficar alguma diferença de foco ou de
  borda, ela é aceita e anotada, porque o login vai migrar para HeroUI em outra spec.
- **Altura do cartão:** o formulário tem um campo a mais que o login. O cartão mantém o `min-h` e pode
  crescer.
- **Modo mock (ADR 0030):** o `useSair` mantém o comportamento atual do `Navbar`, em que a falha do logout
  é ignorada no `finally`.
- **Relação com a spec 042** (Rascunho): ela trata da troca voluntária e da redefinição pelo
  administrador. As duas não se sobrepõem, mas a 042 deve reaproveitar o `CampoSenha` (mover para
  `shared/ui` quando ele tiver um segundo uso).
