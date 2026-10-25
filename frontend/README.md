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

## Modo de demonstração

O modo mock usa `VITE_USE_MOCK=true` no `.env` da raiz (Vite carrega esse arquivo por configuração) e permite
usar autenticação, usuários, perfis e permissões, setores/gerentes, times/membros e Overview sem backend ou
Postgres. Os dados iniciais e as alterações ficam em `localStorage` (`sdf.mock.database.v1`). Para começar
do zero, remova essa chave no armazenamento local do navegador. As credenciais de demonstração e o comando
de inicialização estão no README da raiz.
