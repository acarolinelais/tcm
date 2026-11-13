# Regras de tabelas

Regras obrigatórias para qualquer tabela do frontend. O padrão é o do Figma (TCM, spec 022), montado sobre
o `Table` do HeroUI (ADR 0037) pelas composições de `frontend/src/shared/ui`:

| Arquivo | Papel |
|---|---|
| `data-table.tsx` | Moldura, cabeçalho, linhas, seleção e área de estado (`DataTable`) |
| `data-table-filter.tsx` | Filtro no cabeçalho da coluna (`DataTableFilter`; seleção múltipla em `DataTableMultiFilter`) |
| `data-table-pagination.tsx` | Total, itens por página e páginas (`DataTablePagination`) |
| `data-table-state.tsx` | Carregando, erro, vazio e vazio com filtro (`estadoDaTabela`) |
| `row-action-button.tsx` · `row-action-icon.ts` | Ações da linha em botões redondos (`RowActions`) |
| `tag-chip.tsx` | Etiquetas de status (`TagChip`, `TONS_ETIQUETA`) |
| `inline-select.tsx` | Edição na linha (`InlineSelect`) |

**Use essas composições; não crie um `<table>` cru, um `Table` do HeroUI montado direto na tela nem um
paginador próprio.** Se uma regra daqui precisar mudar, mude a composição compartilhada (e este documento),
não a tela isolada.
Exceção: a grade do **Resumo de execuções** (spec 032), uma tabela de leitura datas × devices dentro de um
painel, sem filtros, ações nem paginação, usa `<table>` semântico (`caption`, `th scope`).

> **Telas ainda em shadcn** (ADR 0037, migração gradual): até migrarem, elas continuam com
> `shared/ui/table.tsx`, `table-row-actions.tsx` e `table-column-filter.tsx` e seguem
> [tables-rules-legado.md](tables-rules-legado.md). Não misture os dois padrões numa mesma página.

## 1. Estrutura

```tsx
<DataTable
  aria-label={t("teams")}
  columns={colunas}            // { id, header, cell, isRowHeader?, className? }[]
  items={itens}
  getKey={(item) => item.id}   // opcional: padrão é item.id
  state={estadoDaTabela({ … })}
  pagination={<DataTablePagination … />}
  rowDependencies={[…]}        // estado de fora da linha de que as células dependem
/>
```

- A moldura cinza (raio 30px) envolve o corpo branco (raio 25px, 5px de recuo). O cabeçalho e a paginação
  ficam sobre a moldura. O corpo branco vai até o fim dela, mesmo com poucas linhas. As cores da moldura e das
  divisórias ficam em `tokensMoldura` (`data-table.tsx`).
- O `DataTable` ocupa a altura disponível. O cabeçalho é fixo e só o corpo rola, nunca a página inteira.
- Cabeçalho: Inter 500 14px `text-muted`, **sem caixa alta**, com divisórias entre as colunas. A última coluna
  não tem divisória.
- Linhas de 40px (Figma), texto Inter 400 14px, inclusive na coluna identificadora (`isRowHeader`). O texto fica a cerca de 10px da divisória da coluna.
- Uma coluna é o identificador da linha (`isRowHeader`: nome, TC ID). Ela dá o nome acessível da linha.
- Valor ausente aparece como `—`, nunca como célula vazia, `null` ou `undefined`.
- Datas com `formatDate`. Números e contagens alinhados à direita, com `tabular-nums`.
- **Cache de linhas:** o React Aria guarda as linhas pela identidade dos itens. Se uma célula depende de algo
  de fora da linha (permissões, membros, mutation em andamento), declare em `rowDependencies`. Sem a prop,
  as linhas redesenham a cada render da tela. Não copie os itens só para ganhar um `id`: use `getKey`.

## 2. Paginação

- **Padrão: 20 itens por página** (`DEFAULT_TABLE_PAGE_SIZE`, ADR 0034). Opções: `TABLE_PAGE_SIZE_OPTIONS`
  (10, 20, 50, 100), ambos em `shared/lib/paginacao.ts`. Sempre inicialize o estado com a constante:
  ```tsx
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  ```
- A `DataTablePagination` mostra o seletor de itens por página à esquerda, sem o total (ADR 0045), e
  "Anterior", os números das páginas (com reticências acima de 7) e "Próxima" à direita. A página atual fica
  destacada num círculo.
