# 029. Avatar do usuário logado na barra superior: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez. O subagente `heroui-avatar` conhece a
> API do Avatar e as regras desta spec.

## Fase 1: frontend, iniciais e avatar

- [x] **T01. Função `iniciais`**
  - Arquivos: `frontend/src/shared/lib/iniciais.ts`, `frontend/src/shared/lib/iniciais.test.ts`.
  - Cobre: CA-01, CA-02, CA-03, CA-04 (cálculo), RN-01 a RN-04.
  - Verificação: `cd frontend && npx vitest run src/shared/lib/iniciais.test.ts` →
    - `"Ana Carolina Lais"` → `"AL"`; `"Ana"` → `"A"`; `"  ana   lais  "` → `"AL"`;
    - `""` e `"   "` → `""` (cenário de falha);
    - primeira letra fora do BMP (ex.: emoji) não é partida ao meio.
- [x] **T02. Avatar do HeroUI na `Navbar`**
  - Arquivos: `frontend/src/core/layout/Navbar.tsx`, `frontend/src/core/layout/Navbar.test.tsx`.
  - Cobre: CA-01, CA-02, CA-04, CA-05, CA-06, RN-05 a RN-07.
  - Verificação: `cd frontend && npx vitest run src/core/layout` →
    - nome `Ana Carolina Lais`: avatar mostra `AL` e o botão mostra `Ana`; nome `Ana`: avatar mostra `A`;
    - nome vazio (cenário de falha): avatar mostra o ícone genérico, sem letras, e o menu ainda abre;
    - clicar no botão abre o menu com o e-mail e `Logout`; clicar fora fecha;
    - o avatar tem `aria-hidden="true"` e o nome acessível do botão não contém as iniciais;
    - os testes de voltar da `Navbar` e os do `AppLayout` continuam verdes.
- [x] **T03. Conferência visual e suíte do frontend**
  - Arquivos: nenhum novo (ajustes de `className` na `Navbar.tsx`, se precisar).
  - Cobre: RN-05.
  - Verificação:
    - `cd frontend && npm test && npm run lint && npx tsc -b` → tudo verde;
    - no navegador (`npm run dev`, modo mock): avatar com 21px, redondo, fundo `#8880F7`, texto branco, sem
      fundo cinza do HeroUI aparecendo, e a barra com a mesma altura de antes.

## Backlog

- Cor do avatar escolhida pela pessoa em Settings, persistida na conta (próxima spec; seguir o caminho do
  `idioma_preferido` e do `PATCH /api/auth/preferencias`).
- `TimesPage` monta outro avatar à mão (`nomeMembro.slice(0, 1)`): reaproveitar `iniciais()` e o Avatar do
  HeroUI quando a tela for migrada.
- `Navbar` tira o primeiro nome com `perfil.nome.split(" ")[0]`, regra diferente da de `iniciais()` (com
  espaço na frente do nome, o texto fica vazio). Um `primeiroNome()` ao lado de `iniciais()` alinharia as duas;
  ficou fora porque muda o texto do botão, que a spec não cobre (achado da simplify).
