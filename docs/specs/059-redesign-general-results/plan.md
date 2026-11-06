# 059. Redesign da General Results: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0009, 0010, 0013, 0015, 0021, 0026, 0030, 0034, 0036, 0037, 0039, 0041, 0045
- **ADRs novos:** [0046](../../adr/0046-resultados-gerais-com-cinco-datas.md) (no máximo 5 datas, substitui só o
  limite de 7 do 0039; aceito em 2026-11-04)

## Abordagem

A API da General Results já devolve, por caso, os resultados de **todos** os devices em cada data
(`resultados[dia][modelo_id]`). O accordion é só de tela: a linha recolhida mostra o primeiro modelo do projeto
e a expandida mostra todos, empilhados dentro das mesmas células. Não há sub-linha na `DataTable`.

O backend muda pouco:
- o dev passa a consultar o histórico do projeto;
- o limite de datas cai para 5 (ADR 0046);
- a busca livre sai e entram dois filtros de coluna: Assignee e SDF ID;
- cada caso passa a trazer o SDF ID da última execução de cada device, em qualquer data.

O `modelo_padrao_id` e o `modelo_destacado_id` saem, porque a linha agora sempre começa no primeiro device do
projeto (RN-10).

Os botões **Import SDF Report** e **Create test round** saem da `ProjetoDetalhePage` e vão para um componente
próprio, que a General Results usa. A lógica não muda: as mesmas mutações, as mesmas mensagens e o mesmo
`FormFactorCriarRodadaDialog`. As regras de quem pode criar e importar já estão no backend
(`_exigir_gestao_rodadas` e `ImportacaoSdfService.importar` checam o perfil, a permissão e o escopo do time).
Essas regras não mudam, só ganham testes para o dev.

As abas voltam (`PageTabs`) com `projeto.app` como rótulo. O `ProjetoSwitcher` sai da General Results, mas a
busca dele (`buscavel`, spec 053) continua no código, porque a tela do projeto e o Board usam o switcher.

## Modelo de dados

