# 049. Transição suave ao trocar o tema: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0037, 0040, 0041
- **ADRs novos propostos:** nenhum. É só CSS e o mecanismo de tema do ADR 0040 (classe `dark` no `<html>`,
  chave `sdf.theme`) não muda.

## Abordagem

Hoje o `alternar()` de `core/theme/use-theme.ts` chama `aplicar(tema)`, que pausa as transições por um quadro
(classe `sem-transicao`) e troca a classe `dark`. A pausa existe porque cada elemento tem a sua transição (ou
nenhuma), e a tela mudaria de cor em pedaços.

Agora o `alternar()` põe a classe `trocando-tema` no `<html>` e troca a classe `dark` no mesmo passo. Enquanto
a classe está lá, o `global.css` dá a **todos** os elementos (e aos `::before`/`::after`) a mesma transição de
cor: fundo, borda, texto, `fill`, `stroke`, contorno, sublinhado e sombra, em 450 ms `ease-in-out`, com
`!important`. Como tudo começa junto e dura o mesmo, a tela inteira muda junta e aos poucos (RN-01). Um
`setTimeout` de 450 ms tira a classe, e cada novo clique reinicia a contagem.

Clique durante a troca (RN-03 e RN-06): a página nunca deixa de ser clicável. As transições CSS recomeçam da
cor em que estão, então um segundo clique faz as cores voltarem de onde pararam.

A troca vinda de outra aba (`sincronizarAbas`) continua chamando `aplicar()`, imediata (RN-05).

No ícone (RN-02), o `ThemeToggle` renderiza o ícone com `key={tema}`. Cada troca monta o ícone de novo, e ele
roda uma animação CSS de entrada: gira de -90° para 0°, cresce de 0,6 para 1 e aparece, em 200 ms `ease-out`.
A classe `tema-icone-entrar` só entra depois do primeiro clique no toggle (estado `trocou`), então o ícone fica
parado quando a página carrega (RN-06). É uma animação (`@keyframes`) porque a `trocando-tema` toma conta das
transições durante a troca.

Menos movimento (RN-04): no `@media (prefers-reduced-motion: reduce)`, a animação do ícone vira só opacidade.
A passagem das cores não muda, porque não tem movimento.

### Primeira tentativa com View Transitions

A primeira versão usou `document.startViewTransition()`, que fotografa a tela e esmaece entre as duas fotos.
Ao testar, apareceram dois problemas:

- o `base.css` do HeroUI define `:root { view-transition-name: none }`, o que exigiu um ajuste para haver foto;
- enquanto a transição roda, o navegador põe a camada da transição sobre a página, e todo clique cai no
  `<html>`. Por 450 ms, nada na tela respondia, e a RN-03 não era atendida com o mouse.

A `code-review` da spec apontou o segundo problema, e o teste no Chromium confirmou. Com a decisão do usuário,
a View Transition saiu e entrou a transição de cores uniforme.

### Revisão de 2026-11-05: de volta à View Transition

Com a duração em 800 ms, a pessoa notou bordas atrasadas e o cabeçalho das tabelas falhando no meio da troca.
Medido no Chromium, na tela de Users (470 elementos): com a `trocando-tema`, o recálculo de estilo do clique foi
de ~30 ms para ~300 ms, e tirar a classe no fim custava outros ~100 ms. Nos 900 ms depois do clique, a página
desenhou 8 quadros, com uma lacuna de 522 ms. Cortar propriedades ou os `::before`/`::after` não ajudou (6 a 7
quadros): o custo é animar a cor de cada elemento e repintar a tela inteira a cada quadro.

Com a View Transition, a mesma troca desenhou 33 a 41 quadros, com a pior lacuna entre 40 e 90 ms. Os cliques
continuam sem chegar à página enquanto ela roda, o que foi conferido de novo, inclusive com
`::view-transition { pointer-events: none }`. A pessoa aceitou essa troca, com a duração em 300 ms. Como ficou:

