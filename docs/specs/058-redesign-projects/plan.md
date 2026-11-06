# 058. Redesign de Projects: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003 (camadas do backend), 0015 (papéis; a regra de quem consulta execuções muda no service),
  0021, 0026 e 0036 (escopo por time, setor e participação, que seguem valendo), 0009 e 0037 (módulos; só HeroUI),
  0041 (cor só por token), 0010 (testes com sucesso e falha), 0045 (tabela sem total)
- **ADRs novos propostos:** nenhum (a regra de acesso continua a mesma por escopo; só o dev passa a ser aceito
  na consulta de execuções)

## Abordagem

Duas partes. No **backend**, uma única regra muda: a consulta de execuções de um caso
(`GET /api/form-factor/general/casos/{id}/execucoes`) hoje exige Admin, Gerente ou KP e recusa o dev. Passa a aceitar
também o dev com `form_factor.consultar`. O escopo por projeto não muda (`_obter_projeto_ativo_no_escopo`), então o dev
só abre casos de projetos do time dele, os mesmos cujos resultados ele já lê na aba Form Factor. A consulta de histórico
da General Results (`historico_projeto`) segue como está; a spec 059 trata dela. No **frontend**, a visão Results da aba
Form Factor ganha a coluna Actions com o ícone de histórico, que abre o `ResumoExecucoesDrawer` e o
`ResultadoExecucaoModal` que a General Results já usa. A Origem troca o rótulo "SDF" por "Spreadsheet" (o valor
`SDF` continua nos filtros e na API). O resto é conferência visual das duas abas contra os frames, ajustando só o que
diferir.

