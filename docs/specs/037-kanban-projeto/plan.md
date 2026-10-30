# 037. Kanban do projeto e Board por setor e time: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0021, 0026, 0030, 0036, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

Não há mudança de domínio nem de banco: os Status, o ciclo e a exclusão com justificativa já existem
(specs 023 e 026). O backend ganha duas consultas, só de leitura:
- **Kanban do projeto:** devolve os casos agrupados por Status, já com o total de cada coluna. Cada card
  traz os Status para os quais a pessoa pode movê-lo (`destinos`), calculados com a mesma regra que o
  `PUT /api/test-cases/{id}` aplica. Assim a regra de permissão fica num lugar só.
- **Navegação do Board:** devolve a árvore setor → time → projeto dentro do escopo da pessoa.

Mover um card reaproveita o `PUT /api/test-cases/{id}` com `{ status }`, ou com
`{ status: "Cancelled", justificativa_exclusao }` para `Excluded`. Esse endpoint já aceita o envio parcial
da gestão, do responsável principal e do backup (só exclusão), e recusa os demais com 403.

No frontend:
- a tela do projeto ganha a aba `kanban`, e a aba ativa passa a ficar na URL (`?aba=kanban`). (Revisto em
  2026-10-30: a aba saiu; ver "Ajuste: aba Kanban sai da tela do projeto");
- a rota `/board` troca o `EmBreve` pela escolha em cascata;
- o arrasto usa `useDrag` e `useDrop` do `react-aria`, que já é dependência direta (ADR 0037) e oferece
  arrastar e soltar acessível por teclado, então nenhuma biblioteca nova entra;
- a mudança é otimista, com rollback se o servidor recusar;
- soltar em `Excluded` reaproveita o `ExcluirCasoTesteDialog`;
- a tela é nova, então usa só HeroUI.

## Modelo de dados

Sem alteração. O Kanban lê `CasoTeste.status` (`To-Do`, `InProgress`, `InReview`, `InValidation`, `Done`,
`InFixes`, `Cancelled`). A ordem das colunas (RN-02) é uma constante do service, não a ordem do enum:
`InFixes` vem antes de `Done`.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{id}/kanban` | — | 200 `KanbanResponse` | 401, 403 (sem `test_cases.consultar`), 404 (projeto inexistente, inativo ou fora do escopo) |
| GET | `/api/projetos/navegacao` | — | 200 `NavegacaoBoardResponse` | 401 |
| PUT | `/api/test-cases/{id}` (existente) | `{ "status": "InValidation" }` ou `{ "status": "Cancelled", "justificativa_exclusao": "…" }` | 200 caso | 403, 404, 422 (sem justificativa, Status inválido) |

```jsonc
// KanbanResponse: sempre 7 colunas, na ordem da RN-02, inclusive as vazias
{ "projeto_id": "…", "total": 1000,
  "colunas": [ { "status": "To-Do", "total": 312,
    "casos": [ { "id": "…", "tc_id": "Clock_001", "category": "A", "difficulty": "Low",
                 "situation": "New", "responsavel_id": "…", "responsavel_nome": "Afonso Fagundes",
                 "destinos": ["InProgress", "InReview", "InValidation", "InFixes", "Done", "Cancelled"] } ] } ] }

// NavegacaoBoardResponse: só setores e times ativos do escopo; projetos ativos (não excluídos)
{ "setores": [ { "id": "…", "nome": "SVP",
    "times": [ { "id": "…", "nome": "SDF Automation",
      "projetos": [ { "id": "…", "nome": "Clock 9.5", "status": "InProgress" } ] } ] } ] }
