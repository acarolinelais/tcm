# 016. Upload da planilha no padrão do Figma: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0022, 0030
- **ADRs novos propostos:** nenhum (Web Worker é detalhe de implementação do módulo; não muda contrato nem stack)

## Abordagem

Só frontend; a API e o contrato de importação não mudam. O bloco de upload sai do `ProjetosPage` e vira o
componente `UploadPlanilha` do módulo `projetos`, com a área de soltar, o card do modelo, o card do
arquivo com a barra e as transições. A leitura da planilha passa para um **Web Worker**, porque o
`XLSX.read` é síncrono e trava a tela e a barra em planilhas grandes (RN-13). O hook `useLeituraPlanilha`
controla o ciclo de vida da leitura: progresso que só avança, cancelamento ao trocar ou remover o
arquivo, resultado de leitura antiga descartado e revelação da prévia só depois que a barra termina. O
movimento usa transições CSS com a curva da casa, sem biblioteca nova. Nada aqui é guiado
por gesto contínuo, então as transições CSS bastam.

## Leitura em segundo plano

- `utils/planilha-projeto.worker.ts` roda o `lerPlanilhaProjeto` atual e envia mensagens
  `{ tipo: "progresso", valor }`, `{ tipo: "ok", previa }` e `{ tipo: "erro", erros, totalLinhas, pessoas, colunas }`.
  O `PlanilhaProjetoError` é serializado nos campos dele e recriado do lado da página.
- `utils/ler-planilha-em-segundo-plano.ts` cria o worker com
  `new Worker(new URL("./planilha-projeto.worker.ts", import.meta.url), { type: "module" })` e devolve
  `{ promessa, cancelar }`. `cancelar()` chama `worker.terminate()`. Sem `Worker` (jsdom nos testes),
  ele cai para o `lerPlanilhaProjeto` na thread principal, com o mesmo contrato.
- Cada leitura recebe um número de geração. Resultado ou progresso de uma geração antiga é ignorado
  (RN-15, CA-12), o que também cobre o fallback, que não tem como ser cancelado.

## Hook `useLeituraPlanilha`

Estado: `{ arquivo, fase: "vazio" | "lendo" | "concluida" | "erro", progresso, previa, erros, totalLinhasComErro }`.

- `selecionar(file)` valida o formato e o tamanho (RN-10). Um arquivo recusado não altera o estado e
  devolve o motivo para a mensagem junto da área (RN-19). Um arquivo aceito cancela a leitura atual,
  zera o progresso (a barra volta animada de onde estava, RN-15) e inicia uma nova geração.
- O progresso só sobe dentro de uma geração: `setProgresso(p => Math.max(p, novo))` (RN-12).
- Ao receber o resultado, o hook marca 100% e só muda para `concluida` ou `erro` depois de
  `DURACAO_BARRA_MS`, que é 300 ms (ou 0 com movimento reduzido). Assim a prévia aparece quando a barra
  termina de encher (RN-12, CA-11).
- `limpar()` remove o arquivo ou limpa o formulário: cancela a leitura e volta para `vazio`. Ao remover,
  o componente mostra `toast.success(t("spreadsheetRemoved"))`, no estilo dos demais avisos e sem
  Desfazer (RN-16, CA-13).
- `definirErrosDoServidor()` recebe os problemas que o servidor devolve ao conferir a planilha e leva a
  leitura para `erro`, reabrindo a área (RN-18).

## Componente `UploadPlanilha`

- **Área de soltar:** um `<button type="button">` que ocupa a área toda (RN-01). Clique, Enter e Espaço
  vêm de graça com o botão. "Choose file" passa a ser um `<span>` com o estilo de link dentro dele (nada
  de botão dentro de botão). O nome acessível é "Arraste a planilha ou escolha um arquivo".
  `onDragEnter`/`onDragOver`/`onDrop` continuam como hoje.
- **Estados visuais (RN-02):** `.dropzone-tracejada` ganha `:hover`, `:focus-visible` e
  `[data-arrastando]` com fundo `#EFF5FF` e borda tracejada `#3672F2`, numa transição
  `background-color 150ms ease-out`. O traço azul troca na hora; não dá para animar o SVG da borda. Ao
  pressionar, `active:scale-[0.995]` em 100 ms.
- **Recolher e reabrir (RN-14, RN-17a):** o invólucro da área usa `grid-template-rows: 1fr ↔ 0fr`.
  - Reabrir: 350 ms. Recolher: 250 ms. As duas com `cubic-bezier(0.32, 0.72, 0, 1)`, a mesma do
    sidebar, criticamente amortecida e sem ultrapassar o alvo.
  - O conteúdo interno (ícone e texto) faz `opacity 0 → 1` e `translateY(4px) → 0`, com 80 ms de atraso
    na abertura e sem atraso no fechamento, para surgir depois de a área começar a crescer.
  - Recolhida, a área fica `inert` e `aria-hidden`. Ao começar a reabrir, ela já aceita foco e soltar
    arquivo (RN-17a), porque o `inert` sai no primeiro frame.
  - Os formatos aceitos e o card abaixo descem junto, porque fazem parte do mesmo fluxo de layout.
- **Troca entre o card do modelo e o card do arquivo:** fade com 4 px de subida na entrada (200 ms) e o
  caminho inverso na saída (150 ms). O `usePresenca` (`shared/lib`) mantém o card montado durante a
  saída (RN-17).
