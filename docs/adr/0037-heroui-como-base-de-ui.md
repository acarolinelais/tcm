# 0037. HeroUI como base de UI, com migração gradual a partir do shadcn/ui

- **Status:** Aceito
- **Data:** 2026-10-26
- **Relacionado:** ADR 0009, ADR 0022, ADR 0034
- **Substitui:** a regra "shadcn/ui + Tailwind é a única base de UI" do ADR 0009 e a regra do ADR 0022 que
  obriga as tabelas a usar `shared/ui/table.tsx`. A arquitetura Modular, o TanStack Query, o react-hook-form +
  zod e as demais regras visuais de tabela continuam valendo.

## Contexto
Os novos protótipos do Figma foram desenhados sobre o design do HeroUI (tabela com seleção, chips, avatar,
drawer, autocomplete, empty state, alert dialog, toast). Reproduzir esse visual em cima dos componentes
shadcn significaria reescrever à mão, um por um, componentes que o HeroUI já entrega prontos e acessíveis
(ele usa React Aria por baixo). O ADR 0009 proíbe outra biblioteca de componentes, e o ADR 0022 amarra
toda tabela a `shared/ui/table.tsx`. O projeto já usa React 19 e Tailwind v4, que são os requisitos do
HeroUI v3.

## Decisão
**HeroUI v3** (`@heroui/react` + `@heroui/styles`, versão fixada em `3.x`) é a base de UI do frontend.
Os requisitos `react-aria-components`, `react-aria` e `@internationalized/date` entram como dependências
diretas. O CSS entra pelo `core/global.css`, depois do Tailwind:

```css
@import "tailwindcss";
@import "@heroui/styles";
```

**Migração gradual, por página:**
- Uma tela nova ou redesenhada usa só HeroUI. Uma tela que ainda não foi migrada continua em shadcn.
  Não misture as duas bibliotecas na mesma página.
- Não adicione componentes shadcn novos em `shared/ui`. Um componente shadcn só pode ser alterado para
  corrigir um defeito.
- Quando um componente shadcn perde o último consumidor, apague-o de `shared/ui`, junto com as dependências
  `@radix-ui/*` que só ele usava.
- Peças globais trocam de uma vez só, na primeira spec da migração: os tokens de tema (um conjunto só,
  sem `--background`/`--border` duplicados entre shadcn e HeroUI) e o toast (`shared/lib/toast.ts` passa a
  usar o Toast do HeroUI no lugar do `sonner`). O `plan.md` dessa spec define como os tokens do shadcn são
  remapeados enquanto as telas antigas existirem.

**Onde os componentes ficam:**
- Os módulos importam os componentes primitivos direto de `@heroui/react` (`Button`, `Chip`, `Avatar`,
  `Checkbox`...).
- As composições que se repetem entre domínios ficam em `shared/ui`, montadas com HeroUI: o padrão de
  tabela (layout, estado vazio, paginação, filtros e ações por linha), o diálogo de confirmação e o toast.
  Uma tabela migrada usa a composição de `shared/ui`, nunca um `Table` do HeroUI montado na tela.

```tsx
// modules/usuarios/components/UsuariosTable.tsx
import { Chip } from "@heroui/react";
import { DataTable } from "@/shared/ui/data-table"; // composição compartilhada sobre o Table do HeroUI
```

O padrão visual de tabelas (espaçamento uniforme, estado vazio separado do cabeçalho, paginação à direita,
20 itens por página pelo ADR 0034, coluna de ações sem filtro) continua obrigatório. Muda só a implementação.

## Alternativas consideradas
- **Manter o shadcn e reestilizar com o visual dos protótipos:** não muda nenhum ADR, mas exige construir
  à mão Drawer, Autocomplete, EmptyState, seleção de linhas e o restante, sem acompanhar as atualizações do
  HeroUI. É mais trabalho para chegar a um resultado parecido com o do design.
- **Trocar tudo de uma vez:** remove o shadcn mais rápido, mas obriga a refazer todas as telas e os testes
  e2e numa entrega só, com mais risco de regressão e sem poder validar o design tela a tela.
- **HeroUI v2 (pacotes por componente, `@heroui/table` etc.):** permite instalar componente por componente,
  mas é a linha anterior e depende de Framer Motion. A v3 é a linha atual, foi feita para React 19 e
  Tailwind v4, e os componentes dos protótipos (EmptyState, Description, AlertDialog, CheckboxGroup) são
  os da v3.

## Consequências
- ✅ Os componentes dos protótipos vêm prontos e acessíveis (React Aria), e as telas ficam fiéis ao design.
- ✅ A migração acontece por página, cada uma validada com o Figma e com os testes dela.
- ✅ O padrão de tabela continua centralizado em `shared/ui`, como no ADR 0022.
- ⚠️ Durante a migração convivem duas bibliotecas, dois conjuntos de dependências e um bundle maior.
- ⚠️ O HeroUI é um pacote versionado de terceiro: mudanças de API numa versão nova afetam o projeto todo.
- ⚠️ Os seletores dos testes (Testing Library e Playwright) mudam nas telas migradas, porque o markup do
  React Aria é diferente do markup do Radix.
- ⚠️ A aceitação exige atualizar o status dos ADRs 0009 e 0022, o `CLAUDE.md`, as skills `react-crud` e
  `table-rules` e o `docs/tables-rules.md`.