```

- **`destinos`:**
  - gestão no escopo (`_pode_gerenciar`) e o responsável principal recebem todos os outros Status;
  - o backup recebe `["Cancelled"]` quando o caso ainda não está em `Cancelled`;
  - os demais recebem `[]`.

  Se a aba Test Cases mudar essa regra, o service muda nos dois lugares, porque é a mesma função.
- **Escopo da navegação:** reaproveita o escopo de `ProjetoService.listar`. O admin vê toda a unidade; o
  gerente, os times de `times_gerenciados`, que já incluem os times em que participa (ADR 0036); KP e dev,
  os times de `time_ids`. Os setores são os desses times.
- **Ordem da navegação:** setores e times por nome. Projetos primeiro com status `Created`, `To Do` ou
  `InProgress`, depois `Completed` e `Canceled`, e por nome dentro de cada grupo (RN-16).
- **Kanban sem paginação:** um projeto tem no máximo alguns milhares de casos (RN-10), e o card leva 8
  campos. São cerca de 150 KB para 1.000 casos.
- **Leitura do dev:** o Kanban não usa `associados_a_mim` (RN-04). `CasoTesteService.listar` já permite
  isso no escopo.

## Backend: arquivos

- `infrastructure/repositories/caso_teste_repository.py` (+ interface em `domain/`):
  `listar_cards_por_projeto`. Faz um `SELECT` dos casos do projeto com o nome do responsável num join,
  sem paginação e ordenado por `tc_id`.
- `infrastructure/repositories/projeto_repository.py` (+ interface): `listar_navegacao(unidade_id, time_ids | None)`,
  com o join projeto → time → setor e só os ativos.
- `application/schemas/kanban.py` (novo): `KanbanResponse`, `KanbanColunaResponse`, `KanbanCardResponse`,
  com mapeamento manual (ADR 0007).
- `application/schemas/navegacao_board.py` (novo): `NavegacaoBoardResponse` e os itens aninhados.
- `application/services/caso_teste_service.py`: `obter_kanban(usuario_atual, projeto_id)` e o cálculo de
  `destinos`, que reaproveita `_obter_projeto_visivel` e `_pode_gerenciar`. Interface em `services/interfaces/`.
- `application/services/projeto_service.py`: `listar_navegacao(usuario_atual)`. Quem não tem times recebe
  uma árvore vazia, sem 403 (CA-19).
- `api/routers/projetos.py`: `GET /navegacao`, declarado **antes** de `/{projeto_id}`, e
  `GET /{projeto_id}/kanban`.
- Testes:
  - `tests/unit/application/services/test_caso_teste_service.py` (kanban e `destinos`)
  - `tests/unit/application/services/test_projeto_service.py` (navegação)
  - `tests/integration/test_caso_teste_repository.py`, `tests/integration/test_projeto_repository.py`
  - `tests/functional/test_projetos_api.py`

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`: os tipos `KanbanProjeto`, `KanbanCard` e `NavegacaoBoard`, e a
  constante `ORDEM_KANBAN`.
- `modules/projetos/api/projetos.api.ts`: `obterKanban` e `obterNavegacao`, e as versões mock em
  `core/mock/database.ts` com o mesmo escopo e o mesmo cálculo de `destinos` (ADR 0030).
- `modules/projetos/hooks/useKanban.ts`: a query `["projetos", id, "kanban", unidade, usuario]` e a
  mutation `moverCaso`. A mutation faz atualização otimista (move o card e ajusta os totais), faz rollback
  e mostra um toast no erro, e invalida `kanban` e `test-cases` quando dá certo.
- `modules/projetos/hooks/useNavegacaoBoard.ts`.
- `modules/projetos/components/kanban/KanbanBoard.tsx`, `KanbanColuna.tsx`, `KanbanCard.tsx` e
  `MoverParaMenu.tsx`, em HeroUI:
  - o card reaproveita `StatusBadge` e os estilos de `components/status`;
  - as colunas usam `useDrop` e aceitam só cards que têm a coluna em `destinos`;
  - cada coluna mostra os primeiros 50 cards e um botão "Mostrar mais (N)", pra a tela não travar (RN-10);
  - estados de carregando, erro com "Tentar de novo" e projeto vazio (RN-09).
- `modules/projetos/pages/ProjetoDetalhePage.tsx`:
  - `Aba` ganha `"kanban"`, entre `cases` e `form-factor` no `PageTabs`;
  - a aba vem de `useSearchParams` (`?aba=`), e um valor inválido cai no padrão de hoje;
  - o WeekPicker e as ações da aba Test Cases não aparecem no Kanban;
  - o `ExcluirCasoTesteDialog` é reaproveitado para soltar em `Excluded`.
- `modules/projetos/pages/BoardPage.tsx` (novo) e `routes.tsx`: a rota `board` com três selects HeroUI em
  cascata.
  - A seleção fica na URL (`?setor=&time=`).
  - Quando há uma única opção, ela é escolhida automaticamente.
  - Escolher um projeto navega para `/board/{id}` (`BoardKanbanPage`), uma tela só com o nome do projeto e o
    `KanbanBoard`, sem as abas da tela do projeto (ajuste de 2026-10-30).
  - Tem estados próprios para "sem times" e "time sem projetos".
- `core/router.tsx`: remove o `EmBreve` de `board`, que passa a ser registrado pelo módulo.
- `core/i18n/resources.ts`: aba, "Mover para", "Mostrar mais", estados e erros, em en, pt e ko.
- Testes:
  - Vitest: `KanbanBoard.test.tsx` (colunas, totais, "Mover para", `destinos`, rollback, exclusão
    cancelada), `BoardPage.test.tsx` (cascata, autosseleção, limpeza, vazio), `ProjetoDetalhePage.test.tsx`
    (aba pela URL) e `database.test.ts` (mock).
  - Playwright: `e2e/projetos-kanban.spec.ts` (arrasto real com a API real, dev, backup, link fora do
    escopo, 1.000 casos).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional + Vitest | `test_kanban_agrupa_por_status_com_totais` (7 colunas, inclusive vazias, na ordem); `KanbanBoard` renderiza a ordem |