- Trocar o tamanho da página volta para a página 1: `onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }}`.
- Trocar qualquer filtro também volta para a página 1.
- A paginação é feita pelo servidor quando o endpoint devolve `PagedResult` (ADR 0004). Página e tamanho entram na `queryKey` do TanStack Query.
- Paginação no cliente só para listas pequenas que já chegam inteiras (ex.: membros de um time).
- Testes não fixam `10`/`20` à mão: importam `DEFAULT_TABLE_PAGE_SIZE`.
- Não há exceção: toda tabela é paginada. A tela Resultados Gerais, que era a única exceção (ADR 0038), também
  pagina os Test Cases, mantendo as até 5 colunas de data estáveis entre as páginas
  ([ADR 0039](adr/0039-resultados-gerais-com-paginacao.md) e [ADR 0046](adr/0046-resultados-gerais-com-cinco-datas.md)).
  Uma tela sem paginação precisa de ADR próprio.

## 3. Filtros

- Filtro de coluna fica **no cabeçalho**, com `DataTableFilter`: `options` para um conjunto fechado (status,
  pessoa), `type="date"` para data e, sem `options`, texto livre. `searchable` acrescenta busca nas opções.
- O rótulo da coluna é o próprio gatilho do filtro, com a seta de 14px do Figma à direita. Filtro ativo troca
  a seta pelo funil e a cor para `text-accent`. Não crie outro indicador.
- Toda lista de opções começa com "Todos": `comOpcaoTodos(t("all"), opcoes)` (`shared/lib/opcoes.ts`).
- Para escolher mais de um valor (ex.: Assignee), use `DataTableMultiFilter`: sem "Todos" (nada marcado desliga o
  filtro), cada opção marcada se aplica na hora e o menu segue aberto. O cabeçalho do menu tem "‹ Rótulo", que fecha,
  e "Limpar", que desmarca tudo. Esc só fecha, sem perder a escolha. A busca esconde opções sem desmarcar as escolhidas.
  No servidor, a lista vai como o mesmo parâmetro repetido (`?responsavel_id=a&responsavel_id=b`).
- Coluna de data filtra pelo calendário do HeroUI. O valor é o dia em `AAAA-MM-DD`, comparado com a data da
  linha no fuso do navegador, nunca por texto na data formatada.
- Filtro por semana usa o `WeekPickerHero` (`shared/ui/week-picker-hero.tsx`): botão do Figma e calendário com
  o número da semana ISO clicável. O valor é `AAAA-Www` (`semanaIso`). Não use `<input type="week">` nativo.
- Busca global (quando existir) fica acima da tabela, alinhada à esquerda. Ações da tela (ex.: "Novo") ficam
  à direita, no cabeçalho da página ou na barra de abas (`PageTabs`).

## 4. Estados

Toda tabela trata os quatro estados com `estadoDaTabela`, passado na prop `state`. Ele aparece no corpo branco,
no lugar das linhas:

| Estado | Como |
|---|---|
| Carregando | `<p role="status">` com o texto do domínio (ex.: `t("loadingTeams")`) |
| Erro | `<p role="alert">` em `text-danger`, com texto acionável (ex.: "Não foi possível carregar os times. Tente de novo.") |
| Vazio sem filtro | Ícone do domínio num círculo `bg-accent/10 text-accent`, título curto e uma dica do que fazer |
| Vazio com filtro | Ícone `SearchX`, título do domínio (ou `t("noResults")`) e botão "Limpar filtros", que zera os filtros e volta para a página 1 |

- O estado vazio nunca é uma linha `<tr>` com `colSpan`.
- Não mostre "Nenhum item" enquanto a requisição ainda carrega.
- Listas que repetem os mesmos textos (ex.: as listagens de Test Cases) criam um helper no módulo sobre
  `estadoDaTabela` (ex.: `estadoCasosTeste`), em vez de copiar a configuração.

## 5. Ações por linha

- Ficam na última coluna, cujo cabeçalho usa `t("actions")`. São **botões redondos de ícone, lado a lado e
  sempre visíveis** (`RowActions`), para todos os perfis. Não use menu "…".
- Cada botão é um círculo cinza (`#E4E4E7`) de 19px com ícone de traço 1,25px (`figma-icons.tsx` ou lucide com
  `rowActionIconProps`), dentro de um alvo de 24px. O tooltip mostra o rótulo.