Sem mudança. Nenhuma migration.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/form-factor/general/projetos/{projeto_id}/historico` | Query: `tc_id`, **`responsavel`** (novo, texto, máx. 100), **`sdf_id`** (novo, texto, máx. 100), `modelo_dispositivo_id`, `dia` ou `semana`, `fuso_horario`, `page`, `page_size`. **Sai** `busca`. | 200 `HistoricoProjetoResponse` | 403 sem perfil ou sem `form_factor.consultar`; 404 projeto fora do escopo, inativo ou de outra unidade; 422 dia e semana juntos |

`HistoricoProjetoResponse` muda assim:
- `datas`: no máximo 5 (eram 7).
- Cada item ganha `ultimo_sdf_por_modelo: dict[modelo_id, str | None]`, o SDF ID da execução mais recente de cada
  device do caso, em qualquer data. Um device sem execução fica fora do dicionário.
- Saem `modelo_padrao_id` (do item) e `modelo_destacado_id` (da resposta).

Regras dos filtros novos, que valem para casos e para datas, como os de hoje:
- `responsavel`: `ilike` no `user_id` do tester (o texto da coluna Assignee).
- `sdf_id`: o caso entra se **qualquer** execução válida dele, em qualquer device, tem um SDF ID que contém o
  texto (RN-13, CA-17). Usa o `existe(...)` que já existe.

Perfis: o endpoint passa a aceitar `USUARIO_PADRAO` com `form_factor.consultar`, a mesma regra de
`_exigir_consulta_execucoes` (spec 058). O escopo continua no `_obter_projeto_ativo_no_escopo`, que já limita o dev
aos times de que é membro e o KP ao próprio time.

Os endpoints de criar rodada (`POST /api/projetos/{projeto_id}/form-factor/rodadas`) e importar SDF
(`POST /api/projetos/{projeto_id}/relatorios-sdf`) não mudam.

## Backend: arquivos

- `application/services/form_factor_service.py`
  - `historico_projeto`: troca `busca` por `responsavel` e `sdf_id`; passa `limite=LIMITE_DATAS_RESULTADOS_GERAIS`
    (5) para `listar_datas`; tira o cálculo de `destacados` e de `modelo_padrao`; chama
    `listar_ultimo_sdf_por_modelo`.
  - `_exigir_consulta_resultados_gerais` sai: o `historico_projeto` usa `_exigir_consulta_execucoes`, que já
    aceita o dev.
- `application/services/interfaces/form_factor_service.py`: a assinatura nova do `historico_projeto`.
- `domain/queries/historico_form_factor.py`: `FiltrosCasoHistorico` troca `busca` por `responsavel` e `sdf_id`.
- `domain/entities/interfaces/historico_form_factor_repository.py` e
  `infrastructure/repositories/historico_form_factor_repository.py`:
  - `_filtros_casos`: tira o bloco de `busca` e põe `responsavel` (`UsuarioModel.user_id.ilike`) e `sdf_id`
    (`existe(ExecucaoSdfModel.sdf_id.ilike(...))`).
  - `listar_modelos_da_ultima_execucao` vira `listar_ultimo_sdf_por_modelo`: o mesmo `dense_rank`, agora particionado
    por caso **e** modelo, devolvendo `{caso_id: {modelo_id: sdf_id}}`. O único uso atual era o `modelo_padrao`.
- `application/schemas/form_factor_historico.py` e o mapper `to_historico_response`: `ultimo_sdf_por_modelo` entra;
  `modelo_padrao_id` e `modelo_destacado_id` saem.
- `api/routers/form_factor_geral.py`: query `responsavel` e `sdf_id` no lugar de `busca`.
- Testes:
  - `tests/unit/application/services/test_form_factor_historico.py`: dev consulta; 5 datas; sem `modelo_padrao`.
  - `tests/integration/test_historico_form_factor_repository.py`: filtros `responsavel` e `sdf_id`, e o
    último SDF por modelo.
  - `tests/functional/test_form_factor_geral_api.py`: dev 200 no projeto do time e 404 fora dele; KP 404 em
    outro time; dev 403 ao criar rodada e ao importar.

## Frontend: arquivos

- `core/layout/Sidebar.tsx` e o teste: a General Results aparece também para `USUARIO_PADRAO` com
  `form_factor.consultar`.
- `core/layout/sidebar-icons.tsx`: `GeneralResultsIcon` com o desenho novo (tabela com lupa), em `currentColor`.
  **Falta o SVG do ícone novo** (veja os riscos).
- O ícone de histórico já existe: `HistoryIcon` em `shared/ui/figma-icons.tsx` (spec 058), com o mesmo desenho do
  `figma/history-icon.svg` e em `currentColor`. A chave `viewExecutionHistory` também já existe.
- `modules/projetos/components/form-factor/AcoesGerenciaFormFactor.tsx` (novo) e o teste: os botões Import SDF Report
  e Create test round, o `input` de arquivo escondido, a mutação de importação e o `FormFactorCriarRodadaDialog`,
  movidos da `ProjetoDetalhePage` sem mudar a lógica. Recebe `projetoId` e `perfil`, e decide sozinho o que mostrar
  (`perfilGestao` e permissão, como hoje). A importação também invalida `["form-factor", "historico", projetoId]`,
  para a tabela da General Results atualizar (CA-09).
- `modules/projetos/pages/ProjetoDetalhePage.tsx` e o teste: saem os dois botões, a mutação, o `input` e o diálogo.
  A aba Form Factor passa a depender só de `podeConsultarFormFactor`, porque `podeImportarSdf` não abre mais a aba.
  O "Record result" fica.
- `modules/projetos/pages/ResultadosGeraisPage.tsx` e o teste:
  - `permitido` inclui `USUARIO_PADRAO`;
  - o título volta a ser "General Results" com a descrição;
  - `PageTabs` com uma aba por projeto (`label: projeto.app`, `id: projeto.id`), com o `?projeto=` e a limpeza de
    filtros da 053;
  - `actions` das abas com `AcoesGerenciaFormFactor` e o `WeekPickerHero`;
  - sai a busca (`SearchField`, `rascunhoBusca`, `buscaAberta`) e sai o estado `escolhas`;
  - entra `expandidos: Set<string>`, limpo ao trocar de página, de projeto ou de filtro (RN-12).
- `modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` e o teste:
  - colunas na ordem da RN-09;
  - **TC ID** ganha o botão de seta (`aria-expanded`, `aria-label` "Expand/Collapse {tc}");
  - **Assignee**, **Form Factor** e **SDF ID** com `DataTableFilter`: Assignee e SDF ID por texto, Form Factor por
    lista, como hoje;
  - cada célula de Form Factor, SDF ID e data renderiza uma pilha com o primeiro modelo (recolhida) ou todos os
    modelos do projeto (expandida), na mesma altura de linha, para as pilhas ficarem alinhadas;
  - **Actions** com um `RowActions` só, com o `HistoryIcon`, que abre o `ResumoExecucoesDrawer` de hoje (o mesmo
    painel da aba Form Factor, spec 058);
  - a exportação continua com uma linha por caso, no primeiro device, o que a linha recolhida mostra.
- `modules/projetos/model/projeto.ts`, `api/projetos.api.ts` e os testes: `FiltrosHistoricoProjeto` troca `busca` por
  `responsavel` e `sdfId`; `CasoHistorico` troca `modelo_padrao_id` por `ultimo_sdf_por_modelo`; sai
  `modelo_destacado_id`.
- `core/mock/database.ts` e o teste (ADR 0030): o mock do histórico segue o contrato novo (filtros, 5 datas,
  `ultimo_sdf_por_modelo`) e aceita o dev.
- `shared/ui/estado-vazio` sem mudança; a página usa os textos novos.
- `core/i18n/resources.ts` (en, pt-BR, ko):
  - `noProjectsToShow`: "No projects to show";
  - `noProjectsToShowHint`: "Projects from your teams appear here once they are created.";
  - `expandRow` e `collapseRow`: "Expand {{tc}}" e "Collapse {{tc}}";
  - `sdfId` e `assignee`, se ainda não existirem.

  Saem as chaves que ficarem sem uso (`generalResultsSearch` e outras), conferidas no fim do bloco.
- `e2e/resultados-gerais.spec.ts`: abas por `app`, expandir e recolher pelo teclado, histórico, botões só para a
  gerência e a tela do dev.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Vitest + funcional | Sidebar com o link para o dev; página com uma aba por projeto do time; API 200 para o dev no projeto do time |
| CA-02 | Funcional + Vitest | API 404 para o dev em projeto de outro time; `?projeto=` fora da lista abre o primeiro |
| CA-03 | Funcional | KP recebe 404 no histórico de projeto de outro time |
| CA-04 | Funcional | Admin consulta projetos de setores diferentes da unidade |
| CA-05 | Vitest | Gerente e KP com as permissões veem os dois botões |
| CA-06 | Vitest | Dev com `form_factor.registrar` não vê nenhum dos dois |
| CA-07 | Funcional | Dev recebe 403 em `POST .../form-factor/rodadas` e `POST .../relatorios-sdf`, e nada é gravado |
| CA-08 | Vitest + e2e | Criar rodada pela General Results chama a API e mostra "Test round created" |
| CA-09 | Vitest + e2e | Importar invalida o histórico, e a tabela consulta de novo |
| CA-10 | Vitest | Erro da importação aparece no toast com a mensagem da API |
| CA-11 | Vitest | A aba Form Factor sem os dois botões, com o "Record result" para quem lança |
| CA-12 | Vitest | Projeto `app: "Clock"`, `nome: "Clock 2.0"`: a aba diz "Clock" |
| CA-13 | e2e | 15 projetos: Tab até a última aba, e ela fica dentro da área visível |
| CA-14 | Vitest | Recolhida: 1 device e o SDF da última execução; expandida: os 4, cada um com o seu SDF e resultados |
| CA-15 | Unidade + integração | `listar_datas` com 8 datas devolve as 5 mais recentes |
| CA-16 | Vitest | Enter e Espaço na seta recolhem a linha; as outras não mudam |
| CA-17 | Integração + Vitest | Filtro `sdf_id` casa com o terceiro device; a página manda `sdf_id` na consulta |
| CA-18 | Vitest | O ícone de histórico abre o `ResumoExecucoesDrawer` do caso |
| CA-19 | Funcional | `GET /casos/{id}/execucoes` de um caso fora do escopo dá 404 (o teste de hoje, com o dev) |
| CA-20 | Vitest | Sem projetos: "No projects to show", sem abas e sem botões |

## Riscos e decisões pendentes

- **Ícone da navegação.** Só o ícone de histórico veio exportado. Preciso do SVG do ícone novo da General Results
  (tabela com lupa), salvo em `figma/`. Sem ele, a task do ícone fica parada e o resto segue.
- **Muitas abas.** O `PageTabs` rola na horizontal, e o anel de foco já é desenhado por dentro da aba. O e2e do
  CA-13 confere que a aba focada entra na área visível. Se o `react-aria` não rolar sozinho, a task chama
  `scrollIntoView({ inline: "nearest" })` no foco. É o problema que a spec 053 resolveu com o seletor e que
  volta com as abas.
- **A busca sai.** Quem buscava um caso pelo ID do tester ou pelo SDF ID passa a usar os filtros de coluna.
  A busca por device some, e o filtro Form Factor cobre esse caso.
- **Exportação.** Uma linha por caso, no primeiro device, como a linha recolhida. Se a exportação tiver que trazer
  todos os devices, ela vira uma linha por caso e device, numa task à parte.
- **Contrato quebrado de propósito.** A remoção de `busca`, `modelo_padrao_id` e `modelo_destacado_id` quebra
  quem os usa. Só a General Results e o mock usam, então o bloco muda tudo junto.
