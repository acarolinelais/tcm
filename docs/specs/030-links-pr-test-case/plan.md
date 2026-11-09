# 030. Links de PR do Test Case e painel de detalhes em todas as tabelas: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0010, 0012, 0013, 0015, 0022, 0026, 0030, 0036, 0037
- **ADRs novos propostos:** nenhum

## Abordagem

- **Entidade nova `LinkPullRequest`** (tenant, ADR 0013), filha do `CasoTeste` (1:N), com `url` e `created_by`.
  A URL é normalizada e validada no domínio (`LinkPullRequest.normalizar_url`): strip, só `https`, host
  `github.sec.samsung.net` sem diferenciar caixa, sem usuário/senha na URL, sem espaços internos, até 2.000
  caracteres. O schema Pydantic chama a mesma função, então a API devolve 422 ProblemDetails (ADR 0006) antes de
  chegar ao service.
- **Remoção = exclusão lógica** (`inativar()`, ADRs 0004 e 0008): o link inativo some da listagem (a spec pede
  isso, então a listagem mostra só os ativos) e deixa de contar para a duplicidade. A duplicidade é garantida por
  um **índice único parcial** `(caso_teste_id, url) WHERE ativo`, além da checagem no service.
- **Sub-recurso do Test Case** em `/api/test-cases/{caso_id}/pull-requests`. Os três casos de uso entram no
  `CasoTesteServiceImpl`, que já tem a checagem de visibilidade do projeto (`_obter_projeto_visivel`) e a de
  gestão (`_pode_gerenciar`). Ver e adicionar exigem `test_cases.consultar` e o projeto no escopo, como o
  `obter` (spec 028). Remover exige `_pode_gerenciar`: admin da unidade, ou gerente/KP com `test_cases.gerenciar`
  no escopo do time. O dev (`USUARIO_PADRAO`) recebe 403. Nenhuma permissão nova no catálogo.
- **A listagem diz se o usuário pode remover** (`pode_remover`), calculado no backend com a mesma regra. Assim o
  frontend não replica a regra de escopo do gerente/KP, que também vale na tela de Resultados gerais (vários
  projetos).
- **Nome de quem adicionou:** o repositório lista os links com um join em `usuarios` e devolve uma query de
  domínio (`LinkPullRequestComAutor`, como `domain/queries/form_factor_linha.py`). Não dá para usar a lista de
  membros do time no frontend: um gerente pelo setor não é membro.
- **Frontend:** o `DetalhesCasoTesteDrawer` (HeroUI, sobre o `SideDrawer`) passa a receber só `{ id, tc_id }` e
  ganha a seção `PullRequestsCasoTeste`. Um botão-link compartilhado `TcIdBotao` substitui o texto do TC ID nas
  cinco tabelas da RN-09 e resolve o item de backlog da spec 028 (classe de link repetida).

## Modelo de dados

Tabela nova `links_pull_request`:

| Campo | Tipo | Regras |
|---|---|---|
| `id` | `UUID` | PK |
| `unidade_id` | `UUID` | FK `unidades.id`, not null (tenant, filtro do `RepositoryBaseImpl`) |
| `caso_teste_id` | `UUID` | FK `casos_teste.id`, not null |
| `url` | `VARCHAR(2000)` | not null; já normalizada pelo domínio |
| `created_by` | `UUID` | FK `usuarios.id`, not null |
| `ativo` | `BOOLEAN` | default `true` (remoção lógica) |
| `created_at` | `TIMESTAMP` | `server_default now()`; ordena a lista (desc) |
| `updated_at` | `TIMESTAMP` | `onupdate now()`; marca a remoção |

