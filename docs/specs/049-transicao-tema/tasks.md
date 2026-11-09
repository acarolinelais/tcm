# 049. Transição suave ao trocar o tema: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: Transição da tela e do ícone
> Feita primeiro com View Transitions (250 ms, depois 450 ms). Na code-review apareceu que a camada da View
> Transition engole os cliques durante a troca, e a abordagem virou uma transição de cor uniforme (ver o
> `plan.md`). As tasks abaixo descrevem o que ficou.

- [x] **T01. Transição de cor uniforme na tela inteira**
  - Arquivos: `frontend/src/core/theme/use-theme.ts`, `frontend/src/core/global.css`,
    `frontend/src/core/theme/ThemeToggle.test.tsx`
  - Cobre: CA-01, CA-03, CA-05, CA-07
  - Detalhe: o `alternar()` põe a `trocando-tema` no `<html>`, troca a `dark` e tira a classe em 450 ms
    (`DURACAO_TROCA_MS`). Um novo clique reinicia a contagem. O `sincronizarAbas` continua imediato. No CSS,
    `:root.trocando-tema *` (e os pseudos) com a mesma transição de cor em 450 ms `ease-in-out`.
  - Testes: a troca com timers falsos, o clique no meio da troca, o evento `storage` sem a classe e o
    armazenamento bloqueado.
  - Verificação: `cd frontend && npx vitest run src/core/theme` → verde
- [x] **T02. Animação de entrada do ícone, com versão para menos movimento**
  - Arquivos: `frontend/src/core/theme/ThemeToggle.tsx`, `frontend/src/core/global.css`,
    `frontend/src/core/theme/ThemeToggle.test.tsx`
  - Cobre: CA-02, CA-04, CA-06
  - Detalhe: ícone com `key={tema}` e a classe `tema-icone-entrar` só depois da primeira troca. O `@keyframes
    tema-icone-entrar` vai de `rotate(-90deg) scale(0.6)` e opacidade 0 até o estado normal, em 200 ms
    `ease-out`. No `prefers-reduced-motion: reduce`, só opacidade.
  - Testes: o ícone carrega sem animação e, depois do clique, é um elemento novo com `tema-icone-entrar`.
  - Verificação: `cd frontend && npx vitest run src/core/theme && npm run lint && npm run build` → verde

## Fase 2: Navegador real
- [x] **T03. E2E da transição**
  - Arquivos: `frontend/e2e/tema.spec.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-06
  - Detalhe:
    - CA-01: no meio da troca, o fundo está numa cor intermediária; no fim, escuro e guardado.
    - CA-02 e CA-06: o ícone carrega parado e o ícone novo roda `tema-icone-entrar`.
    - CA-03 e CA-06: um clique de mouse no meio da troca chega ao toggle e termina no claro.
    - CA-04: com `emulateMedia({ reducedMotion: "reduce" })`, o ícone novo só aparece.
  - Verificação: `cd frontend && npx playwright test e2e/tema.spec.ts -g "transição ao trocar o tema"` → verde
- [x] **T04. Conferência no navegador e fechamento**
  - Arquivos: `docs/specs/049-transicao-tema/spec.md`, `docs/specs/README.md`
  - Cobre: RN-01 (visual)
  - Detalhe: trocar o tema no navegador numa tela com tabela e painel aberto e confirmar que o esmaecimento não
    engasga. Depois, status `Concluída` e roadmap atualizado.
  - Verificação: `cd frontend && npm test && npm run lint` → verde

## Backlog
- **CA-04 checa o nome da animação, não a ausência de giro** (code-review). O e2e confere que o ícone usa a
  `dialog-fade-in` com movimento reduzido. Se alguém mudar essa animação dos diálogos, o teste quebra ou passa
  por engano. Melhor ler os keyframes da animação do ícone e conferir que não há `transform`.
- **Senha do admin nos e2e com API real.** Os testes antigos do `tema.spec.ts` que fazem login usam
  `SDF_E2E_ADMIN_PASSWORD` ou `mude-esta-senha`, e no banco local deste ambiente a senha é outra (401). Não é
  desta spec, mas impede rodar o arquivo inteiro aqui.
