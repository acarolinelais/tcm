# 032. Resultados Gerais por projeto, com histórico de execuções por data: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0010, 0013, 0015, 0022, 0030, 0034, 0036, 0037
- **ADRs novos (aceito em 2026-10-28):** [0038](../../adr/0038-resultados-gerais-sem-paginacao.md) (Resultados Gerais sem
  paginação de Test Cases, exceção aos ADRs 0022 e 0034)

## Abordagem

- **Backend:** dois endpoints de consulta novos no router de Resultados Gerais, ambos montados a partir de
  `ExecucaoSdf` + `ResultadoFormFactor` (sem tabela nova):
  1. o **histórico do projeto**, que devolve todos os casos do projeto (ADR 0038), as até 7 datas da janela e, para
     cada caso, os resultados de **todos** os modelos nessas datas. Assim, trocar o modelo de uma linha não faz
     nova chamada ao servidor;
  2. o **resumo de um caso**, com todas as datas e todos os modelos do caso.
  As abas usam a listagem de projetos que já existe (`GET /api/projetos`, a mesma do seletor de projetos), que já
  aplica o escopo.
- **Datas por dia no fuso de quem consulta:** `data_reportada` é agrupada por `date(timezone(:fuso, data_reportada))`,
  com o parâmetro `fuso_horario`, como já faz o filtro de semana dos Test Cases. Sem filtro de período, a janela são
  as 7 datas distintas mais recentes do projeto (respeitando a busca e os filtros); com `dia` ou `semana`, as datas
  desse período (no máximo 7).
- **Uma execução por célula (RN-07):** para o mesmo caso, modelo e dia, vence a execução mais recente
  (`data_reportada`, depois `created_at`). O resumo devolve todas.
- **Escopo:** o histórico usa `_obter_projeto_no_escopo` (que segue o ADR 0036 com `time_no_escopo`) e a mesma
  exigência de perfil e permissão da tela de hoje (`_time_ids_form_factor_global`: Admin, Gerente ou KP com
  `form_factor.consultar`). O resumo obtém o caso e confere o projeto do caso pelo mesmo caminho. Projeto fora do
  escopo → 404, como nos outros endpoints por projeto.
- **Busca (RN-10):** um texto só, que casa por `ilike` com o `user_id` do responsável, com algum `sdf_id` das
  execuções do caso no projeto ou com o nome de algum modelo do projeto. Se o texto casar com o nome de um modelo, a
  resposta traz `modelo_destacado_id`, e o frontend usa esse modelo nas linhas. O filtro de cabeçalho por modelo
  (`modelo_dispositivo_id`) faz o mesmo de forma exata.
- **Frontend:** a `ResultadosGeraisPage` é reescrita:
  - abas com `PageTabs` (HeroUI), uma por projeto, com o nome do projeto;
  - a barra com a lupa (botão que abre um `SearchField`, como o `DataTableFilter`) e o `WeekPickerHero`, que ganha
    o modo **dia ou semana** por prop (`permitirDia`), sem mudar as telas que já o usam;
  - a tabela em `DataTable`, sem paginação (ADR 0038), com TC ID e Form Factor fixos (`sticky left`), uma coluna por
    data com a dica "SDF Result" (`Tooltip` do HeroUI sobre um botão focável no cabeçalho) e a coluna Actions;
  - o Form Factor da linha é um `InlineSelect` com o rótulo "Form Factor {TC ID}", e a escolha fica num
    `Map<casoId, modeloId>` da página, zerado ao trocar de aba ou ao chegar uma resposta com outros casos;
  - o resultado é o chip de hoje (`ResultadoFormFactor`) dentro de um botão; ele abre o `ResultadoExecucaoModal`
    (HeroUI `Modal`, com TC ID, device e data no título, SDF ID e origem no corpo e só o botão Fechar);
  - o Resumo de execuções é o `ResumoExecucoesDrawer` (`SideDrawer`), com o ID do tester no topo e uma grade de
    datas × devices em ordem cronológica, cujos resultados abrem o mesmo modal.
- **Limpeza:** saem os endpoints `GET /api/form-factor/general` e `/general/results`, os métodos do repositório e do
  service que só eles usam, os schemas `FormFactorGlobal*`, o `FormFactorGlobalTabela.tsx`, os hooks
  `useFormFactorGlobal`/`useFormFactorResultadosGlobais`, os métodos do `formFactorApi` e do mock, e o parâmetro
  `aplicavel` de `colunasPorModelo` (só a tela global usava o N/A).

## Modelo de dados