Índices: `ix_links_pull_request_unidade_caso (unidade_id, caso_teste_id)` e
`uq_links_pull_request_caso_url_ativo` único em `(caso_teste_id, url) WHERE ativo`. Constantes no domínio:
`URL_MAX_LENGTH = 2000` e `DOMINIO = "github.sec.samsung.net"`. Migration nova com `down_revision =
"c028a1b2c3d4"` (head atual), aplicada ao subir a API (ADR 0012). Os casos de teste existentes não mudam.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/test-cases/{caso_id}/pull-requests` | n/d | 200 `LinksPullRequestResponse` `{ itens: LinkPullRequestResponse[], pode_remover: bool }`, só ativos, `created_at` desc | 403 sem `test_cases.consultar`; 404 caso inexistente ou fora do escopo (CA-14) |
| POST | `/api/test-cases/{caso_id}/pull-requests` | `AdicionarLinkPullRequestRequest { url }` (`extra="forbid"`) | 201 `LinkPullRequestResponse` | 422 URL inválida, `http`, outro domínio ou acima de 2.000 (CA-07); 404 (CA-14); 409 já registrado (CA-08) |
| PATCH | `/api/test-cases/{caso_id}/pull-requests/{link_id}/inativar` | n/d | 204 | 403 sem gestão, inclusive dev (CA-10); 404 caso fora do escopo, link de outro caso ou já removido (CA-13, CA-14) |

`LinkPullRequestResponse`: `id`, `caso_teste_id`, `url`, `created_at`, `created_by`, `created_by_nome`. A
listagem não é paginada: é um sub-recurso pequeno, como `GET /api/times/{id}/membros` (`list[...]`). A ordem
desempata por `id` para ser estável.

O import da planilha (`POST /api/projetos/importar`) não muda: ele só cria casos num projeto novo e recusa TC ID
existente, então não alcança links (RN-08).

## Backend: arquivos

Novos (receita `python-crud`):
- `src/domain/entities/link_pull_request.py`: entidade, constantes e `normalizar_url`.
- `src/domain/queries/link_pull_request_com_autor.py`: dataclass com o link e o nome do autor.
- `src/domain/entities/interfaces/link_pull_request_repository.py`: `listar_ativos_por_caso`,
  `existe_ativo(caso_id, url)`, `obter_por_id`, `adicionar`, `atualizar`.
- `src/infrastructure/data/models/link_pull_request_model.py` e registro no `models/__init__.py`.
- `src/infrastructure/data/migrations/versions/d030a1b2c3d4_links_pull_request.py`.
- `src/infrastructure/repositories/link_pull_request_repository.py`.
- `src/application/schemas/link_pull_request.py`: request, responses e `to_response` (mapeamento manual,
  ADR 0007).

Alterados:
- `src/application/services/interfaces/caso_teste_service.py` e `caso_teste_service.py`:
  `listar_pull_requests`, `adicionar_pull_request`, `remover_pull_request`.
- `src/api/routers/test_cases.py`: as três rotas.
- `src/api/dependencies.py`: o repositório novo no `get_caso_teste_service`.

## Frontend: arquivos

Novos e alterados (receita `react-crud`, HeroUI pelo ADR 0037):
- `modules/projetos/model/projeto.ts`: tipos `LinkPullRequest` e `LinksPullRequest`, constantes e o schema zod
  `linkPullRequestSchema` (mesmas regras do backend, mensagens via i18n).
- `modules/projetos/api/projetos.api.ts`: `casosTesteApi.listarPullRequests`, `adicionarPullRequest` e
  `removerPullRequest`, com o ramo mock.
- `modules/projetos/hooks/useProjetos.ts`: `usePullRequestsCasoTeste`, `useAdicionarPullRequest` e
  `useRemoverPullRequest` (invalidam a lista do caso; sem retry em 4xx).
- `modules/projetos/components/casos-teste/PullRequestsCasoTeste.tsx` + `.test.tsx` (**novos**): formulário
  (react-hook-form + zod, `TextField`/`Input` + `Button` "Add" do HeroUI), lista do mais recente ao mais antigo
  com `<a target="_blank" rel="noopener noreferrer">`, data e hora via `Intl.DateTimeFormat` no idioma da conta,
  autor, botão de remover (ícone, `aria-label` com a URL) só se `pode_remover`, confirmação com o `AlertConfirm`
  destrutivo, estados vazio, carregando e erro com "tentar de novo". O 409 vira erro no campo; o restante, toast
  (`shared/lib/toast`).
- `modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer.tsx` + teste: `caso: { id; tc_id } | null`
  e a seção nova abaixo dos textos. A URL digitada é descartada ao fechar (o formulário remonta por caso).
- `modules/projetos/components/casos-teste/TcIdBotao.tsx` + teste (**novos**): botão com aparência de link e
  `aria-haspopup="dialog"`.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: usa o `TcIdBotao` e passa `onAbrirDetalhes` às tabelas de
  Form Factor.
- `modules/projetos/components/form-factor/FormFactorTabela.tsx`, `FormFactorResultadosTabela.tsx` e
  `FormFactorGlobalTabela.tsx` (as duas tabelas globais): prop `onAbrirDetalhes` na célula do TC ID.
- `modules/projetos/pages/ResultadosGeraisPage.tsx`: estado do caso aberto e o `DetalhesCasoTesteDrawer`.
- `core/i18n/resources.ts`: textos da seção, das validações, do vazio, da confirmação e dos toasts, em en, pt e ko.
- `core/mock/database.ts`: coleção de links com as mesmas regras (domínio, duplicidade entre ativos, remoção
  lógica, `pode_remover` falso para `USUARIO_PADRAO`).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade (front) | `PullRequestsCasoTeste.test.tsx`: lista vazia mostra "Nenhum PR registrado" e o campo |
| CA-02 | Unidade (service) | `test_caso_teste_service.py`: adicionar grava `created_by` = usuário atual e faz um `commit` |
| CA-02 | Funcional | `test_casos_teste_api.py`: POST válido como dev retorna 201 com `created_by_nome` |
| CA-02 | Unidade (front) | adicionar mostra o item no topo e o toast de sucesso |
| CA-03 | Integração | `test_link_pull_request_repository.py`: três links voltam em `created_at` desc, com o nome do autor |
| CA-04 | Unidade (front) | o link tem `href`, `target="_blank"` e `rel="noopener noreferrer"` |
| CA-05, CA-06 | Unidade (front) | schema zod e formulário: sem protocolo, `http`, `ftp`, `https://` vazio, branco, `github.com` e subdomínio recusados; `GitHub.sec.samsung.net` aceito |
| CA-06, CA-07 | Unidade (domínio) | `test_link_pull_request.py`: os mesmos casos em `normalizar_url`, 2.000 passa e 2.001 falha, strip nas pontas |
| CA-07 (falha) | Funcional | POST com URL inválida, de outro domínio ou com 2.001 caracteres retorna 422 e não chama o service |
| CA-08 (falha) | Unidade (service) + Funcional | URL ativa repetida (com espaços) retorna 409 e não grava |
| CA-08 (falha) | Integração | o índice parcial recusa dois ativos iguais e aceita a mesma URL em outro caso |
| CA-09 | Unidade (service) + Funcional | KP e gerente no escopo inativam link de outra pessoa: 204 |
| CA-09 | Unidade (front) | remover e confirmar tira o item e mostra o toast |
| CA-10 (falha) | Unidade (service) + Funcional | dev recebe 403 ao inativar, inclusive o próprio link; `pode_remover` falso na listagem |
| CA-10 (falha) | Unidade (front) | sem `pode_remover`, nenhum item tem botão de remover |
| CA-11 | Unidade (front) | cancelar a confirmação mantém o item |
| CA-12 | Unidade (service) + Integração | a mesma URL é aceita depois de inativada |
| CA-13 (falha) | Unidade (service) + Funcional | link já inativo ou de outro caso: 404; no front, toast de erro e a lista é recarregada |
| CA-14 (falha) | Unidade (service) + Funcional | caso inexistente ou de projeto fora do escopo: 404 nos três endpoints |
| CA-15 (falha) | Unidade (front) | erro na listagem mostra a mensagem e "tentar de novo", e os textos continuam |
| CA-16 | Integração | `test_link_pull_request_repository.py`: importar uma planilha (service com repositórios reais) não muda os links de um caso existente |
| CA-17 | Unidade (front) | `ProjetoDetalhePage.test.tsx` (Test Cases, Form Factor, Resultados) e `ResultadosGeraisPage.test.tsx` (as duas tabelas), nos perfis dev e gestão: clique e Enter no TC ID abrem o painel; ao fechar, filtros e página continuam |
| CA-18 | Unidade (front) | clicar no TC ID não abre edição inline nem o registro de resultado |
| CA-02, CA-09, CA-17 | E2E | `projetos.spec.ts` (API simulada com `page.route`): abrir o painel pela tabela de Form Factor, adicionar um link e removê-lo como gestão |

