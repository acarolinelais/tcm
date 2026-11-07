# 0052. Dois tamanhos de botão, os do HeroUI

- **Status:** Proposto
- **Data:** 2026-11-07

## Contexto
Cada tela escolheu a altura e o texto dos botões à mão no `className`. Hoje há botões de 26, 28, 32, 36, 40 e
46 px, com texto de 12 a 15 px, às vezes lado a lado na mesma barra. Na tela Projects, o "New project" tem 32 px;
nas outras listagens, o botão equivalente tem 36 px. Na General Results, as pílulas de filtro tinham 15 px de texto,
e os botões ao lado, 14 px. O HeroUI já traz dois tamanhos que cobrem quase todos esses casos.

## Decisão
Usamos só os dois tamanhos do HeroUI e não escolhemos altura nem tamanho de texto do botão no `className`.

- **Padrão** (sem `size`: 36 px no desktop, 40 px no celular, texto de 14 px): ações do cabeçalho da página,
  barras de ferramentas, pílulas de filtro (Filter, Today, Day or Week, Closed projects), rodapés de drawer e de
  diálogo e os botões só de ícone que ficam nesses lugares.
- **`size="sm"`** (32 px, texto de 14 px): ações dentro de tabela, de estado vazio, de filtro de coluna e de aviso
  de erro ("Clear filters", "Try again"), de rodapé de popover e de card ou item de lista, inclusive os só de ícone.

O `className` continua livre para cor, borda, arredondamento (`rounded-full` nas pílulas), espaçamento e ícone.

```tsx
<Button variant="outline" className="rounded-full">{t("today")}</Button>          // barra: padrão
<Button size="sm" variant="outline" onPress={onRetry}>{t("retryQuery")}</Button>   // estado vazio: sm
<Button size="sm" variant="ghost" isIconOnly aria-label={t("edit")}><Pencil /></Button>
```

Exceções, que mantêm a altura própria:
- o botão principal do login e da troca de senha inicial (46 px), que seguem o visual das telas de autenticação;
- os controles de paginação e de exportação da tabela (26 px), alinhados ao texto do rodapé;
- o seletor de projeto que faz o papel de título da página;
- os itens de um grupo segmentado (`ToggleButtonGroup`), que se medem pelo trilho do grupo;
- os cards clicáveis (Timeline), que não têm cara de botão;
- o botão na mesma linha de um campo de formulário, que acompanha a altura do campo (40 px);
- os gatilhos com cara de texto dentro da tabela (título de coluna com filtro, contagem com tooltip), que não podem
  aumentar a altura da linha;
- o `RowActionButton`, que tem o tamanho próprio do Figma.

## Alternativas consideradas
- **Dois tamanhos com texto de 15 px no cabeçalho e nas barras:** mantém o texto das pílulas atuais, mas obriga a
  sobrescrever o tamanho do HeroUI em todo botão de barra, e é justamente isso que espalhou as alturas e os textos
  escolhidos à mão.
- **Um tamanho só (36 px):** fica mais uniforme, mas pesa nas tabelas e nos estados vazios, onde o botão divide
  espaço com texto pequeno e com os ícones de linha.

## Consequências
- ✅ Botões vizinhos ficam com a mesma altura e o mesmo texto, sem conferir tela por tela.
- ✅ Uma mudança de tamanho passa a ser feita no tema do HeroUI, não em dezenas de `className`.
- ⚠️ As pílulas de filtro perdem 1 px de texto (15 → 14 px) em relação ao protótipo da General Results.
- ⚠️ No celular, o botão padrão tem 40 px e o `sm` tem 36 px, como o HeroUI define; as barras ficam um pouco mais altas.