Nenhuma tabela nova nem migration. Índice: as consultas filtram `execucoes_sdf` por `(unidade_id, caso_teste_id)`
e `data_reportada`; se o plano de execução pedir, entra um índice `(unidade_id, caso_teste_id, data_reportada)` numa
migration desta spec (decidido na fase 1, com o `EXPLAIN` do teste de integração).

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/form-factor/general/projetos/{projeto_id}/historico` | query: `busca?` (≤100), `tc_id?` (≤100), `modelo_dispositivo_id?`, `dia?` (`AAAA-MM-DD`) **ou** `semana?` (`AAAA-Www`), `fuso_horario` (padrão `UTC`) | 200 `HistoricoProjetoResponse` | 403 sem perfil/permissão; 404 projeto inexistente, inativo ou fora do escopo; 422 `dia` e `semana` juntos, formato inválido ou fuso desconhecido |
| GET | `/api/form-factor/general/casos/{caso_teste_id}/execucoes` | query: `fuso_horario` | 200 `ResumoExecucoesResponse` | 403; 404 caso inexistente ou de projeto fora do escopo |
| GET | `/api/projetos` | sem mudança (abas) | 200 | sem mudança |
| GET | `/api/form-factor/general` e `/general/results` | **removidos** na fase 5 | | |

```text
HistoricoProjetoResponse
  modelos: [{ id, nome }]                       # do projeto, em ordem alfabética
  datas: [AAAA-MM-DD]                           # ≤ 7, da mais recente para a mais antiga
  modelo_destacado_id: UUID | null              # busca casou com um modelo, ou filtro por modelo
  casos: [{
    caso_teste_id, tc_id, responsavel_id, responsavel_identificador,   # user_id do tester (spec 012)
    modelo_padrao_id,                            # modelo da execução mais recente; sem execução, o 1º em ordem alfabética
    resultados: { "AAAA-MM-DD": { "<modelo_id>": { execucao_id, resultado, sdf_id | null, origem } } }
  }]

ResumoExecucoesResponse
  caso_teste_id, tc_id, responsavel_identificador
  modelos: [{ id, nome }]
  datas: [AAAA-MM-DD]                           # todas as do caso, em ordem cronológica
  resultados: { "AAAA-MM-DD": { "<modelo_id>": [{ execucao_id, resultado, sdf_id | null, origem, data_reportada }] } }
