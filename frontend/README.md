# frontend

App em **React + Vite + TypeScript + shadcn/ui + Tailwind**, em arquitetura Modular (ADR 0009).

As pastas em `src/` são as três áreas (imports: módulo → `shared`/`core`; `core`/`shared` não importam `modules`):

| Área | Papel |
|---|---|
| `core/` | app-wide: providers (router, QueryClient), cliente HTTP, layout, config, tratamento de ProblemDetails |
| `shared/` | sem domínio: ui (componentes shadcn), lib/utils, hooks genéricos, tipos base (`PagedResult<T>`) |
| `modules/<dominio>/` | um módulo por domínio, autossuficiente: `pages/`, `components/`, `api/`, `model/`, `hooks/`, `routes.tsx`, `index.ts` |

> Vazio por enquanto (`.gitkeep`). A base comum e o primeiro módulo entram pela spec `001-fundacao`.
> Para adicionar um módulo, use a skill `react-crud`.
