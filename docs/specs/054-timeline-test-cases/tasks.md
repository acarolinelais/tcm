# 054. Timeline dos Test Cases: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> A Fase 3 não depende mais da 038: o item da lista é da 054 e usa o `ComparacaoAlteracao` da spec 052.

## Fase 1: Leitura no backend
- [x] **T01. Validação do período**
  - Arquivos: `backend/src/application/validators/semana.py`,
    `backend/tests/unit/application/validators/test_intervalo_periodo.py`
  - Cobre: CA-12
  - Detalhe: `intervalo_periodo(inicio, fim, fuso)` devolve `[inicio 00h, fim+1 00h)` em UTC sem fuso, como
    `intervalo_dia`. Recusa com `InvalidInputException` o fim antes do início e o período com mais de 31 dias.
  - Testes: semana válida no fuso de São Paulo; mês de 31 dias aceito; fim antes do início; 32 dias.
  - Verificação: `cd backend && uv run pytest tests/unit/application/test_intervalo_periodo.py` → verde
- [x] **T02. Consulta da timeline no repositório**
  - Arquivos: `backend/src/domain/queries/registro_auditoria.py`,
    `backend/src/domain/entities/interfaces/historico_caso_teste_repository.py`,
    `backend/src/infrastructure/repositories/historico_caso_teste_repository.py`,
    `backend/tests/integration/test_historico_caso_teste_repository.py`
  - Cobre: CA-08, CA-10
  - Detalhe: `RegistroTimeline` e `listar_por_projeto(unidade_id, projeto_id, inicio, fim)`, em SQL: registros
    de `casos_teste` e de `links_pull_request` (ligados ao caso pelo `caso_teste_id`) do projeto, no
    intervalo, com `tc_id`, `title`, `usuario_id` e `cor_avatar` da pessoa, do mais recente para o mais antigo.
    Comentário `shortcut:` sobre trazer o período inteiro.
  - Testes: mudança no período aparece e fora dele não; PR incluído entra no caso certo; outro projeto e outra
    unidade nunca aparecem; renomear a pessoa não muda `usuario_nome` nem `perfil_nome`.
  - Verificação: `cd backend && uv run pytest tests/integration/test_historico_caso_teste_repository.py` → verde
- [x] **T03. Agrupamento e filtros**
  - Arquivos: `backend/src/application/schemas/historico_caso_teste.py`,
    `backend/src/application/schemas/timeline.py` (novo), `backend/tests/unit/application/schemas/test_timeline_schema.py`
  - Cobre: CA-02, CA-03, CA-04
  - Detalhe: extrair `alteracoes_do_registro(registro, nomes)` de `to_historico_response`, sem mudar a resposta
    da 038. `to_timeline_response(registros, nomes, fuso, usuario_ids, caso_ids)` agrupa por caso, pessoa e dia
    no fuso, aplica os filtros só aos `cards`, devolve `pessoas` e `casos` sem filtro, trata o autor nulo como um
    card sem `usuario_id` fora de `pessoas` e descarta card sem mudança visível.
  - Testes: duas mudanças da mesma pessoa no mesmo caso e dia formam um card com 2 itens; dias diferentes no
    fuso formam dois cards (23h30 em São Paulo); filtro com duas pessoas; filtro com dois casos; os dois juntos;
    `pessoas` ignora o filtro; autor nulo; os testes da 038 continuam verdes.
  - Verificação: `cd backend && uv run pytest tests/unit/application -k "timeline or historico"` → verde
- [x] **T04. Service e rota**
  - Arquivos: `backend/src/application/services/interfaces/caso_teste_service.py`,
    `backend/src/application/services/caso_teste_service.py`, `backend/src/api/routers/projetos.py`,
    `backend/tests/unit/application/services/test_caso_teste_service.py`, `backend/tests/functional/test_timeline_api.py`
    (novo)
  - Cobre: CA-01, CA-09, CA-10, CA-12
  - Detalhe: `timeline(...)` exige `test_cases.consultar` e o projeto visível (`_obter_projeto_visivel`), valida o
    fuso e o período, lê os registros e os nomes de responsável e Backup (`dados_por_usuarios`). A rota
    `GET /api/projetos/{projeto_id}/timeline` aceita `usuario_ids` e `caso_teste_ids` como listas.
  - Testes: 200 com cards nos dias certos; filtro de pessoa pela query; 404 para dev fora do time e para projeto
    de outra unidade; 422 para fim antes do início e para 32 dias; 403 sem permissão.
  - Verificação: `cd backend && uv run pytest tests/unit tests/functional/test_timeline_api.py tests/architecture`
    → verde