| CA-02 | Funcional + e2e | `test_kanban_dev_ve_todos_os_casos`; o e2e confere Kanban completo e Test Cases filtrado |
| CA-03 | e2e + Vitest | Arrasto `In Review` → `In Validation` com a API real; totais atualizados |
| CA-04 | Unidade | `destinos` do responsável principal; `PUT` existente já coberto |
| CA-05, CA-06 | Vitest + e2e | Soltar em `Excluded` abre o diálogo; confirmar grava; cancelar volta o card sem mutation |
| CA-07 | Unidade + Vitest | `destinos == ["Cancelled"]` para o backup; o menu do backup só tem `Excluded` |
| CA-08 | Vitest | "Mover para" via `userEvent.keyboard` chama a mutation com o Status escolhido |
| CA-09 | Unidade + Vitest | `destinos == []`; o card não é arrastável e não tem menu |
| CA-10 | Vitest | A mutation rejeitada volta o card e mostra o toast |
| CA-11, CA-12 | Vitest | Projeto vazio com 7 colunas e aviso; erro com "Tentar de novo" sem o aviso de vazio |
| CA-13 | Funcional + e2e | `test_kanban_1000_casos_totais`; o e2e abre o projeto com a seed de 1.000 |
| CA-14 | Vitest + e2e | `?aba=kanban` redireciona para `/board/{id}` (revisto em 2026-10-30) |
| CA-15 | Unidade + funcional + Vitest | `test_navegacao_gerente_dois_setores` (inclui time em que participa); cascata em `BoardPage.test.tsx` |
| CA-16, CA-17, CA-18 | Vitest + e2e | Busca nos cards, entrada direta em `/board/{id}`, último projeto aberto |
| CA-19 | Funcional + Vitest | `test_navegacao_sem_times_retorna_vazio`; o aviso "sem times" |
| CA-20 | Funcional + e2e | `test_kanban_fora_do_escopo_retorna_404` (outro setor, outra unidade, inexistente); o e2e entra pelo link antigo `?aba=kanban` |
| CA-28 | Vitest | A tela do projeto lista só as abas Test Cases e Form Factor |
| CA-29 | Vitest | Dev sem casos com `?aba=kanban` é redirecionado ao Board; sem `aba`, vai para a entrada de Projects |

## Ajuste: arrasto, cor do avatar e filtros (2026-10-30)

- **Cor do avatar (RN-03, CA-23):** `listar_cards_por_projeto` passa a trazer `UsuarioModel.cor_avatar` no
  mesmo join; o card ganha `responsavel_cor_avatar` (`CorAvatar`, spec 036). O mock usa `corAvatarPorUsuario`.
  O `KanbanCard` mostra `AvatarUsuario` ao lado do nome.
- **Arrasto (RN-11a, CA-21, CA-22):** continua o `useDrag`/`useDrop` do `react-aria` (ADR 0037).
  - Prévia: o `preview` do `useDrag` com o `DragPreview` do `react-aria` desenha o card opaco, com sombra e
    leve rotação, no lugar da imagem translúcida do navegador.
  - Origem: o card arrastado fica como um contorno tracejado na coluna de origem.
  - Rolagem: o contêiner das colunas rola sozinho quando o ponteiro fica a menos de 80 px da borda durante o
    arrasto (`dragover` no contêiner + `requestAnimationFrame`).
- **Filtros (RN-11b a RN-11d, CA-24 a CA-27):** no cliente, sobre o Kanban já carregado (todos os casos vêm na
  mesma resposta), sem mudança na API. Componente `KanbanFiltros` acima das colunas, com os
  `MultiSelectCombobox` de `shared/ui` e um campo de busca por TC ID. Os valores ficam na URL
  (`?responsavel=&status=&category=&difficulty=&situation=&tc=`). O `KanbanBoard` serve à aba do projeto e à
  tela do Board, então os dois ganham os filtros.

## Ajuste: entrada do Board (2026-10-30)

- A cascata de selects sai. `BoardPage` decide pela árvore da navegação:
  - dev, ou um time só no total: `<Navigate>` para `/board/{id}`, com o último projeto aberto (guardado em
    `localStorage` por pessoa, em `utils/ultimo-projeto-board.ts`, com `try/catch`) ou o primeiro ativo;
  - os demais: cards por time, agrupados por setor, com `SearchField` do HeroUI filtrando no cliente.
