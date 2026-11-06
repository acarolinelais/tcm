# 053. Seletor de projeto na General Results: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

Só o frontend muda. A tela já carrega todos os projetos do escopo (`useProjetosSeletor`, todas as páginas) e
consulta o histórico de um projeto por vez, então a API e a lista continuam as mesmas.

- As abas (`PageTabs`) saem da `ResultadosGeraisPage`. O título passa a ser o `ProjetoSwitcher`, o mesmo
  menu da tela do projeto e do Board, com o nome do projeto aberto.
- O `ProjetoSwitcher` ganha uma busca opcional (`buscavel`): o `Autocomplete` do `react-aria-components`
  (dependência direta, ADR 0037) envolve o `Dropdown.Menu` com um `SearchField` do HeroUI no topo do popover
  e filtra os itens por "contém", sem diferenciar maiúsculas. O menu continua navegável por teclado, e a busca
  sem resultado usa o `renderEmptyState` do menu. A tela do projeto e o Board não passam `buscavel` e ficam
  como estão.
- O `ProjetoSwitcher` ganha também `onEscolher` (opcional). Quando ele é passado, o switcher chama o callback
  em vez de navegar. A General Results usa o callback para gravar `?projeto=` e limpar filtros, página e
  modelos escolhidos (RN-04), como a troca de aba faz hoje.
- O projeto aberto vem de `?projeto=` (`useSearchParams`). Um id que não está na lista cai no primeiro projeto,
  como hoje cai a aba inválida (RN-03, CA-05). O endereço não é reescrito.
- A barra (busca de caso, Day or Week, Limpar filtros) que ficava nas `actions` das abas passa para uma linha
  própria acima da tabela, alinhada à direita.

## Modelo de dados

Sem mudança.

## Contrato da API

Sem mudança.

## Backend: arquivos

Nenhum.

## Frontend: arquivos

- `modules/projetos/components/ProjetoSwitcher.tsx`: props `buscavel` e `onEscolher`. Com `buscavel`, o
  popover tem o `SearchField` e o `Autocomplete` em volta do menu, com `useFilter({ sensitivity: "base" })`.
- `modules/projetos/components/ProjetoSwitcher.test.tsx`: busca filtra, busca vazia mostra o aviso,
  `onEscolher` é chamado sem navegar, e sem `buscavel` o menu continua sem campo de busca.
- `modules/projetos/pages/ResultadosGeraisPage.tsx`: sai o `PageTabs`/`PageTabPanel`; o cabeçalho tem o
  `ProjetoSwitcher` (`projetos` da própria tela, `buscavel`, `onEscolher`) e a descrição de hoje; o projeto
  vem de `?projeto=`; a barra vai para uma linha acima da `HistoricoProjetoTabela`.
- `modules/projetos/pages/ResultadosGeraisPage.test.tsx`: os testes que clicam em abas passam a usar o
  seletor; testes novos para 40 projetos sem abas, `?projeto=` válido e inválido, troca limpando filtros,
  projeto único sem seletor e teclado.
- `core/i18n/resources.ts`: `searchProject` ("Search project" / "Buscar projeto" / "프로젝트 검색") e
  `noProjectsFound` ("No projects found" / "Nenhum projeto encontrado" / "프로젝트를 찾을 수 없습니다").
- `e2e/resultados-gerais.spec.ts`: o teste "troca de aba e de modelo" passa a trocar pelo seletor, buscando
  pelo nome; um passo novo confere que a tela não rola para os lados e que recarregar mantém o projeto.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Vitest + e2e | 40 projetos: só o título com o primeiro projeto, nenhum `tab`; no e2e, `scrollWidth <= clientWidth` do card |
| CA-02 | Vitest + e2e | Busca parte do nome, escolhe, e a tabela consulta o histórico do projeto escolhido |
| CA-03 | Vitest | Busca sem resultado mostra "No projects found" e o projeto aberto não muda |
| CA-04 | Vitest + e2e | `?projeto=` abre esse projeto; no e2e, recarregar mantém o projeto |
| CA-05 | Vitest | `?projeto=` fora da lista abre o primeiro, sem consultar o histórico do id do link |
| CA-06 | Vitest | Filtro, busca de caso e página 2 ativos; trocar de projeto volta sem filtros, na página 1 |
| CA-07 | Vitest | Um projeto só: título sem botão de seletor |
| CA-08 | Vitest | Sem projetos: estado vazio, sem seletor (o teste de hoje, ajustado) |
| CA-09 | Vitest | Teclado: abre o seletor, digita, escolhe com Enter e o foco volta ao botão do título |

## Riscos e decisões pendentes

- **"General Results" sai do título:** o nome da tela dá lugar ao nome do projeto, como na tela do projeto. O
  item da navegação lateral continua marcado e a descrição continua embaixo do título. Se a tela precisar do
  nome visível, ele pode voltar como uma linha pequena acima do seletor, sem mudar o resto do plano.
- **Foco ao escolher:** o `Dropdown` do HeroUI devolve o foco ao botão quando o menu fecha. Com o
  `Autocomplete` dentro do popover, o foco fica no campo de busca enquanto se digita; o teste de teclado
  (CA-09) confere que ele volta ao botão.
- **Projetos dos e2e:** o banco local junta projetos criados pelos e2e (backlog da spec 037). Com o seletor, eles
  não quebram mais a tela, mas o e2e novo não cria projetos para não piorar isso.