- O nome acessível é "<ação> <identificador>" (ex.: "Transferir ao backup Clock_000001"). O rótulo é um verbo.
- Ações destrutivas ou de inativação usam `destructive: true`, ficam por último e aparecem em `danger`.
- Ações sem permissão não aparecem: monte o array conforme o papel (ADR 0015) em vez de mostrar a ação desabilitada.
- Se nenhuma linha tem ação para o usuário atual, a coluna inteira some (ex.: `mostrarAcoes`).
- Inativar ou excluir pede confirmação (`AlertConfirm`). Ativar não precisa.
- Sem DELETE físico: a ação é "Inativar"/"Ativar" (exclusão lógica, ADR 0008).

## 6. Status e etiquetas

- Status de domínio aparece como etiqueta (`TagChip`), nunca como texto solto: 17px de altura, raio pleno,
  Inter 500 12px, fundo claro e texto na cor forte. O rótulo sempre aparece junto da cor.
- As cores ficam no código, não aqui: `TONS_STATUS_CASO_TESTE` (`shared/lib/tom-etiqueta.ts`, reexportado como
  `statusChipTons` no módulo de projetos) para o status do Test Case, que a Auditoria também mostra, e
  `TONS_ETIQUETA` (`shared/ui/tag-chip.tsx`) para ativo (`ativo`), inativo e atributos neutros como a TC
  Situation (`neutro`). Um status novo ganha a cor no mapa do módulo dono; se outro módulo também mostrar esse
  status, o mapa sobe para `shared`.
- Atributos de texto (Difficulty, Category, pessoas) aparecem como texto, não como etiqueta.

## 7. Edição inline

- Só para campos de baixo risco que o usuário edita com frequência (status, categoria, dificuldade). Todo o resto vai para o painel de edição.
- O próprio valor é o gatilho do `InlineSelect`, com a seta cinza no fim da célula. Quem não pode
  editar vê só o valor, sem a seta.
- Grava ao mudar o valor (mutation do TanStack Query), sem botão "salvar". Em caso de erro, mostra um toast e o valor volta ao anterior.
- Sempre com `aria-label` que identifica a linha: `` `${t("difficulty")} ${testCase.tc_id}` ``.

## 8. Seleção e ações em lote

- Use `selection` no `DataTable` só quando existir uma ação em lote. A caixa de 14px fica na primeira coluna;
  a do cabeçalho marca só as linhas selecionáveis da página.
- Linha que não pode ser selecionada passa um motivo em `disabledReason`: a caixa fica desabilitada e o motivo
  vira tooltip e descrição acessível. Sem nenhuma linha selecionável, a coluna some.
- A ação em lote aparece com a contagem ("Transferir ao backup (2)"), pede confirmação e, no fim, informa
  quantos deram certo e quais falharam.
- A seleção pertence à tela e vale para a página, os filtros e a aba em que foi feita: mudou um deles, ela zera.

## 9. Densidade e responsividade

- Texto das células em 14px. Ícones de ação no tamanho nativo do Figma. Controles inline com 28px de altura.
- Em telas estreitas a tabela rola na horizontal dentro da moldura. A página nunca rola na horizontal.
- Não esconda colunas essenciais (identificador, status, ações) em breakpoints menores.
- Para revisar proporções depois de portar do Figma, use a skill `ui-density`.

## 10. Acessibilidade e textos

- Todos os textos passam por `t(...)` (i18n), nos três idiomas. Cabeçalhos são substantivos curtos e as ações são verbos (`better-writing`).
- Botões só de ícone sempre têm `aria-label`. Ícones decorativos têm `aria-hidden="true"`.
- Filtros, seletores e popovers fecham com `Esc` e devolvem o foco ao gatilho (React Aria).

## 11. Testes

- Cenário de sucesso: renderiza as linhas e pagina/filtra chamando a API com os parâmetros esperados.
- Cenário de falha: o estado de erro aparece com `role="alert"` (ADR 0010).
- Estado vazio com filtro: o botão "Limpar filtros" restaura a lista.
- No React Aria, a tabela é um `grid`: a célula do identificador é `rowheader` e as demais são `gridcell`; o
  nome da linha é o texto do identificador. Gatilhos de `Select` são `button`, as opções são `option` e a
  confirmação é um `alertdialog`.
- O `test-setup.ts` simula `ResizeObserver` e `getAnimations`, que o jsdom não tem e o HeroUI usa.