## Riscos e decisões pendentes

- **Corrida na duplicidade.** Dois POSTs iguais ao mesmo tempo passam pela checagem do service; o índice parcial
  recusa o segundo, que hoje sai como 500. Converter o `IntegrityError` no service traria o SQLAlchemy para a
  camada `application` (ADR 0003); nenhum outro único do projeto (ex.: TC ID) trata isso. Ficou no backlog um
  tratamento global (UnitOfWork ou handler).
- **Paridade da validação.** A regra existe no domínio (Python) e no zod (TS). Os dois testes usam a mesma lista
  de exemplos. O backend compara o endereço inteiro (`netloc`) com o domínio, então porta explícita é recusada;
  o `URL` do navegador descarta a porta padrão (`:443`), então o zod confere o texto bruto também. O backend é a
  autoridade, e o erro aparece no envio.
- **Clique no TC ID dentro da tabela do HeroUI (React Aria).** As linhas podem ter ação ou seleção; o botão
  precisa consumir o press (`onPress` do React Aria ou `stopPropagation`). O CA-18 é testado nas tabelas com
  edição inline e com registro de resultado.
- **Resultados gerais.** A tela junta casos de vários projetos; o painel usa os mesmos endpoints, que validam o
  escopo caso a caso. Se um caso sair do escopo depois que a tabela carregou, o painel mostra "não encontrado"
  (spec 028, CA-13).
- **Nomes de colunas em inglês.** `created_at` e `created_by` seguem o pedido e o `EntityBase`; o domínio
  continua em português (`LinkPullRequest`).
- **Cabeça das migrations.** O plano assume `c028a1b2c3d4` como cabeça única. Se outra branch criar uma
  migration antes do merge, a ordem é refeita ao integrar.
