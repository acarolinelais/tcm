# Regras de tabelas: padrão legado (shadcn)

> **Só para as telas que ainda usam shadcn** (`shared/ui/table.tsx`, `table-row-actions.tsx`, `table-column-filter.tsx`).
> Tela nova ou migrada segue [tables-rules.md](tables-rules.md) (ADR 0037). Apague este arquivo quando a última tela migrar.


Regras obrigatórias para qualquer tabela do frontend. Os componentes base ficam em
`frontend/src/shared/ui/table.tsx`, `table-row-actions.tsx` e `table-column-filter.tsx`. **Use esses
componentes; não crie um `<table>` cru nem um paginador próprio.** Se uma regra daqui precisar mudar,
mude o componente compartilhado (e este documento), não a tela isolada.

## 1. Estrutura

```tsx
<TableLayout>
  <Table containerClassName={temItens ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
    <TableHeader><TableRow>…<TableHead>…</TableHead></TableRow></TableHeader>
    {temItens ? <TableBody>…</TableBody> : null}
  </Table>
  {!temItens && <TableEmptyState>…</TableEmptyState>}
  <TablePagination … />
</TableLayout>
```

- `TableLayout` ocupa a altura disponível. O cabeçalho é `sticky`, e só o corpo da tabela rola, nunca a página inteira.
- Contêineres com rolagem (tabela, prévia, formulário longo) usam a classe `thin-scroll` (`core/global.css`): barra fina, sem setas.
- Com itens, o container recebe `min-h-0 flex-1 overflow-auto`. Sem itens, recebe `shrink-0 overflow-visible`, para o estado vazio não ficar espremido.
- Não sobrescreva o visual do cabeçalho (fundo `#EAF0FF`, cantos arredondados, `uppercase`, `font-semibold`, `tracking-wide`) nem o padding das células (`px-5 py-5`) em telas isoladas.
- Primeira coluna é o identificador da linha (nome, TC ID), em `font-medium`, e pode ser um link para o detalhe. As colunas secundárias usam `text-muted-foreground`.
- Valor ausente aparece como `—`, nunca como célula vazia, `null` ou `undefined`.
- Datas com `toLocaleDateString()`. Números e contagens alinhados à direita, com `tabular-nums`.

## 2. Paginação

- **Padrão: 20 itens por página** (`DEFAULT_TABLE_PAGE_SIZE`). Opções: `TABLE_PAGE_SIZE_OPTIONS` (10, 20, 50, 100).
  Sempre inicialize o estado com a constante, nunca com um número literal:
  ```tsx
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  ```
- O `TablePagination` tem primeira, anterior, próxima e última página e mostra "Página X de Y".
- Trocar o tamanho da página volta para a página 1: `onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }}`.
- Trocar qualquer filtro também volta para a página 1.
- A paginação é feita pelo servidor quando o endpoint devolve `PagedResult` (ADR 0004). Página e tamanho entram na `queryKey` do TanStack Query.
- Paginação no cliente só para listas pequenas que já chegam inteiras (ex.: membros de um time).
- Testes não fixam `10`/`20` à mão: importam `DEFAULT_TABLE_PAGE_SIZE`.

## 3. Filtros

- Filtro de coluna fica **no cabeçalho**, com `TableColumnFilter`: `options` para um conjunto fechado (status, categoria, pessoa) ou texto livre (sem `options`).
- Coluna de data filtra com `type="date"`, que abre o `Calendar` do shadcn (`shared/ui/calendar.tsx`, react-day-picker) no popover do cabeçalho. Escolher o dia aplica o filtro. O valor é o dia em `AAAA-MM-DD` (`formatarDiaIso`/`lerDiaIso` de `shared/lib/utils`), comparado com a data da linha no fuso do navegador, nunca por texto na data formatada. Não use `<input type="date">` nativo.
- Filtro por semana usa o `WeekPicker` (`shared/ui/week-picker.tsx`): Calendar com número da semana ISO clicável, a semana inteira destacada e os botões "Limpar filtros" e "Esta semana". O valor é `AAAA-Www` (`semanaIso`). Não use `<input type="week">` nativo.
- Popovers usam `bg-card`: o token `bg-popover` não existe no tema.
- Toda lista de opções começa com `{ value: "", label: t("all") }`.
- Filtro ativo muda o ícone do cabeçalho para `Filter` e a cor para `text-primary`. Não crie outro indicador.
- Busca global (quando existir) fica acima da tabela, alinhada à esquerda. Ações primárias (ex.: "Novo") ficam à direita.

## 4. Estados

