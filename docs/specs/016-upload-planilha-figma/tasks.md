# 016. Upload da planilha no padrão do Figma: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: leitura em segundo plano

- [x] **T01. Worker de leitura com cancelamento e fallback**
  - Arquivos: `frontend/src/modules/projetos/utils/planilha-projeto.worker.ts`,
    `frontend/src/modules/projetos/utils/ler-planilha-em-segundo-plano.ts` e o teste dele
  - Cobre: CA-09, CA-10 (base)
  - Verificação: `cd frontend && npm test -- ler-planilha-em-segundo-plano` → verde. Sem `Worker`, a
    função usa o fallback e devolve a prévia; um `PlanilhaProjetoError` chega recriado com erros,
    total de linhas, pessoas e colunas; `cancelar()` encerra o worker (com `Worker` simulado).
- [x] **T02. Hook `useLeituraPlanilha`**
  - Arquivos: `frontend/src/modules/projetos/hooks/useLeituraPlanilha.ts` e o teste dele
  - Cobre: CA-05, CA-06, CA-07, CA-08, CA-09, CA-11, CA-12, CA-13
  - Verificação: `cd frontend && npm test -- useLeituraPlanilha` → verde. Os testes cobrem: o progresso
    só sobe; a prévia só sai após `DURACAO_BARRA_MS`; trocar de arquivo descarta o resultado antigo e
    cancela a leitura; `.csv` e 26 MB devolvem o motivo sem mudar o estado; erro de leitura vai para a
    fase `erro`; limpar durante a leitura descarta o resultado.

## Fase 2: interface

- [x] **T03. Componente `UploadPlanilha` (área, cards, barra e anúncios)**
  - Arquivos: `frontend/src/modules/projetos/components/UploadPlanilha.tsx` e o teste dele,
    `frontend/src/core/global.css`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-02, CA-03, CA-04, CA-05, CA-08, CA-09, CA-13a, CA-15, CA-16
  - Verificação: `cd frontend && npm test -- UploadPlanilha` → verde. Os testes cobrem: clique, Enter e
    Espaço abrem o seletor; `data-arrastando` no arraste; card do modelo sem arquivo; barra com
    `role="progressbar"` e valor; estado concluído com o total de Test Cases; estado de erro com ícone e
    texto; mensagem de arquivo recusado junto da área; a região live só com início, fim e erro; foco na
    área depois de remover. Usar as skills `better-accessibility` e `better-writing`.
- [x] **T04. Prévia com altura estável**
  - Arquivos: `frontend/src/modules/projetos/components/PreviaPlanilha.tsx` e o teste dele
  - Cobre: CA-14
  - Verificação: `cd frontend && npm test -- PreviaPlanilha` → verde. A prévia usa `h-96` quando há mais
    de uma página.
- [x] **T05. Tela de criação usa `UploadPlanilha` e o hook**
  - Arquivos: `frontend/src/modules/projetos/ProjetosPage.tsx`, `ProjetosPage.test.tsx`
  - Cobre: CA-05, CA-07, CA-13
  - Verificação: `cd frontend && npx tsc -b && npm test && npm run lint` → verde. Criar o projeto pela
    planilha continua funcionando, e remover avisa "Planilha removida" e volta o card do modelo.

## Fase 3: e2e

- [x] **T06. E2E do upload**
  - Arquivos: `frontend/e2e/projetos-importacao.spec.ts`
  - Cobre: CA-05, CA-08, CA-10, CA-13, CA-13a
  - Verificação: `cd frontend && npm run e2e -- projetos-importacao` → verde. O teste cobre: escolher a
    planilha mostra o card com a barra em 100%, a área recolhe e a prévia aparece; com 1.000 TCs, o
    remover responde durante a leitura; remover reabre a área e o card do modelo e avisa a remoção; um
    `.csv` mostra o motivo junto da área.

## Backlog
- **Conferência manual de CA-03 e CA-16.** O fundo azul no hover e a versão com movimento reduzido são
  CSS e não têm teste automatizado. Conferir no navegador, e com `prefers-reduced-motion: reduce` no
  DevTools.
- **Setup repetido nos e2e antigos de importação (simplify, Fase 3).** Os 5 testes anteriores de
  `projetos-importacao.spec.ts` ainda abrem o formulário e escolhem o arquivo à mão. Os helpers
  `abrirNovoProjeto` e `escolher` já existem no arquivo e podem ser usados neles.