```

**Por que esse formato:** o histórico vem pivotado por data e modelo para a troca de modelo da linha ser só estado
de tela (pedido da spec), e as datas vêm prontas porque dependem da busca e do período, que só o servidor resolve.
Um endpoint por projeto mantém cada resposta limitada a um projeto e a 7 datas (ADR 0038).

## Backend: arquivos

> **Execução (2026-10-29):** as consultas do histórico ficaram num repositório só de leitura,
> `HistoricoFormFactorRepository` (interface em `domain/entities/interfaces`, implementação em
> `infrastructure/repositories/historico_form_factor_repository.py`), em vez de métodos novos no
> `ResultadoFormFactorRepository` e no de casos: a regra de "execução válida do projeto" fica num lugar só. Os
> modelos do projeto vêm do `ProjetoModeloRepository.listar_modelos_do_projeto` (ordem alfabética): os vínculos são
> gravados na mesma transação e não guardam uma ordem de associação.
>
> **Code-review (2026-10-29):** o `modelo_padrao_id` de cada caso já considera a busca e o filtro por device: a
> linha abre no device encontrado quando o caso tem resultado nele nas datas da tabela, e o frontend usa só o
> `modelo_padrao_id` (o `modelo_destacado_id` fica na resposta como informação). O filtro e o período casam com a
> mesma execução, e com o filtro de Form Factor as datas são as desse modelo. Desempate na mesma data: a importação
> mais recente, como no Form Factor do projeto.

Receita `python-crud`:
- `src/domain/queries/historico_form_factor.py` (novo): `LinhaHistoricoExecucao` (caso, dia, modelo, resultado,
  execução, SDF ID, origem, data_reportada) e `CasoHistorico` (caso, TC ID, responsável e `user_id`).
- `src/domain/entities/interfaces/resultado_form_factor_repository.py` e
  `src/infrastructure/repositories/resultado_form_factor_repository.py`: `listar_datas_historico(projeto, filtros,
  fuso, limite=7)`, `listar_historico(projeto, datas, fuso)` e `listar_execucoes_do_caso(caso, fuso)`.
- `src/domain/entities/interfaces/caso_teste_repository.py` e `caso_teste_repository.py`:
  `listar_para_historico(projeto, busca, tc_id, modelo_id)`, com o `user_id` do responsável e os filtros de busca.
- `src/application/schemas/form_factor_historico.py` (novo): requests, responses e o mapeamento manual (ADR 0007).
- `src/application/services/interfaces/form_factor_service.py` e `form_factor_service.py`: `historico_projeto` e
  `resumo_execucoes`; a montagem do pivô e a escolha do `modelo_padrao_id` ficam aqui.
- `src/application/validators/semana.py`: intervalo de um **dia** no fuso, ao lado do de semana.
- `src/api/routers/form_factor_geral.py`: as duas rotas novas (e, na fase 5, sem as antigas).

## Frontend: arquivos

Receitas `react-crud` e `table-rules`, HeroUI pelo ADR 0037:
- `modules/projetos/model/projeto.ts`: tipos `HistoricoProjeto`, `CasoHistorico`, `ResultadoNaData`, `ResumoExecucoes`.
- `modules/projetos/api/projetos.api.ts`: `formFactorApi.historicoProjeto` e `resumoExecucoes`, com o ramo mock.
- `modules/projetos/hooks/useProjetos.ts`: `useHistoricoProjeto(projetoId, filtros)` e `useResumoExecucoes(casoId)`.
- `shared/ui/week-picker-hero.tsx` + teste: prop `permitirDia`; o valor passa a ser `AAAA-Www` ou `AAAA-MM-DD`.
- `modules/projetos/pages/ResultadosGeraisPage.tsx` + teste: abas, barra, filtros e estado do modelo por linha.
- `modules/projetos/components/resultados-gerais/` (novos): `HistoricoProjetoTabela.tsx`, `ResultadoExecucaoModal.tsx`,
  `ResumoExecucoesDrawer.tsx` e testes.
- `core/mock/database.ts` + teste: as duas consultas no modo mock (ADR 0030).
- `core/i18n/resources.ts`: "SDF Result", origens, rótulos do modal e do resumo, em en, pt e ko.
- Fase 5: apagar `FormFactorGlobalTabela.tsx` e testes, os hooks e métodos globais e o `aplicavel` de
  `colunasPorModelo`.
- e2e: `e2e/resultados-gerais.spec.ts` (novo, com a API simulada por `page.route`).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade (front) + E2E | `ResultadosGeraisPage.test.tsx`: uma aba por projeto com o nome, todos os casos sem paginação |
| CA-02 (falha) | Unidade (service) + Funcional + Integração | projeto fora do escopo → 404; a busca nunca traz caso de outro projeto; gerente pelo setor e como membro (ADR 0036) |
| CA-03 | Integração + Unidade (front) | 10 datas no banco: a resposta traz as 7 mais recentes em ordem decrescente; a tabela não tem controle de datas anteriores |
| CA-04 | Integração | execução com data nova vira a primeira data da resposta |
| CA-05 | Unidade (service) + Unidade (front) | `modelo_padrao_id` = modelo da execução mais recente; sem execução, o primeiro do projeto; a linha abre nele |
| CA-06 | Unidade (front) | S26 na linha 1 e S27 na linha 2 mantêm as duas escolhas, sem nova chamada à API |
| CA-07 (falha) | Unidade (front) | modelo sem execução na data → marcador vazio com rótulo acessível |
| CA-08 | Integração + Unidade (front) | manual e importada no mesmo dia: o histórico traz a mais recente; o resumo traz as duas e a célula mostra as duas |
| CA-09 | Unidade (front) | o chip é botão com nome acessível; abre o modal com SDF ID, origem e só Fechar; manual sem SDF ID → marcador vazio |
| CA-10 | Integração + Unidade (front) | busca por `user_id`, por SDF ID e por nome de modelo; `modelo_destacado_id` aplicado às linhas |
| CA-10a | Funcional + Unidade (front) | filtro de TC ID e de modelo no cabeçalho, com o modelo aplicado às linhas |
| CA-11 (falha) | Unidade (front) | busca sem correspondência → estado "nenhum resultado" com limpar |
| CA-12 | Integração + Unidade (front) | `dia` e `semana`: só os casos e as datas do período; `dia` + `semana` juntos → 422; limpar volta às 7 mais recentes |
| CA-13 | Funcional + Unidade (front) | o resumo traz todos os devices e todas as datas em ordem cronológica; o resultado abre o modal |
| CA-14 (falha) | Unidade (front) | erro na consulta → estado de erro com tentar de novo |
| CA-15 | Unidade (front) | o título da data é focável e mostra "SDF Result" com o foco |
| Fluxo | E2E | trocar de aba, trocar o modelo de uma linha, abrir o modal e o resumo, filtrar por semana |

## Riscos e decisões pendentes

- **ADR 0038** aceito em 2026-10-28: a tabela sem paginação é a exceção registrada aos ADRs 0022 e 0034.
- **Volume sem paginação:** um projeto com milhares de casos gera uma resposta grande. A janela de 7 datas limita o
  tamanho por caso; se a renderização pesar, o caminho é virtualizar as linhas (decisão nova), registrado no ADR.
- **Colunas fixas na rolagem:** o `Table` do HeroUI não tem coluna fixa pronta. TC ID e Form Factor usam
  `position: sticky` com fundo branco; o teste visual fica no e2e (largura estreita com rolagem).
- **Fuso:** as datas dependem do fuso de quem consulta (`fuso_horario`, como os Test Cases). Duas pessoas em fusos
  diferentes podem ver uma execução perto da meia-noite em dias diferentes; é o mesmo comportamento das outras telas.
- **Escopo do gerente:** a tela antiga usava só `times_gerenciados` para o gerente; o histórico segue o ADR 0036
  (`time_no_escopo`, que inclui os times em que ele participa). O gerente pode passar a ver projetos de times de
  que participa fora dos seus setores, como já vê na página do projeto.
- **Busca por nome de modelo:** se o texto casar com mais de um modelo, `modelo_destacado_id` fica com o primeiro na
  ordem do projeto; os casos de todos os modelos que casaram aparecem.