- o `alternar()` grava o tema, põe a `trocando-tema` no `<html>` e chama `document.startViewTransition()`, que
  troca a classe `dark` dentro de um `flushSync` para o ícone novo entrar na foto nova. Só a última troca tira a
  classe quando termina;
- durante a `trocando-tema`, o `global.css` devolve `view-transition-name: root` à raiz, que o HeroUI zera, e
  pausa as transições de todos os elementos, para nenhum mudar de cor em separado dentro da foto nova;
- `::view-transition-old(root)` e `::view-transition-new(root)` duram 300 ms `ease-in-out`. Só opacidade, então
  vale também com movimento reduzido (RN-04);
- navegador sem `startViewTransition`: troca na hora, com o `aplicar()` (o mesmo da outra aba).

## Modelo de dados

Nenhum.

## Contrato da API

Nenhum. A mudança é só no frontend.

## Backend: arquivos

Nenhum.

## Frontend: arquivos

- `src/core/theme/use-theme.ts` (alterado): `alternar()` põe a `trocando-tema`, troca a classe `dark` e tira a
  classe depois de `DURACAO_TROCA_MS` (450). O `aplicar()` (outra aba) continua como era.
- `src/core/theme/ThemeToggle.tsx` (alterado): ícone com `key={tema}` e a classe `tema-icone-entrar` depois da
  primeira troca.
- `src/core/global.css` (alterado): bloco `:root.trocando-tema *` com a transição de cor; `@keyframes
  tema-icone-entrar` e a variante só de opacidade no `prefers-reduced-motion: reduce`.
- `src/core/theme/ThemeToggle.test.tsx` (alterado): casos da troca com timers falsos e do ícone.
- `e2e/tema.spec.ts` (alterado): casos da troca no navegador real.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `ThemeToggle.test.tsx`: o clique põe `dark` e `trocando-tema`, guarda `dark` e tira a `trocando-tema` em 450 ms |
| CA-01 | E2E | `tema.spec.ts`: no meio da troca, o fundo da página está numa cor intermediária, e no fim está escuro e guardado |
| CA-02 | Unidade | `ThemeToggle.test.tsx`: o ícone começa sem animação e, depois do clique, é um elemento novo com `tema-icone-entrar` |
| CA-02 | E2E | `tema.spec.ts`: o ícone carrega com `animation-name: none` e o ícone novo roda `tema-icone-entrar` |
| CA-03 | Unidade | `ThemeToggle.test.tsx`: um clique aos 300 ms volta o tema e reinicia os 450 ms |
| CA-03 | E2E | `tema.spec.ts`: um clique de mouse no meio da troca chega ao toggle e termina no claro |
| CA-04 | E2E | `tema.spec.ts`: com `emulateMedia({ reducedMotion: "reduce" })`, o ícone novo usa a animação só de opacidade |
| CA-05 | Unidade | `ThemeToggle.test.tsx`: o evento `storage` troca o tema sem a `trocando-tema` |
| CA-06 | E2E | `tema.spec.ts`: o mesmo teste do CA-03 (o clique no meio da troca não se perde) e o do CA-02 (ícone parado ao carregar) |
| CA-07 | Unidade | `ThemeToggle.test.tsx`: com `setItem` lançando erro, o tema troca mesmo assim (teste da spec 034) |

## Riscos e decisões pendentes

- **O que não transiciona:** imagens, gradientes (`background-image`) e cores definidas dentro de SVG por
  atributo mudam de uma vez. Hoje o app não tem gradiente de fundo por tema.
- **Transições de movimento pausadas:** durante os 450 ms, elementos que normalmente animam `transform` ou
  `opacity` com `transition` ficam sem essa transição. Isso só afeta quem estiver animando naquele instante.
- **Duração em dois lugares:** os 450 ms estão no CSS e na `DURACAO_TROCA_MS`, e cada um cita o outro.
- **Performance:** a transição vale para todos os elementos por 450 ms. Nas telas atuais o navegador dá conta;
  numa tela com muitos milhares de elementos, conferir.
