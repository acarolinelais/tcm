---
name: react-crud
description: Receita para criar ou alterar uma feature CRUD no frontend React deste repositório (arquitetura Modular com core, shared e modules, HeroUI v3 + Tailwind com migração gradual do shadcn/ui, TanStack Query, react-hook-form + zod, Vitest e Playwright). Use sempre que for criar ou alterar telas, componentes, clientes HTTP, hooks de dados, rotas ou testes no frontend.
---

# Skill: react-crud

Regras completas no ADR 0009 (Modular), no ADR 0037 (HeroUI como base de UI), no ADR 0008 (contrato REST)
e no ADR 0010 (testes). Os exemplos usam `usuario`. Para outra entidade, troque o nome.

> **Migração para HeroUI (ADR 0037):** tela nova ou redesenhada usa só HeroUI v3 (`@heroui/react`). Os
> primitivos vêm direto de `@heroui/react`; tabela, diálogo de confirmação e toast vêm das composições de
> `shared/ui`. Os exemplos abaixo que citam componentes shadcn valem só para telas ainda não migradas. Não
> adicione componentes shadcn novos e não misture as duas bibliotecas na mesma página.

> A base comum (`core/` com providers, cliente HTTP, layout e tratamento de ProblemDetails; `shared/` com
> `PagedResult<T>`, os componentes shadcn e os helpers de erro) já existe (spec 001). Aqui só se adiciona um módulo.

## Regra de ouro da arquitetura Modular
Um módulo importa de `shared/` e `core/` e da **própria** pasta. **Um módulo não importa outro módulo** direto;
o reuso entre domínios sobe para `shared/`. `core/` e `shared/` não importam de `modules/`. Todo módulo expõe
só pelo seu `index.ts`. `npm run lint` falha se a regra for violada.

## Estrutura do módulo
```
modules/usuarios/
├── pages/UsuariosPage.tsx     # página roteável
├── components/                # blocos de apresentação (UsuariosTable, UsuarioForm, UsuarioToggleAtivo)
├── api/usuario.api.ts         # cliente HTTP do domínio
├── model/usuario.ts           # tipos do domínio + schema zod
├── hooks/useUsuarios.ts       # TanStack Query (listar/criar/atualizar/ativar/inativar)
├── routes.tsx                 # rotas do módulo
└── index.ts                   # API pública (exporta routes e o que outros módulos/ a app precisam)
```

## Ordem dos passos

### 1. `model/usuario.ts`: tipos + schema zod
```ts
// espelha os schemas do backend (ADR 0007)
export interface Usuario { id: string; nome: string; email: string; ativo: boolean; createdAt: string; }

// o schema zod espelha a validação do backend (obrigatório, e-mail, tamanho máximo)
export const usuarioFormSchema = z.object({
  nome: z.string().min(1, 'O nome é obrigatório.').max(150, 'O nome deve ter no máximo 150 caracteres.'),
  email: z.string().min(1, 'O e-mail é obrigatório.').email('E-mail inválido.').max(254),
});
export type UsuarioFormValues = z.infer<typeof usuarioFormSchema>;
```

### 2. `api/usuario.api.ts`: um método por endpoint do ADR 0008
```ts
const url = '/api/usuarios';
export const usuarioApi = {
  listar: (page: number, pageSize: number) =>
    httpGet<PagedResult<Usuario>>(url, { params: { page, page_size: pageSize } }),
  obter: (id: string) => httpGet<Usuario>(`${url}/${id}`),
  criar: (body: UsuarioFormValues) => httpPost<Usuario>(url, body),
  atualizar: (id: string, body: UsuarioFormValues) => httpPut<Usuario>(`${url}/${id}`, body),
  ativar: (id: string) => httpPatch<void>(`${url}/${id}/ativar`),
  inativar: (id: string) => httpPatch<void>(`${url}/${id}/inativar`),
};
```
`httpGet/Post/...` vêm do cliente HTTP de `core/` (ou `shared/api`), que já trata o ProblemDetails (ADR 0006).

### 3. `hooks/useUsuarios.ts`: TanStack Query
- `useUsuariosList(page, pageSize)` com `useQuery` (chave `['usuarios', page, pageSize]`), `keepPreviousData`
  para a paginação no servidor não "piscar".
- `useCriarUsuario`, `useAtualizarUsuario`, `useAtivarUsuario`, `useInativarUsuario` com `useMutation`, cada um
  invalidando `['usuarios']` no `onSuccess`.
- Os hooks encapsulam o `usuarioApi`; os componentes **não** chamam o `api` direto.

