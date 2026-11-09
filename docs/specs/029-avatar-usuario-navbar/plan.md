# 029. Avatar do usuário logado na barra superior: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

Mudança só de frontend. O `<span>` feito à mão no botão do menu do usuário (`core/layout/Navbar.tsx`) vira o
`Avatar` do HeroUI v3, com `Avatar.Image` apontando para a imagem padrão do HeroUI (`blue.jpg` no CDN deles,
RN-07) e `Avatar.Fallback` com as iniciais quando ela não carrega (com `delayMs` para não piscar). As iniciais saem de uma função pura
nova em `shared/lib`, testada isoladamente (RN-01 a RN-04). O visual do Figma (21px, fundo `#8880F7`, texto
branco 11px, RN-05) é mantido com `className` sobre as classes do HeroUI, porque o menor tamanho do HeroUI
(`sm`) tem 32px e aumentaria a barra. O avatar recebe `aria-hidden="true"` (RN-06); o botão, o menu e o
`useDismiss` não mudam.

O ADR 0037 proíbe misturar HeroUI e shadcn na mesma página. A `Navbar` não usa nenhum componente shadcn (só
elementos HTML e ícones `lucide-react`), então a troca não cria mistura. O menu do usuário continua como está
(fora de escopo).

## Modelo de dados

Sem mudanças. O avatar usa o `nome` que já vem em `PerfilAtual` (`GET /api/auth/me`).

## Contrato da API

Sem mudanças.

## Backend: arquivos

Nenhum.

## Frontend: arquivos

| Arquivo | Mudança |
|---|---|
| `frontend/src/shared/lib/iniciais.ts` | **Novo.** `iniciais(nome: string): string`: separa por espaços (ignorando os das pontas e os repetidos), pega a 1ª letra do primeiro e do último nome com `toLocaleUpperCase()`; um nome só → uma letra; vazio → `""`. Usa `Array.from` na 1ª letra para não partir caracteres fora do BMP. |
| `frontend/src/shared/lib/iniciais.test.ts` | **Novo.** Casos das RN-01 a RN-04. |
| `frontend/src/core/layout/Navbar.tsx` | Troca o `<span>` por `<Avatar aria-hidden="true" className="size-[21px]"><Avatar.Image src={AVATAR_PADRAO_URL} alt="" /><Avatar.Fallback delayMs={600} className="bg-[#8880F7] text-[11px] text-white">…</Avatar.Fallback></Avatar>`. Com `iniciais()` vazio, o fallback mostra o ícone `UserRound` do `lucide-react` (RN-04). |
| `frontend/src/core/layout/Navbar.test.tsx` | Testes do avatar e do menu (CA-01 a CA-06), com o `perfil` parametrizável. |
| `.claude/agents/heroui-avatar.md` | Subagente com a API do Avatar e as regras desta spec (já criado). |

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-00 | Unidade | `Navbar.test.tsx`: com a imagem simulada como carregada, o `<img>` usa `AVATAR_PADRAO_URL` e as iniciais não aparecem |
| CA-01 | Unidade | `iniciais.test.ts`: `"Ana Carolina Lais"` → `"AL"`; `Navbar.test.tsx`: avatar mostra `AL` e o botão mostra `Ana` |
| CA-02 | Unidade | `iniciais.test.ts`: `"Ana"` → `"A"`; `Navbar.test.tsx`: avatar mostra `A` |
| CA-03 | Unidade | `iniciais.test.ts`: `"  ana   lais  "` → `"AL"` |
| CA-04 (falha) | Unidade | `iniciais.test.ts`: `""` e `"   "` → `""`; `Navbar.test.tsx`: nome vazio mostra o ícone genérico, sem texto de iniciais, e o menu ainda abre |
| CA-05 | Unidade | `Navbar.test.tsx`: clicar no botão abre o menu com o e-mail e `Logout`; clicar fora fecha |
| CA-06 | Unidade | `Navbar.test.tsx`: o avatar tem `aria-hidden="true"` e o nome acessível do botão não inclui as iniciais |

Não há e2e novo: o comportamento é coberto pelos testes de componente, e os e2e existentes passam pela barra
em todas as telas logadas (servem de regressão).

## Riscos e decisões pendentes

- **Imagem externa:** o avatar depende do CDN do HeroUI (`heroui-assets.nyc3.cdn.digitaloceanspaces.com`), que é
  um arquivo de exemplo da documentação deles e pode mudar ou sair do ar. Sem rede ou com o CDN fora, o fallback
  mostra as iniciais. Se o app passar a ter CSP, o `img-src` precisa liberar esse domínio.
- **Sobrescrever o estilo do HeroUI:** a `.avatar` traz `size-10`, `rounded-3xl` e `bg-default`. As utilities
  do Tailwind v4 vencem a camada `components` do HeroUI, mas é preciso conferir no navegador que o avatar fica
  com 21px, redondo e roxo, sem fundo cinza aparecendo atrás do fallback.
- **Markup diferente:** o Avatar usa o Radix Avatar por baixo. Testes que procuravam o `<span>` antigo podem
  precisar de ajuste (nenhum e2e referencia o ícone hoje).
- **Uma ou duas letras:** a spec define duas iniciais (RN-01). Se o Figma pedir uma, muda só `iniciais.ts` e os
  testes.
- **Backlog:** a `TimesPage` monta outro avatar à mão (`nomeMembro.slice(0, 1)`); pode reaproveitar `iniciais()`
  e o Avatar do HeroUI numa spec futura (fora de escopo aqui).
