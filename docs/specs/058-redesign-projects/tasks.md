# 058. Redesign de Projects: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.
> O backend roda em `backend/` (`uv run pytest ...`); o frontend, em `frontend/`, com caminhos relativos a
> `frontend/src`. Referência visual: `shared/assets/figma/2549-2085.svg` (aba Test Cases) e `2550-3540.svg` (aba Form
> Factor), perfil dev, tema claro. Ícone novo em `shared/assets/figma/icons/history.svg`.

## Fase 1: backend, o dev consulta as execuções do caso

- [x] **T01. Aceitar o dev na consulta de execuções**
  - Arquivos: `backend/src/application/services/form_factor_service.py`,
    `backend/tests/unit/application/services/test_form_factor_historico.py`
  - O que muda: `resumo_execucoes` chama um guard novo, `_exigir_consulta_execucoes` (Admin, Gerente, KP e
    `USUARIO_PADRAO`, com `form_factor.consultar`). `historico_projeto` continua com `_exigir_consulta_resultados_gerais`.
    O teste de 403 deixa de misturar as duas consultas: o parâmetro `"DEV"` (que não é um código real) sai, e entram:
    o dev com permissão consulta as execuções de um caso do escopo (sucesso); o dev sem `form_factor.consultar` recebe
    403 (falha); o dev com caso de projeto fora do escopo recebe 404 (falha); o 403 do `historico_projeto` para o dev
    continua afirmado.
  - Feito: o teste do dev aceito e o do dev fora do escopo foram escritos antes e reprovaram (Forbidden), e passaram
    depois do guard novo. `uv run pytest tests/unit tests/functional`: 736 passam; ruff limpo. Os de integração (Docker)
    não rodaram, porque a task não toca em banco.
  - Cobre: CA-06, CA-07
  - Verificação: `cd backend && uv run pytest tests/unit/application/services/test_form_factor_historico.py
    tests/functional/test_form_factor_geral_api.py` → verde.

## Fase 2: Form Factor (ícone, painel e tabela)