## Fase 2: Período e dados no frontend
- [x] **T05. Funções de período**
  - Arquivos: `frontend/src/modules/timeline/model/timeline.ts`, `frontend/src/modules/timeline/utils/periodo.ts`
    e o teste
  - Cobre: CA-05, CA-06
  - Detalhe: `periodoDe(visao, data)`, `avancar(visao, data, ±1)`, `colunas(visao, periodo)` e
    `rotuloPeriodo(periodo, idioma)`. A semana vai de segunda a domingo; Semana → Mês usa o mês do primeiro dia.
  - Testes: semana que cruza o ano ("29 Dec - 4 Jan"); voltar e avançar semana, dia e mês; fevereiro bissexto;
    Semana → Mês; 24 colunas na visão Dia.
  - Verificação: `cd frontend && npx vitest run src/modules/timeline/utils` → verde
- [x] **T06. Cliente, modo mock e hook**
  - Arquivos: `frontend/src/modules/timeline/api/timeline.api.ts`, `timeline.mock.ts` e o teste,
    `frontend/src/modules/timeline/hooks/useTimeline.ts` e o teste, `frontend/src/modules/projetos/model/projeto.ts`
  - Cobre: CA-01, CA-03 (modo mock)
  - Detalhe: `timelineApi.obter(projetoId, inicio, fim, filtros)`, com as listas como parâmetros repetidos. No
    mock, cards de exemplo nos dias úteis com os filtros aplicados (como a Overview). `useTimeline` usa a chave
    com perfil, projeto, período e filtros e `placeholderData` da consulta anterior.
  - Testes: a query string leva as duas listas; o mock filtra e mantém as opções; o hook não consulta sem
    projeto e mantém a grade anterior.
  - Verificação: `cd frontend && npx vitest run src/modules/timeline` → verde

## Fase 3: Tela
- [x] **T07. Card, pilha de avatares e painel do card**
  - Arquivos: `frontend/src/modules/timeline/components/TimelineCard.tsx`, `PilhaAvatares.tsx`,
    `AlteracoesCardDrawer.tsx` e os testes, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-02, CA-07, CA-08
  - Detalhe: o card é um botão com a barra, `tc_id`, nome ou "Sistema", "N mudanças" e `AvatarUsuario`, e tem
    a variante compacta com `Tooltip`. A pilha mostra até 5 avatares com tooltip e "+N". O painel (`SideDrawer`)
    lista as mudanças com o item da 038 e tem o botão "Abrir Test Case", que abre o `DetalhesCasoTesteDrawer`.
    Textos nos três idiomas.
  - Testes: card com "2 mudanças" e nome acessível completo; 6 pessoas → 5 avatares e "+1"; o painel lista as
    duas mudanças e o botão abre o detalhe.
  - Verificação: `cd frontend && npx vitest run src/modules/timeline/components && npm run lint` → verde
- [x] **T08. Grade**
  - Arquivos: `frontend/src/modules/timeline/components/TimelineGrade.tsx` e o teste
  - Cobre: CA-01, CA-11, RN-09
  - Detalhe: cabeçalho com o mês e os dias (ou as horas), a linha de "agora" só dentro do período, as colunas
    empilhando os cards (por hora de `primeira_em` na visão Dia) e a mensagem "Nenhuma mudança neste período". Na
    visão Dia, a rolagem horizontal fica dentro da grade.
  - Testes: o card cai na coluna do seu dia; a linha de agora aparece na semana atual e some na anterior; grade
    vazia com a mensagem.
  - Verificação: `cd frontend && npx vitest run src/modules/timeline/components` → verde