Toda tabela trata os quatro estados, e cada um tem a sua mensagem:

| Estado | Como |
|---|---|
| Carregando | `<p role="status">` dentro do `TableEmptyState` (ex.: `t("loadingSectors")`) |
| Erro | `<p role="alert" className="text-destructive">` com texto acionável (ex.: "Não foi possível carregar os setores.") |
| Vazio sem filtro | Ícone do domínio num círculo `bg-primary/10 text-primary`, título curto e uma dica do que fazer |
| Vazio com filtro | Ícone `SearchX`, título `t("noResults")` e botão `outline` "Limpar filtros", que zera os filtros e volta para a página 1 |

- O estado vazio usa `TableEmptyState` (ou `TableEmptyStatePanel`), nunca uma linha `<tr>` com `colSpan`.
- Não mostre "Nenhum item" enquanto a requisição ainda carrega.

## 5. Ações por linha

- Ficam na última coluna (`text-right`), dentro do menu `TableRowActions` (botão `…`). O cabeçalho dessa coluna usa `t("actions")`.
- Cada ação tem ícone lucide e rótulo com verbo ("Editar", "Inativar"). Ações destrutivas ou de inativação usam `destructive: true` e ficam por último.
- O `label` do `TableRowActions` é o identificador da linha, que vira o nome acessível do botão (`rowActionsFor`).
- Ações sem permissão não aparecem: monte o array conforme o papel (ADR 0015) em vez de mostrar a ação desabilitada.
- Se nenhuma linha tem ação para o usuário atual, a coluna inteira some (ex.: `mostrarAcoes`).
- Inativar ou excluir pede confirmação em diálogo. Ativar não precisa.
- Sem DELETE físico: a ação é "Inativar"/"Ativar" (exclusão lógica, ADR 0008).

## 6. Status e badges

- Status de domínio aparece como badge, nunca como texto solto. Para status de progresso (status de TC, status de projeto), use o padrão "pill com ícone":
  - Container `h-7 w-fit gap-1.5 rounded-md px-2 text-sm font-medium` com fundo claro da cor (`bg-green-50 text-green-800`).
  - À esquerda, um círculo cheio `size-4 rounded-full` na cor forte (`bg-green-800`), com ícone lucide branco `size-2.5 stroke-[3]` e `aria-hidden`.
  - Mapa de cores: To-Do/neutro = slate · em andamento = blue · em revisão = amber · sucesso = green · falha = red.
  - Referência: `statusBadges` em `modules/projetos/components/status-badge-estilos.ts` e `StatusBadgeContent` em `modules/projetos/components/StatusBadge.tsx`.
- Ativo/inativo: `Badge variant="secondary"`, com `bg-emerald-50 text-emerald-700` quando ativo.
- A cor nunca é a única pista: o rótulo em texto sempre aparece junto.
- Quando o usuário pode alterar o status, o badge vira o próprio `SelectTrigger` (mesmas classes, `border-0 shadow-none`), com `aria-label` do tipo `"<campo> <identificador>"`. Quem não pode alterar vê o mesmo badge, só para leitura.

## 7. Edição inline

- Só para campos de baixo risco que o usuário edita com frequência (status, categoria, dificuldade). Todo o resto vai para o drawer de edição.
- Grava ao mudar o valor (mutation do TanStack Query), sem botão "salvar". Em caso de erro, mostra um toast e o valor volta ao anterior.
- Sempre com `aria-label` que identifica a linha: `` `${t("difficulty")} ${testCase.tc_id}` ``.

## 8. Densidade e responsividade

- Texto das células em `text-sm`. Ícones da tabela entre `size-4` e `size-5`. Controles inline com `h-8`.
- Em telas estreitas a tabela rola na horizontal dentro do container. A página nunca rola na horizontal.
- Não esconda colunas essenciais (identificador, status, ações) em breakpoints menores.
- Para revisar proporções depois de portar do Figma, use a skill `ui-density`.

## 9. Acessibilidade e textos

- Todos os textos passam por `t(...)` (i18n). Cabeçalhos são substantivos curtos e as ações são verbos (`better-writing`).
- Botões só de ícone sempre têm `aria-label`. Ícones decorativos têm `aria-hidden="true"`.
- Menus e filtros fecham com `Esc` e devolvem o foco ao gatilho (já implementado nos componentes base).

## 10. Testes

- Cenário de sucesso: renderiza as linhas e pagina/filtra chamando a API com os parâmetros esperados.
- Cenário de falha: o estado de erro aparece com `role="alert"` (ADR 0010).
- Estado vazio com filtro: o botão "Limpar filtros" restaura a lista.