- **Barra (Figma):** trilho `h-1.5 rounded-full bg-[#E5E9F0]` e preenchimento `bg-primary` com
  `transform: scaleX(p/100)`, `origin-left` e `transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)`.
  Usar `transform` em vez de `width` evita reflow. O percentual fica em `tabular-nums` à direita.
  - Concluída: o percentual vira um ícone de check verde e a linha secundária mostra
    "3 MB · 120 Test Cases" (RN-14, RN-22).
  - Erro: o preenchimento vira `bg-destructive`, com o ícone `CircleAlert` e o texto "Não foi possível
    ler a planilha". A barra fica no valor em que parou (RN-18).
- **Acessibilidade (RN-23):**
  - A barra tem `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow` e
    `aria-label="Leitura da planilha"`.
  - Uma região `aria-live="polite"` separada fala só "Lendo planilha…", "Planilha lida: 120 Test Cases"
    e "Não foi possível ler a planilha".
  - Depois de remover, o foco vai para o botão da área quando a reabertura começa (RN-17).
- **Arquivo recusado (RN-19):** um `<p role="alert" class="text-destructive">` abaixo dos formatos, que
  some quando um arquivo válido é aceito. O toast atual continua.
- **Movimento reduzido (RN-24):** `motion-reduce:` troca `grid-template-rows` e `translate` por uma
  mudança instantânea de tamanho com fade de 150 ms. A barra mantém a transição de `transform` em 150 ms,
  porque mostra informação.

## Prévia dos Test Cases

- Entrada da prévia (RN-20): fade com 8 px de subida em 250 ms, com a mesma curva. Sem `scrollIntoView`.
- Altura estável (RN-21, CA-14): quando há mais de uma página, o contêiner rolável usa `h-96` em vez de
  `max-h-96`, então trocar de página não muda a altura.

## Contrato da API

Sem mudança.

## Frontend: arquivos

- `src/modules/projetos/components/UploadPlanilha.tsx` (novo) e `UploadPlanilha.test.tsx` (novo).
- `src/modules/projetos/hooks/useLeituraPlanilha.ts` (novo) e `useLeituraPlanilha.test.ts` (novo).
- `src/modules/projetos/utils/planilha-projeto.worker.ts` (novo) e `ler-planilha-em-segundo-plano.ts` (novo).
- `src/modules/projetos/components/PreviaPlanilha.tsx` e o teste dele: altura estável.
- `src/modules/projetos/ProjetosPage.tsx` e `ProjetosPage.test.tsx`: troca o bloco atual por
  `<UploadPlanilha>` e passa a usar o hook.
- `src/core/global.css`: hover, foco e arraste da `.dropzone-tracejada`.
- `src/core/i18n/resources.ts`: chaves em en, pt-BR e ko para o nome acessível da área, os anúncios, o
  erro de leitura, "Planilha removida" e "{{count}} Test Cases".
- `e2e/projetos-importacao.spec.ts`: o fluxo atual, mais remover e o arquivo recusado.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-02 | Vitest | `UploadPlanilha.test.tsx`: clique na área, Enter e Espaço chamam o `click` do input |
| CA-03 | Vitest | `UploadPlanilha.test.tsx`: `data-arrastando` no dragenter e removido no dragleave; o hover é CSS, conferido visualmente |
| CA-04 | Vitest | `UploadPlanilha.test.tsx`: sem arquivo, o card do modelo e o botão de download aparecem |
| CA-05, CA-11 | Vitest + e2e | `useLeituraPlanilha.test.ts`: o progresso só sobe e a prévia só sai após `DURACAO_BARRA_MS`; e2e: card, barra com `aria-valuenow` 100, área recolhida e prévia |
| CA-06, CA-12 | Vitest | `useLeituraPlanilha.test.ts`: leitura A lenta e B rápida; só a prévia de B aparece, e o `cancelar` de A é chamado |
| CA-07, CA-13, CA-13a | Vitest + e2e | `useLeituraPlanilha.test.ts`: limpar durante a leitura descarta o resultado; `UploadPlanilha.test.tsx`: foco na área e aviso "Planilha removida" após remover; e2e: remover reabre a área e o card do modelo |
| CA-08 | Vitest + e2e (falha) | `.csv` e 26 MB: mensagem junto da área, estado mantido e leitura não iniciada |
| CA-09 | Vitest (falha) | Leitura com erro: barra em erro, com ícone e texto, área reaberta e problemas exibidos |
| CA-10 | Manual + e2e | e2e com a planilha de 1.000 TCs: a barra avança e o remover responde durante a leitura (worker real no navegador) |
| CA-14 | Vitest | `PreviaPlanilha.test.tsx`: o contêiner tem `h-96` com mais de uma página |
| CA-15 | Vitest | A região live recebe só os textos de início, fim e erro |
| CA-16 | Manual | Conferir com `prefers-reduced-motion: reduce` no DevTools: só fades |

## Riscos e decisões pendentes

- **Worker no build:** o worker importa o xlsx sob demanda, o que exige `worker: { format: "es" }` no
  `vite.config.ts`. Com o formato padrão (`iife`) o `vite build` falha.
- **Worker no Vite e no Vitest:** o Vite empacota `new URL(..., import.meta.url)` sem configuração. No
  jsdom não existe `Worker`, por isso o fallback na thread principal. A leitura em worker só é exercitada
  de verdade no e2e.
- **A borda tracejada é um SVG de fundo,** então a troca de cor da borda é instantânea. Só o fundo faz
  transição. Se precisar animar a borda também, ela teria de virar `border-dashed`, que segue outro
  desenho de traço.
