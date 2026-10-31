# 053. Seletor de projeto na General Results: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: seletor de projeto com busca

- [x] **T01. Busca opcional e `onEscolher` no `ProjetoSwitcher`**
  - Arquivos: `modules/projetos/components/ProjetoSwitcher.tsx`, `ProjetoSwitcher.test.tsx`,
    `core/i18n/resources.ts` (`searchProject`, `noProjectsFound` em en, pt e ko)
  - O que muda: com `buscavel`, o popover ganha o `SearchField` e o `Autocomplete` em volta do menu, filtrando por
    "contém" sem diferenciar maiúsculas, e a busca vazia mostra o aviso; com `onEscolher`, o switcher chama o
    callback em vez de navegar.
  - Cobre: CA-02, CA-03, CA-09
  - Verificação: `cd frontend && npm test -- ProjetoSwitcher` → busca filtra; busca sem resultado mostra
    "No projects found"; `onEscolher` recebe o id sem navegar; teclado abre, busca, escolhe com Enter e devolve o
    foco ao botão; sem `buscavel`, não há campo de busca (os testes de hoje continuam verdes).

## Fase 2: General Results sem abas

- [x] **T02. Título com o seletor e projeto no endereço**
  - Arquivos: `modules/projetos/pages/ResultadosGeraisPage.tsx`, `ResultadosGeraisPage.test.tsx`
  - O que muda: sai o `PageTabs`; o cabeçalho tem o `ProjetoSwitcher` (`projetos` da tela, `buscavel`,
    `onEscolher`) e a descrição; o projeto vem de `?projeto=` e um id fora da lista cai no primeiro; trocar grava
    `?projeto=` e limpa filtros, busca, página e modelos; a barra vai para uma linha acima da tabela.
  - Cobre: CA-01, CA-04, CA-05, CA-06, CA-07, CA-08
  - Verificação: `cd frontend && npm test -- ResultadosGeraisPage` → 40 projetos sem `tab` e com o primeiro no
    título; `?projeto=` válido abre o projeto e inválido abre o primeiro sem consultar o id do link; a troca volta
    sem filtros na página 1; um projeto só não tem seletor; sem projetos mostra o estado vazio.

## Fase 3: ponta a ponta

- [x] **T03. e2e da General Results com o seletor**
  - Arquivos: `e2e/resultados-gerais.spec.ts`
  - O que muda: o teste "troca de aba e de modelo" troca de projeto pelo seletor, buscando pelo nome; um passo
    novo confere que o card não rola para os lados e que recarregar mantém o projeto. Nenhum projeto novo é
    criado.
  - Cobre: CA-01, CA-02, CA-04
  - Verificação: `cd frontend && npm run e2e -- resultados-gerais` → verde.
- [ ] **T04. Suíte completa**
  - Verificação: `cd frontend && npm test && npm run lint && npm run e2e` → tudo verde. Backend sem mudança.

## Backlog
- **`destino` e `onEscolher` repetem o papel** (simplify da fase 1): os dois dizem o que fazer ao escolher um
  projeto. O Board poderia passar `onEscolher={(id) => navigate(`/board/${id}`)}` e o `destino` sairia, mas isso
  mexe no Board e na tela do projeto, fora desta spec.
- **Busca do switcher só filtra as páginas já carregadas** (simplify da fase 1): com `buscavel` e sem a lista
  pronta em `projetos`, um projeto além dos primeiros 100 só aparece depois de "Carregar mais". Hoje só a
  General Results liga a busca, e ela passa a lista inteira; vale corrigir se a tela do projeto ganhar busca.