### 4. `components/`: blocos de apresentação (shadcn/ui)
- **`UsuarioForm`**: cria **e** edita. Recebe `usuario?: Usuario` e `onSalvo: (u: Usuario) => void`.
  - `useForm<UsuarioFormValues>({ resolver: zodResolver(usuarioFormSchema) })` + os componentes `Form`/`FormField`
    do shadcn, com mensagens em português.
  - No submit, chama a mutation (`useCriarUsuario`/`useAtualizarUsuario`). O botão salvar fica desabilitado
    enquanto `isPending`.
  - Erro 422/409 do servidor: o helper de ProblemDetails de `shared` mapeia `errors` por campo para
    `form.setError(campo, ...)`; o que não casar com um campo vira um toast (`sonner`).
- **`UsuariosTable`**: tabela shadcn com **paginação no servidor** — recebe `page`, `pageSize`, `total` e
  callbacks de troca de página; consome `useUsuariosList`. Colunas: nome, e-mail, status (`Badge`) e ações
  (editar + `UsuarioToggleAtivo`). Emite `onEditar(usuario)`; a página decide abrir o modal.
- **`UsuarioToggleAtivo`**: botão Ativar/Inativar único; usa `AlertDialog` do shadcn para confirmar ao inativar;
  chama `useAtivarUsuario`/`useInativarUsuario`.

### 5. `pages/UsuariosPage.tsx` + `routes.tsx` + registro
- `UsuariosPage` compõe `UsuariosTable` + um `Dialog` (shadcn) com o `UsuarioForm` (criar ou editar),
  controla o estado de página (`page`/`pageSize`) e, após salvar, fecha o modal e mostra um toast de sucesso.
- `routes.tsx` exporta a rota do módulo (`/usuarios` → `UsuariosPage`, lazy com `React.lazy`).
- `index.ts` reexporta as rotas. O roteador em `core/` agrega os `routes` de cada módulo; adicione o item no menu do layout.

### 6. Testes: **sucesso e falha** (ADR 0010)
| Onde | Mínimo |
|---|---|
| `api/usuario.api.test.ts` (Vitest, fetch mockado) | Cada método chama a URL e o verbo certos, com os params certos. |
| `components/UsuarioForm.test.tsx` (Vitest + Testing Library) | **Sucesso:** form válido chama a mutation e dispara `onSalvo`. **Falha:** form vazio não chama a API e mostra erros; um 422 do servidor exibe o erro no campo. |
| `components/UsuariosTable.test.tsx` | Trocar de página dispara a busca com `page`/`pageSize` novos. |
| `e2e/usuarios.spec.ts` (Playwright) | **Sucesso:** cadastrar usuário e vê-lo na tabela. **Falha:** submeter vazio mostra erros e não cria. Opcional: inativar e ver o status mudar. |

## Regras gerais
- Componentes funcionais, tipados; nada de `any`. Os tipos vêm de `model/`.
- UI com HeroUI v3 + Tailwind em telas novas ou redesenhadas; shadcn/ui só nas telas ainda não migradas (ADR 0037). Textos de interface em português (skill `better-writing`) e acessibilidade
  básica: labels, foco e botões com texto (skill `better-accessibility`).
- Dados de servidor só via hooks TanStack Query; nunca `fetch` solto no componente.
- Botão só nos dois tamanhos do HeroUI (ADR 0052): padrão no cabeçalho, nas barras, nas pílulas de filtro e nos rodapés; `size="sm"` dentro de tabela, de estado vazio e nos botões só de ícone. Altura e tamanho de texto do botão não vão no `className`. O botão de adicionar é a última ação à direita (cabeçalho, ou fim da linha das abas quando a ação é de uma aba), e o filtro de data fica na linha de ferramentas, antes das ações (ADR 0053).
- Cores só por token com valor no claro e no escuro (ADRs 0040 e 0041): os do HeroUI (`bg-surface`, `text-muted`,
  `border-separator`, `bg-accent-soft`...) ou os do projeto em `core/global.css` (`text-body`, `bg-page`, `bg-panel`...).
  Nada de hex (`text-[#454442]`), paleta crua do Tailwind (`bg-white`, `text-slate-700`) nem `rgb()`. Ao portar do
  Figma, mapeie cada hex para um token ou crie um com nome de papel nos dois temas. O teste
  `core/theme/cores-por-token.test.ts` barra o que escapar.

## Checklist de pronto
- [ ] `modules/<x>/` com `model`, `api`, `hooks`, `components`, `pages`, `routes.tsx` e `index.ts`
- [ ] `UsuarioForm` (criar/editar), `UsuariosTable` (paginação no servidor) e `UsuarioToggleAtivo`
- [ ] Rota do módulo registrada no roteador de `core/` e item no menu do layout
- [ ] Nenhum import de outro módulo; reuso entre domínios em `shared/`
- [ ] Nenhuma cor fixa; a tela conferida também no tema escuro
- [ ] `npm run lint` verde (regras de boundaries `core`/`shared`/`modules`)
- [ ] `npm test` verde, com sucesso e falha
- [ ] `npm run e2e` verde, com sucesso e falha
