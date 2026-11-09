# 068. Aba Form Factor com a visão da General Results: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0009, 0010, 0013, 0015, 0037, 0045, 0046
- **ADRs novos propostos:** nenhum

## Abordagem

A aba Form Factor passa a usar a mesma consulta da General Results
(`GET /api/form-factor/general/projetos/{id}/historico`) e a mesma `HistoricoProjetoTabela`. A consulta ganha o
parâmetro `associados_a_mim`, como a lista de Test Cases já tem: com ele, só entram os casos em que a pessoa é dona
ou backup. A aba manda o parâmetro para o dev; a General Results não manda, e o dev continua vendo o time lá (spec
059). Cada caso da resposta passa a trazer `backup_id` e `rodada_pendente_id`, o que a ação de registrar precisa. A
regra da rodada pendente sai do repositório do Summary para uma função compartilhada. O estado da tabela (filtros,
página, linhas abertas, janela de detalhe e histórico) sai da `ResultadosGeraisPage` para um componente
`ResultadosFormFactorProjeto`, usado pelas duas telas. As visões Results e Summary, as tabelas delas e os hooks
`useFormFactor` e `useFormFactorResultados` saem do frontend.

## Modelo de dados

Nenhuma mudança. `CasoHistorico` (consulta) ganha `backup_id` e `rodada_pendente_id`.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/form-factor/general/projetos/{id}/historico` | os filtros de hoje + `associados_a_mim: bool = false` | 200, cada item com `backup_id` e `rodada_pendente_id` (nulos quando não há) | os de hoje: 403 sem permissão, 404 fora do escopo, 422 filtro inválido |

O registro manual usa a rota de hoje (`POST .../form-factor/rodadas/{rodada_id}/test-cases/{caso_id}/resultados`),
que já confere quem pode registrar.

## Backend: arquivos

- `domain/queries/historico_form_factor.py`: `FiltrosCasoHistorico.associado_a: UUID | None`; `CasoHistorico` com
  `backup_id` e `rodada_pendente_id`.
- `infrastructure/repositories/historico_form_factor_repository.py`: o filtro dono ou backup em `_filtros_casos`
  (vale para casos e datas); `backup_id` nas colunas; `rodada_pendente_id` preenchido pela função compartilhada.
- `infrastructure/repositories/resultado_form_factor_repository.py`: a consulta da rodada pendente vira função do
  módulo e é usada pelas duas consultas.
- `application/services/form_factor_service.py` e a interface: `associados_a_mim` vira `associado_a=usuario.id`.
- `application/schemas/form_factor_historico.py`: os dois campos novos no response (mapeamento manual, ADR 0007).
- `api/routers/form_factor_geral.py`: o parâmetro `associados_a_mim`.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`: `CasoHistorico` com `backup_id` e `rodada_pendente_id`;
  `FiltrosHistoricoProjeto.associadosAMim`.
- `modules/projetos/api/projetos.api.ts` (e o modo mock em `core/mock/database.ts`): o parâmetro novo.
- `modules/projetos/components/resultados-gerais/ResultadosFormFactorProjeto.tsx` (novo): tabela, filtros, página,
  linhas abertas, janela de detalhe e histórico, que hoje estão na `ResultadosGeraisPage`.
- `modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx`: a ação de registrar em Actions,
  quando a tela passa `podeRegistrar` e `onRegistrar`.
- `modules/projetos/pages/ResultadosGeraisPage.tsx`: usa o componente novo.
- `modules/projetos/pages/ProjetoDetalhePage.tsx`: sem o seletor Results/Summary; usa o componente novo com
  `associadosAMim` para o dev e o registro manual (`FormFactorManualDialog`) pela linha.
- Saem: `FormFactorTabela.tsx`, `FormFactorResultadosTabela.tsx`, `colunas-form-factor.tsx` (se nada mais usar),
  os testes deles, os hooks `useFormFactor` e `useFormFactorResultados` e os textos que só eles usavam.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-02, CA-04 | Integração | `test_historico_form_factor_repository.py`: `associado_a` traz dono e backup e deixa o resto de fora |
| CA-02, CA-07 | Integração | mesmo arquivo: `backup_id` e `rodada_pendente_id` no caso |
| CA-02, CA-03 | Unidade | `test_form_factor_service.py`: `associados_a_mim` vira o filtro do usuário |
| CA-02 | Funcional | `test_form_factor_geral_api.py`: o parâmetro chega ao service |
| CA-01, CA-09, CA-10 | Unidade (Vitest) | `ProjetoDetalhePage.test.tsx`: sem seletor, a tabela nova, sem os botões de importar, semana no período |
| CA-02, CA-04 | Unidade (Vitest) | mesmo arquivo: dev pede `associadosAMim`, gestão não |
| CA-05, CA-06, CA-11 | Unidade (Vitest) | `HistoricoProjetoTabela.test.tsx` (já cobre) e `ResultadosGeraisPage.test.tsx` seguindo verde |
| CA-07, CA-08 | Unidade (Vitest) | `HistoricoProjetoTabela.test.tsx`: a ação aparece só com rodada pendente e permissão |

## Riscos e decisões pendentes

- O filtro de Assignee da General Results é texto (busca pelo ID do tester), não uma lista. Com o
  `associados_a_mim`, a busca só acha os casos do dev, então a CA-03 vale sem lista nova.
- O endpoint do Summary (`/form-factor`) e o de Results (`/form-factor/results`) ficam sem tela. Sair com eles mexe
  no backend fora desta spec: vão para o Backlog.
- `associados_a_mim` não é regra de segurança: o dev já vê o time na General Results. É só o recorte da aba.
