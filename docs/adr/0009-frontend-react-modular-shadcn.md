# 0009. Frontend React com arquitetura Modular e shadcn/ui

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
O frontend precisa de uma organização previsível, que agrupe cada domínio em um lugar só, com uma base
compartilhada clara, e de uma biblioteca de componentes para telas administrativas (tabelas, formulários, modais).

## Decisão
**React + Vite + TypeScript**, SPA. O dev server do Vite usa um proxy que encaminha `/api` para o backend.

**Arquitetura Modular** em `frontend/src/`, com três áreas:
```
core/      # app-wide: providers (router, QueryClient), cliente HTTP, layout,
           # config, tratamento de ProblemDetails, guardas
shared/    # sem domínio: ui (componentes shadcn), lib/utils, hooks genéricos, tipos base (PagedResult<T>)
modules/   # um módulo por domínio, autossuficiente:
  usuarios/
    pages/        # páginas roteáveis (ex.: UsuariosPage)
    components/   # blocos de UI de apresentação (ex.: UsuariosTable, UsuarioForm)
    api/          # cliente HTTP do domínio (usuario.api.ts)
    model/        # tipos do domínio (usuario.ts)
    hooks/        # hooks de dados (TanStack Query) e de estado do módulo
    routes.tsx    # rotas do módulo
    index.ts      # API pública do módulo
```
Regras de dependência:
- Um módulo importa de `shared/` e de `core/` e da **própria** pasta. **Um módulo não importa outro módulo**
  direto; o que precisa ser reutilizado entre domínios sobe para `shared/` (sem domínio) ou é exposto pelo
  `index.ts` do módulo dono e importado com parcimônia.
- `core/` e `shared/` **não** importam de `modules/`.
- `shared/` não importa de `core/`.
- Cada módulo expõe sua API pública em `index.ts`; ninguém importa arquivos internos de outro módulo.
- As regras são verificadas no lint (ESLint com `eslint-plugin-boundaries`, elementos `core`, `shared`, `modules`).

**shadcn/ui + Tailwind** é a única base de UI. Os componentes do shadcn (`button`, `input`, `table`,
`dialog`, `form`, `badge`, `sonner`/toast...) ficam em `shared/ui` e são estilizados com Tailwind.
Nada de outra biblioteca de componentes.

**Estado e dados:** **TanStack Query** para ler e invalidar dados do servidor (listas, item), encapsulado
nos hooks do módulo; **react-hook-form + zod** para formulários, com o schema zod espelhando o validator do
backend. Estado local de UI com hooks do React. Sem Redux por enquanto.

**Erros:** um helper em `shared` (ou `core`) lê o ProblemDetails (ADR 0006). Os erros por campo (`errors`)
são aplicados no formulário (react-hook-form `setError`); os demais aparecem em um toast.

## Alternativas consideradas
- **Feature-Sliced Design (app/pages/widgets/features/entities/shared):** regras de dependência mais rígidas,
  mas mais camadas e menos comum; a modular por domínio é mais direta para este CRUD.
- **Next.js:** SSR e roteamento por arquivo atritam com a modular por domínio e com o backend Python separado.
- **Material UI / Ant Design:** componentes prontos, mas o shadcn/ui + Tailwind dá controle total sobre o
  markup e o estilo, e foi o pedido do projeto.
- **Redux/Zustand global:** é demais para um CRUD; o TanStack Query cobre o estado de servidor.

## Consequências
- ✅ Cada domínio fica reunido em um módulo, fácil de achar e de remover inteiro.
- ✅ O TanStack Query cuida de cache, loading e revalidação sem estado manual.
- ⚠️ A regra "módulo não importa módulo" exige disciplina; reuso entre domínios vai para `shared/`.
- ⚠️ shadcn/ui é "copiar componentes", não um pacote versionado: atualizações são manuais.