- `GET /api/projetos/navegacao` ganha `membros` por time: uma subconsulta conta os membros ativos na mesma query.
- `BoardKanbanPage` grava o projeto aberto como o último. `ROTULO_STATUS_PROJETO` vai para `model/projeto.ts`
  e é usado pela lista de Projects e pelos cards.

## Ajuste: aba Kanban sai da tela do projeto (2026-10-30)

Spec: RN-01, RN-04a, RN-11, RN-12, CA-14, CA-20, CA-28 e CA-29. O Board já abre o mesmo `KanbanBoard` em
`/board/{id}`, então a aba repetia a tela. Só o frontend muda: a API do Kanban continua a mesma e é usada
pelo `BoardKanbanPage`.

- `modules/projetos/pages/ProjetoDetalhePage.tsx`:
  - `Aba` volta a ser `"cases" | "form-factor"`; saem a entrada `kanban` de `ROTULO_ABA` e de
    `abasDisponiveis`, o `PageTabPanel` do Kanban e o import do `KanbanBoard`;
  - link antigo: com `?aba=kanban`, a página devolve
    `<Navigate replace to={`/board/${projetoId}?${resto}`} />`, sendo `resto` os demais parâmetros da URL
    (os filtros da RN-11d continuam valendo). O redirecionamento vem antes da regra do dev da spec 012, para
    o dev sem casos que abre um link antigo chegar ao Kanban (RN-04a). Fora do escopo, quem responde é o
    `BoardKanbanPage`, que já mostra "projeto não encontrado" (RN-17);
  - a regra do dev volta à forma da spec 012, sem a exceção `aba !== "kanban"`, e sai o comentário sobre ela;
  - o WeekPicker e as `actions` do `PageTabs` perdem as condições `aba !== "kanban"` / `aba === "kanban"`;
  - o `ExcluirCasoTesteDialog` da página fica: ele serve à aba Test Cases. O Kanban tem o dele no
    `KanbanBoard`.
- `core/i18n/resources.ts`: sai a chave `kanbanTab` (en, pt e ko). Nenhum outro uso.
- Testes:
  - `ProjetoDetalhePage.test.tsx`: o teste "abre direto na aba Kanban pelo link" vira "link antigo
    `?aba=kanban` redireciona para `/board/project-1`, mantendo os filtros"; o teste do dev sem casos passa a
    conferir o redirecionamento com `?aba=kanban` e a entrada de Projects sem `aba`; um teste novo confere que
    as abas são só Test Cases e Form Factor (CA-28). O teste "aba desconhecida cai em Test Cases" fica.
  - `core/api/http-client.test.ts`: troca o caminho de exemplo `/projetos/7f3a?aba=kanban` por
    `/board/7f3a?status=InReview`. O teste é da spec 038 e só usa a URL como exemplo de query removida do `X-Tela`.
  - `e2e/projetos-kanban.spec.ts`: os `page.goto("/projetos/{id}?aba=kanban")` passam a `"/board/{id}"`. O
    teste de projeto fora do escopo continua entrando pelo link antigo, que cobre o redirecionamento ponta a
    ponta. O teste "a aba Test Cases reflete" passa a abrir `/projetos/{id}` depois do arrasto, em vez de
    clicar na aba.

### Riscos do ajuste
- **Último projeto do Board:** abrir um link antigo grava aquele projeto como o último aberto pelo Board,
  como qualquer abertura do `BoardKanbanPage`. É o comportamento esperado de quem chega ao Kanban.
- **Links salvos com outras abas:** `?aba=cases` e `?aba=form-factor` não mudam; só `kanban` redireciona.

## Riscos e decisões pendentes

- **Regras de Status suspensas:** as RN-04 e RN-05 da spec 023 estão suspensas desde 2026-10-27, e o
  responsável principal edita o Status livremente. Os `destinos` seguem essa regra atual. Se o ciclo voltar
  a ser imposto, a mudança é no mesmo ponto do service e o Kanban acompanha.
- **Concorrência:** se duas pessoas movem o mesmo caso, vale a última escrita, como já acontece na aba Test
  Cases. Atualização em tempo real está fora do escopo.
- **Rotas:** `/api/projetos/navegacao` conflita com `/{projeto_id}` se for declarada depois dela. Um teste
  funcional cobre esse caso.
- **Volume:** um projeto bem acima de 1.000 casos deixa a resposta do Kanban sem paginação pesada. Se isso
  acontecer, paginar por coluna vira uma spec nova.
- **Arrasto no jsdom:** o `useDrag` e o `useDrop` não são testáveis de forma confiável no Vitest. Os testes de
  componente usam "Mover para", e o arrasto real fica no e2e.