- [x] **T09. Página e rota**
  - Arquivos: `frontend/src/modules/timeline/pages/TimelinePage.tsx` e o teste,
    `frontend/src/modules/timeline/routes.tsx`, `frontend/src/modules/timeline/index.ts`,
    `frontend/src/core/router.tsx`, `frontend/src/core/layout/EmBreve.tsx`, `frontend/src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-03, CA-04, CA-05, CA-06, CA-09, CA-11
  - Detalhe: `ProjetoSwitcher` com `buscavel` e `onEscolher` gravando `?projeto=` e limpando os filtros;
    `ToggleButtonGroup` Dia/Semana/Mês; setas e "Hoje"; os dois `MultiSelectCombobox` (o de caso busca por
    `tc_id` e `title`, e a escolha sem mudança no período continua marcada); estados de carregando, erro com
    nova tentativa e vazio com "Limpar filtros". Revisar com `better-writing` e `better-accessibility`.
  - Testes: abre no primeiro projeto e na semana atual; trocar de visão mantém os filtros; trocar de
    projeto limpa; voltar e "Hoje"; filtro de duas pessoas; "Limpar filtros" no vazio; o seletor só lista os
    projetos devolvidos pelo escopo.
  - Verificação: `cd frontend && npx vitest run src/modules/timeline src/core && npm run lint` → verde

## Fase 4: E2E e fechamento
- [x] **T10. E2E**
  - Arquivos: `frontend/e2e/timeline.spec.ts` (novo)
  - Cobre: CA-01, CA-02, CA-03, CA-05
  - Detalhe: com a API simulada por `page.route`: escolher o projeto, ver os cards da semana, filtrar duas
    pessoas, trocar para Mês, abrir um card e ver as mudanças. A página não rola para os lados
    (`scrollWidth <= clientWidth`).
  - Verificação: `cd frontend && npx playwright test e2e/timeline.spec.ts` → verde
- [x] **T11. Fechamento**
  - Arquivos: `docs/specs/054-timeline-test-cases/spec.md`, `docs/specs/README.md`
  - Detalhe: a spec fica `Concluída`, o roadmap é atualizado e a nota "A Timeline ainda não tem spec" sai do
    README. Rodar `code-review` sobre a spec inteira.
  - Verificação: `cd backend && uv run pytest` e `cd frontend && npm test && npm run lint && npm run e2e` → verde

## Backlog
- **Colunas repetidas nas duas consultas da auditoria** (`_LISTAR` e `_LISTAR_POR_PROJETO` em
  `historico_caso_teste_repository.py`). Só vale unificar se aparecer uma terceira consulta. Achado da
  `simplify` da Fase 1.
- **Duas idas ao banco por consulta da timeline:** o JOIN traz o nome atual do autor, e `dados_por_usuarios`
  traz os nomes de responsável e Backup. Se o volume crescer, os dois podem vir do mesmo SQL. Achado da
  `simplify` da Fase 1.
- **O fuso do navegador é lido em quatro lugares** (`Intl.DateTimeFormat().resolvedOptions().timeZone` em
  `timeline.api.ts`, `overview.api.ts` e duas vezes em `projetos.api.ts`, que já tem um `fusoHorario()`
  local). Um `fusoHorario()` em `shared/lib` resolveria. Achado da `simplify` da Fase 2.
- **Seleção de projeto por `?projeto=` copiada da General Results** (`TimelinePage.tsx` e
  `ResultadosGeraisPage.tsx`: carregar todas as páginas, fallback para o primeiro projeto, cabeçalho e estados
  de erro, carregando e sem projetos). São duas cópias; na terceira tela com o mesmo padrão, vale extrair um
  hook `useProjetoDaUrl` e o estado vazio em `modules/projetos`. Achado da `simplify` da Fase 3.
- **Testes de `PilhaAvatares` e `AlteracoesCardDrawer` dentro de `TimelineCard.test.tsx`.** Só organização:
  separar em arquivos próprios. Achado da `simplify` da Fase 3.
- **Cada troca de filtro consulta a API de novo.** A resposta traz o período inteiro, então daria para filtrar
  os cards no navegador e só consultar ao trocar de projeto ou de período. O plano manteve o filtro no servidor;
  vale rever se o volume crescer junto com o `shortcut:` do repositório. Achado da `code-review` da spec.