## Modelo de dados
Sem mudança. O valor `SDF` da origem fica no banco.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/form-factor/general/casos/{caso_teste_id}/execucoes` | `fuso_horario` | 200, `ResumoExecucoesResponse` (sem mudança) | 403 sem `form_factor.consultar` ou perfil fora de Admin, Gerente, KP e dev; 404 caso inexistente ou de projeto fora do escopo |

Nenhuma rota nova, nenhum campo novo.

## Backend: arquivos
- `src/application/services/form_factor_service.py`: `resumo_execucoes` passa a chamar `_exigir_consulta_execucoes`
  (Admin, Gerente, KP e `USUARIO_PADRAO`, com `form_factor.consultar`). `historico_projeto` continua com
  `_exigir_consulta_resultados_gerais`.
- `tests/unit/application/services/test_form_factor_historico.py`: o teste de 403 deixa de valer para o resumo com o dev
  (o `"DEV"` do parâmetro nem é um código real de perfil). Entram testes novos: o dev com permissão consulta as
  execuções de um caso do escopo; o dev sem `form_factor.consultar` recebe 403; o dev com caso de projeto fora do
  escopo recebe 404. O 403 do `historico_projeto` para o dev continua coberto.
- `tests/functional/test_form_factor_geral_api.py`: só se algum teste dependia do dev ser recusado na rota (hoje o
  teste mocka o service, então não deve mudar).

## Frontend: arquivos

**Compartilhado**
- `shared/ui/figma-icons.tsx`: `HistoryIcon` (9×9, de `icons/history.svg`, `currentColor`), o ícone que a 056 deixou de fora.
- `core/i18n/resources.ts` e `resources.test.ts`: `originSpreadsheet` ("Spreadsheet", "Planilha", "스프레드시트") e
  `viewExecutionHistory` ("View execution history", "Ver histórico de execuções", "실행 이력 보기").

**Projects**
- `modules/projetos/components/form-factor/FormFactorResultadosTabela.tsx`: o rótulo de Origem usa
  `originSpreadsheet` na célula, no filtro (valor `SDF`, rótulo novo) e na exportação; coluna Actions com o ícone de
  histórico (`RowActions`); prop `mostrarAssignee` (falsa para o dev); prop `onAbrirHistorico`.
- `modules/projetos/components/form-factor/HistoricoCasoPainel.tsx` (novo): junta o `ResumoExecucoesDrawer` e o
  `ResultadoExecucaoModal` com o estado do resultado aberto, para a página só guardar o caso escolhido.
- `modules/projetos/components/resultados-gerais/ResumoExecucoesDrawer.tsx`: a prop `caso` passa a pedir só
  `caso_teste_id`, `tc_id` e `responsavel_identificador` (o que o drawer lê), para servir às duas telas.
- `modules/projetos/components/ProjetoSwitcher.tsx`: prop `azul` (padrão `true`). Com `azul={false}` o nome continua
  `h1` e acessível, mas em `text-body`, como no frame.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: cabeçalho com o seletor sem azul e o filtro de semana; estado do
  caso do histórico e o `HistoricoCasoPainel`; `mostrarAssignee` só fora do perfil dev. Os botões e as regras de
  "Create test round" e "Import SDF report" não mudam.
- `shared/ui/page-tabs.tsx`, `shared/ui/data-table.tsx` e as colunas de Test Cases: só o que a conferência contra
  os frames 2549-2085 e 2550-3540 mostrar diferente (aba ativa azul e sublinhada, etiquetas de Status e Situação,
  etiquetas Pass e Fail). Mudança em componente compartilhado precisa passar nos testes das outras telas.
- `e2e/projetos-dev.spec.ts` e `e2e/form-factor.spec.ts`: ajustados ao rótulo "Spreadsheet" e ao novo ícone; novo e2e
  visual com a API simulada (`e2e/projetos-visual.spec.ts`).

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `ProjetoDetalhePage.test.tsx`: nome com seletor, filtro de semana e abas |
| CA-02 | Unidade + e2e | `ProjetoDetalhePage.test.tsx` (editar e transferir seguem); `projetos-visual.spec.ts` |
| CA-03 (falha) | Unidade | `ProjetoDetalhePage.test.tsx` e `FormFactorResultadosTabela.test.tsx`: vazio com e sem filtro |
| CA-04 | Unidade | `FormFactorResultadosTabela.test.tsx`: "Manual" e "Spreadsheet", filtro por `SDF`, exportação |
| CA-05 | Unidade | `FormFactorResultadosTabela.test.tsx` e `HistoricoCasoPainel.test.tsx`: o ícone abre o painel, o resultado abre o detalhe |
| CA-06 | Unidade (service) + unidade | `test_form_factor_historico.py` (dev com permissão); `ProjetoDetalhePage.test.tsx` (dev abre o painel) |
| CA-07 (falha) | Unidade (service) | `test_form_factor_historico.py`: sem permissão 403; projeto fora do escopo 404 |
| CA-08 (falha) | Unidade | `HistoricoCasoPainel.test.tsx`: erro da consulta com "Tentar de novo" |
| CA-09 | Unidade | `ProjetoDetalhePage.test.tsx`: só a gerência vê "Create test round" e "Import SDF report" |
| CA-10 | E2E | `projetos-visual.spec.ts`: sem texto cortado nos três idiomas |
| CA-11 | E2E | `projetos-visual.spec.ts`: foco visível, painel abre e fecha por teclado, foco volta ao ícone |
| CA-12 | Unidade + manual | `contraste-tema-escuro.test.ts`, `cores-por-token` e screenshot do escuro |

## Riscos e decisões pendentes

- **Acesso do dev às execuções:** é a única mudança de permissão. O escopo continua por projeto do time, e o 404 para
  caso de fora do escopo evita revelar que o caso existe. O teste de falha cobre isso. Se a decisão for limitar o dev
  só aos casos dele, o filtro entra no service (`responsavel_id` ou `backup_id`) e a spec muda.
- **Assignee escondido do dev:** a exportação da tabela do dev também perde a coluna. É a leitura mais coerente com o
  frame, mas quem exporta como dev deixa de ter o Assignee na planilha.
- **Componentes compartilhados:** aba e tabela são usadas em várias telas. A conferência visual lista as diferenças
  antes de mexer, e só entra o que o frame pede.
- **Arquivo grande:** `ProjetoDetalhePage.tsx` já tem 440 linhas. O painel de histórico fica fora dele, em
  `HistoricoCasoPainel.tsx`, para a página não crescer.
- **`HistoryIcon` de 9×9:** é pequeno; ao lado do `RowActions` de 20 px ele pode parecer solto. Confiro no
  screenshot contra o frame.