- [x] **T02. Ícone de histórico e textos**
  - Arquivos: `shared/ui/figma-icons.tsx`, `core/i18n/resources.ts`, `core/i18n/resources.test.ts`
  - O que muda: `HistoryIcon` (9×9, `currentColor`, padrão dos outros ícones). Chaves `originSpreadsheet`
    ("Spreadsheet", "Planilha", "스프레드시트") e `viewExecutionHistory` ("View execution history", "Ver histórico de
    execuções", "실행 이력 보기") nos três idiomas, com o teste de presença.
  - Cobre: CA-04, CA-05
  - Verificação: `cd frontend && npm test -- resources` → verde; `npx tsc -b` limpo.
- [x] **T03. Painel de histórico do caso**
  - Arquivos: `modules/projetos/components/form-factor/HistoricoCasoPainel.tsx` (novo) e `.test.tsx` (novo),
    `modules/projetos/components/resultados-gerais/ResumoExecucoesDrawer.tsx`
  - O que muda: o drawer passa a pedir só `caso_teste_id`, `tc_id` e `responsavel_identificador`. O
    `HistoricoCasoPainel` junta o drawer e o `ResultadoExecucaoModal`, com o estado do resultado aberto, e recebe o caso
    escolhido e `onFechar`. O teste cobre: abre com a grade de modelos por datas; abrir um resultado mostra o detalhe;
    o erro da consulta mostra a mensagem e "Tentar de novo" (falha).
  - Cobre: CA-05, CA-08
  - Verificação: `cd frontend && npm test -- HistoricoCasoPainel ResumoExecucoesDrawer ResultadosGeraisPage` → verde.
- [x] **T04. Tabela de resultados: Origin, Actions e Assignee**
  - Arquivos: `modules/projetos/components/form-factor/FormFactorResultadosTabela.tsx` e `.test.tsx`
  - O que muda: a Origem mostra `originSpreadsheet` ou "Manual" na célula, no filtro (valor `SDF`) e na exportação;
    coluna Actions com o `HistoricoIcon` num `RowActions` (rótulo `viewExecutionHistory`), chamando
    `onAbrirHistorico`; prop `mostrarAssignee` (padrão `true`) que tira a coluna e o filtro quando falsa. Os testes de
    colunas e de exportação trocam "SDF" por "Spreadsheet" e ganham o caso sem Assignee.
  - Feito: o ícone usa o `RowActions` que já existe (círculo cinza de 19 px, como no frame). O `tsc` só fecha com a
    T05, que liga a prop `onAbrirHistorico` na página.
  - Cobre: CA-03, CA-04, CA-05
  - Verificação: `cd frontend && npm test -- FormFactorResultadosTabela` → verde (colunas, rótulos, exportação, filtro
    por `SDF`, vazio com e sem filtro, ícone chama `onAbrirHistorico`).

## Fase 3: a página e o visual

- [x] **T05. Cabeçalho e ligação do histórico na página**
  - Arquivos: `modules/projetos/components/ProjetoSwitcher.tsx` e `.test.tsx`,
    `modules/projetos/pages/ProjetoDetalhePage.tsx` e `.test.tsx`
  - O que muda: o seletor ganha `azul` (padrão `true`); com `azul={false}` continua `h1`, em `text-body`. A página usa
    o seletor sem azul, guarda o caso do histórico, mostra o `HistoricoCasoPainel` e passa `mostrarAssignee` só fora do
    perfil dev. Os botões "Create test round" e "Import SDF report" não mudam. O teste cobre: o dev abre o histórico de
    uma linha; o dev não vê o Assignee nem os dois botões; a gerência vê os botões e o Assignee (falha do acesso
    indevido: o dev não os vê).
  - Feito: o seletor ganhou `azul` (o `h1` do projeto fica na cor do texto, com o menu também). A página só guarda o
    caso do histórico; o painel e o detalhe do resultado ficam no `HistoricoCasoPainel`. Dev e gestão testados.
  - Cobre: CA-01, CA-06, CA-09
  - Verificação: `cd frontend && npm test -- ProjetoSwitcher ProjetoDetalhePage page-card` → verde (a varredura de `<h1`
    continua com um título por tela).
- [x] **T06. Conferência visual das abas contra os frames**
  - Arquivos: só os que a conferência apontar, entre `shared/ui/page-tabs.tsx`, `shared/ui/data-table.tsx`,
    `modules/projetos/components/casos-teste/*`, `modules/projetos/components/form-factor/ResultadoFormFactor.tsx`
  - O que muda: renderiza as duas abas (perfil dev, claro) e compara com os frames 2549-2085 e 2550-3540: aba ativa
    azul e sublinhada, etiquetas de Status e TC Situation, etiquetas Pass e Fail, ícone de histórico ao lado dos
    outros. **Primeiro lista as diferenças** (no próprio `tasks.md`) e só muda o que o frame pede. Mudança em componente
    compartilhado precisa passar nos testes das outras telas.
  - Feito: conferência das duas abas (perfil dev, claro), com a API simulada, contra os frames 2549-2085 e 2550-3540.
    **Diferenças encontradas, todas mantidas de propósito (nenhuma mexe em componente compartilhado):**
    - A aba Test Cases tem a coluna Automation Level (spec 027), que o frame não desenha. A spec manda manter as colunas.
    - A aba Form Factor tem o seletor Results/Summary e a frase de apoio acima das abas. O frame não os desenha; a spec
      manda manter as duas visões.
    - A página tem o link "‹ Projects" no topo, que o frame de Test Cases não mostra (o de Form Factor mostra
      "Projects > Form Factor"). Fica como está (dúvida da spec: não criar migalhas).
    **Já batiam com o frame:** aba ativa azul e sublinhada, filtro Week em pílula, linhas numeradas, etiquetas de
    Status e TC Situation, Pass e Fail em verde e vermelho, rodapé sem total, ícone de histórico no círculo cinza.
  - Cobre: CA-01, CA-02, CA-03
  - Verificação: `cd frontend && npm test -- data-table page-tabs Projeto Usuarios Setores` → verde; screenshot das duas
    abas, claro e escuro, conferido com os frames.

## Fase 4: e2e e fechamento

- [x] **T07. e2e visual de Projects**
  - Arquivos: `e2e/projetos-visual.spec.ts` (novo), `e2e/projetos-dev.spec.ts` e `e2e/form-factor.spec.ts` (só o que
    citar "SDF" como rótulo)
  - O que muda: com a API simulada, abre as duas abas nos três idiomas sem texto cortado (helper `semTextoCortado`, e
    um teste de sobreposição como o do card da Timeline para a coluna Actions); foco visível nas abas, na tabela e no
    ícone de histórico; o painel abre e fecha por teclado e o foco volta ao ícone; a Origem mostra "Spreadsheet".
  - Feito: `e2e/projetos-visual.spec.ts` (5 testes, API simulada), com os helpers de `visual-helpers.ts`. Os e2e
    existentes que citam "SDF" falam do SDF ID (`SDF-OLD`...), não do rótulo da Origem, então não mudaram. A tabela do
    React Aria é uma grade: um `focus()` por script num botão da célula volta para a linha, então o teste foca a célula
    e usa o Tab, como o teste unitário de teclado que já existia. A tabela também recria as linhas quando os membros do
    time chegam, por isso o teste espera a rede acalmar antes de focar.
  - Cobre: CA-10, CA-11
  - Verificação: `cd frontend && npm run e2e -- projetos-visual` → verde (só com API simulada).
- [x] **T08. Verificação final e fechamento**
  - Arquivos: este `tasks.md`, `docs/specs/README.md`
  - O que muda: roda `uv run pytest` no backend e `npx tsc -b`, `npm run lint`, `npm test` e `npm run build` no
    frontend; confere que o tema escuro não mudou; mapeia cada CA ao teste que o cobre; muda o status da spec para
    `Concluída` e atualiza o roadmap.
  - Feito: backend `ruff` limpo e `uv run pytest tests/unit tests/functional`: 736 passam (os de integração, com Docker,
    não rodaram: nenhuma mudança toca em banco). Frontend: `tsc`, lint e `build` limpos. Suíte completa instável sob
    carga (só `ProjetoDetalhePage` e, numa rodada, `TimelinePage` e `UsuariosTable` estouraram o tempo); os três passam
    isolados (67 testes). E2E simulados: 5 de Projects passam, e os da Timeline, do Board e da identidade passam
    isolados. `code-review`: 7 achados, nenhum procedente para este escopo (ver Backlog).
  - CA → teste: CA-01 `ProjetoDetalhePage.test`; CA-02 `ProjetoDetalhePage.test` e conferência visual; CA-03
    `FormFactorResultadosTabela.test` e `ProjetoDetalhePage.test`; CA-04 `FormFactorResultadosTabela.test` e
    `projetos-visual.spec`; CA-05 `HistoricoCasoPainel.test`, `FormFactorResultadosTabela.test` e `ProjetoDetalhePage.test`;
    CA-06 `test_form_factor_historico.py` e `ProjetoDetalhePage.test`; CA-07 `test_form_factor_historico.py` e
    `ProjetoDetalhePage.test`; CA-08 `HistoricoCasoPainel.test`; CA-09 `ProjetoDetalhePage.test`; CA-10 e CA-11
    `projetos-visual.spec`; CA-12 `contraste-tema-escuro.test`, `cores-por-token` (nenhum CSS mudou).
  - Cobre: CA-12
  - Verificação: `npm test -- contraste-tema-escuro cores-por-token` → verde; os comandos acima sem erro.

## Backlog
- O guard `_exigir_consulta_execucoes` e o `_exigir_consulta_resultados_gerais` diferem só no conjunto de perfis e na
  mensagem. A spec 059 abre o histórico da General Results ao dev, e então um guard só resolve (achado do `code-review`).
- A `ResultadosGeraisPage` repete o par drawer + modal que o `HistoricoCasoPainel` agora encapsula; pode usar o painel
  (achado da `simplify` da Fase 2).
- A visão Summary do Form Factor ainda mostra o Assignee para o dev, e a de Results não. Está declarado na spec (o
  Summary só ganha o visual novo); se o dev não deve ver o Assignee ali, é decisão de spec.
- Um `focus()` por script num botão dentro da célula da tabela volta o foco para a linha (comportamento da grade do
  React Aria). Os testes contornam focando a célula e usando o Tab. Vale uma nota nas regras de tabela
  (`docs/tables-rules.md`) para quem escrever o próximo teste de teclado.
