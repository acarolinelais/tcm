# 054. Timeline dos Test Cases: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0006, 0008, 0009, 0010, 0013, 0015, 0030, 0037, 0041, 0043, 0044
- **ADRs novos propostos:** nenhum
- **Depende de:** spec 038, T09 (o item da lista do Histórico, usado no painel do card). O tipo
  `AlteracaoCasoTeste` entrou no `model/projeto.ts` com esta spec. O modo mock não depende da 038: usa dados
  de exemplo (decisão de 2026-11-01).

## Abordagem

Um endpoint de leitura devolve, para um projeto e um período, os cards já agrupados por caso, pessoa e dia,
cada um com as suas mudanças. O painel do card não precisa de uma segunda consulta. O backend lê
`auditoria_alteracoes` em SQL, como o histórico da 038 (ADR 0044), e converte cada registro com o mesmo
código da 038 (`campo`, antes e depois, nomes de responsável e Backup). O período tem no máximo 31 dias, e a
consulta traz todas as mudanças dele. Os filtros de pessoa e de caso são aplicados em memória, depois da
consulta, e assim a mesma resposta traz as opções dos filtros e a pilha de avatares, que ignoram os filtros
(RN-07, RN-08). Não há migration: o índice `(unidade_id, created_at)` da 038 atende a consulta por período.

No frontend, um módulo novo `timeline` substitui a tela "Em breve". A grade é uma faixa horizontal de colunas
(horas na visão Dia, dias na Semana e no Mês). Cada coluna empilha os seus cards. Na visão Mês, o card fica
compacto (barra e avatar, com o caso e a pessoa no tooltip), como os cards curtos do Figma. O período, a visão
e os filtros ficam no estado da página; o projeto fica em `?projeto=`, como na General Results (053).

## Modelo de dados

Sem mudança. A leitura usa:

| Tabela | Campos usados |
|---|---|
| `auditoria_alteracoes` | `table_name`, `operation`, `row_id`, `old_values`, `new_values`, `changed_fields`, `usuario_nome`, `perfil_nome`, `origem`, `created_at`, `unidade_id` |
| `links_pull_request` | `id`, `caso_teste_id` (liga o registro do link ao caso) |
| `casos_teste` | `id`, `tc_id`, `title`, `projeto_id`, `responsavel_id` |
| `usuarios` | `id`, `nome`, `cor_avatar` (nome atual e cor do responsável do caso) |

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{projeto_id}/timeline` | query: `inicio` e `fim` (`AAAA-MM-DD`, `fim` inclusivo), `fuso_horario` (padrão `UTC`), `responsavel_ids` e `caso_teste_ids` (listas opcionais de UUID) | 200 `TimelineResponse` | 401; 403 sem `test_cases.consultar`; 404 projeto inexistente, de outra unidade ou fora do escopo (CA-09, CA-10); 422 com `fim` antes de `inicio`, período maior que 31 dias ou fuso inválido (CA-12) |

```jsonc
// TimelineResponse
{
  "pessoas": [{ "id": "uuid", "nome": "Raquel Batista", "cor_avatar": "roxo" }],   // responsáveis no período, sem filtro
  "casos":   [{ "id": "uuid", "tc_id": "Clock_00046", "title": "..." }],           // casos com mudança no período, sem filtro
  "cards": [{
    "caso_teste_id": "uuid", "tc_id": "Clock_00046",
    "responsavel_id": "uuid", "responsavel_nome": "Raquel", "responsavel_cor_avatar": "roxo",
    "dia": "2026-12-29",                       // no fuso pedido
    "primeira_em": "2026-12-29T13:05:00Z",     // posição na visão Dia
    "alteracoes": [ /* AlteracaoCasoTesteResponse da 038, da mais recente para a mais antiga */ ]
  }]
}
```

- O card é o caso no dia, com o responsável atual do caso (RN-04, alterado em 2026-11-01). Quem fez cada
  mudança está em `alteracoes[].usuario_nome`, com o nome e o perfil do momento (RN-06, CA-08).
- Um card sem nenhuma mudança visível (só campos ocultos da 038) não aparece.

## Backend: arquivos

- `domain/queries/registro_auditoria.py`: `RegistroTimeline` (dataclass com o `RegistroAuditoria`, `caso_teste_id`,
  `tc_id`, `title` e o responsável do caso com nome e cor).
- `domain/entities/interfaces/historico_caso_teste_repository.py`: `listar_por_projeto(unidade_id, projeto_id,
  inicio, fim)`.
- `infrastructure/repositories/historico_caso_teste_repository.py`: a consulta. Junta o registro do link de PR
  ao caso por `links_pull_request.caso_teste_id`, filtra `unidade_id`, `projeto_id` e `created_at` em
  `[inicio, fim)`, e ordena do mais recente para o mais antigo. Inclui um comentário `shortcut:` sobre trazer o
  período inteiro: vale para centenas de mudanças por mês, e a solução é agrupar no SQL quando o volume pedir.
- `application/schemas/historico_caso_teste.py`: extrai de `to_historico_response` a função
  `alteracoes_do_registro(registro, nomes)`, usada pela 038 e pela timeline, sem mudar a resposta da 038.
- `application/schemas/timeline.py` (novo): `TimelineResponse`, `PessoaTimelineResponse`,
  `CasoTimelineResponse`, `CardTimelineResponse` e `to_timeline_response(registros, nomes, fuso, responsavel_ids,
  caso_ids)`, que faz o agrupamento (caso, pessoa, dia no fuso) e aplica os filtros.
- `application/validators/semana.py`: `intervalo_periodo(inicio, fim, fuso)`, que valida a ordem e o limite de
  31 dias e devolve o intervalo em UTC, como `intervalo_dia`.
- `application/services/caso_teste_service.py` e a interface: `timeline(usuario_atual, projeto_id, inicio, fim,
  fuso_horario, responsavel_ids, caso_ids)`. Exige `test_cases.consultar` e o projeto visível
  (`_obter_projeto_visivel`, ADR 0015), lê os registros, busca os nomes de responsável e Backup
  (`dados_por_usuarios`) e monta a resposta.
- `api/routers/projetos.py`: a rota `GET /{projeto_id}/timeline`, com `responsavel_ids` e `caso_teste_ids` em
  `Query(default=None)`.
- Testes:
  - `tests/unit/application/test_timeline_schema.py`: agrupamento, filtros e "Sistema";
  - `tests/unit/application/test_intervalo_periodo.py`: limites do período;
  - `tests/unit/application/test_caso_teste_service.py`: escopo e permissão;
  - `tests/integration/test_historico_caso_teste_repository.py`: período, projeto, unidade e PR;
  - `tests/functional/test_timeline_api.py`: 200, 404 e 422.

## Frontend: arquivos

Módulo novo `modules/timeline`, com HeroUI (ADR 0037) e cores por tokens (ADR 0041):

- `model/timeline.ts`: tipos `Timeline`, `CardTimeline`, `PessoaTimeline`, `CasoTimeline` e `VisaoTimeline`
  (`"dia" | "semana" | "mes"`).
- `utils/periodo.ts` e o teste: as funções puras `periodoDe(visao, data)` (Dia; Semana de segunda a domingo;
  Mês do calendário), `avancar(visao, data, ±1)`, `colunas(visao, periodo)` e `rotuloPeriodo(periodo,
  idioma)` ("22 Dec - 4 Jan"). Trocar Semana → Mês usa o mês do primeiro dia da semana (CA-05).
- `api/timeline.api.ts` e o teste: `timelineApi.obter(projetoId, inicio, fim, filtros)`. No modo mock (ADR
  0030), `api/timeline.mock.ts` gera cards de exemplo nos dias úteis do período e aplica os filtros, como a
  Overview faz com `overview.mock.ts` (spec 039). Decidido em 2026-11-01, porque o histórico simulado da 038
  (T08) ainda não existe.
- `hooks/useTimeline.ts` e o teste: TanStack Query com a chave `["timeline", projetoId, inicio, fim, filtros]` e
  `placeholderData` mantendo a grade anterior durante a troca de período.
- `components/TimelineGrade.tsx`: cabeçalho de colunas (mês e dia, como no Figma), linha de "agora"
  (RN-09) e colunas com os cards. Na visão Dia, as 24 colunas de hora rolam na horizontal dentro da grade; a
  página não rola para os lados.
- `components/TimelineCard.tsx`: botão com a barra de cor, `tc_id`, nome, quantidade ("3 mudanças") e o
  `AvatarUsuario` (ADR 0043), com a variante compacta da visão Mês. O nome acessível descreve o card inteiro.
- `modules/projetos/components/casos-teste/AlteracaoCasoTesteItem.tsx`: uma mudança com o `ComparacaoAlteracao`
  da tela de Auditoria (spec 052, rótulos em `shared/lib/auditoria.ts`) e a linha de autor, origem e data. A
  seção Histórico da 038 (T09) pode usar o mesmo item. Decidido em 2026-11-01, ao atualizar a branch com a
  `dev`.
- `components/AlteracoesCardDrawer.tsx`: `SideDrawer` com a lista de mudanças (o item da 038 T09) e o botão
  "Abrir Test Case", que abre o `DetalhesCasoTesteDrawer` existente com `{ id, tc_id }` (RN-05).
- `components/PilhaAvatares.tsx`: até 5 `AvatarUsuario` com `Tooltip` do HeroUI e "+N" (RN-08).
- `pages/TimelinePage.tsx`: `ProjetoSwitcher` com `buscavel` e `onEscolher` (053), descrição, `ToggleButtonGroup`
  Dia/Semana/Mês, setas e "Hoje", os dois `MultiSelectCombobox` (pessoa e caso, com busca por `tc_id` e
  `title`), estados de carregando, erro (`ErroComRetry`) e vazio com "Limpar filtros" (RN-11).
- `routes.tsx` e `index.ts`; `core/router.tsx` troca o `EmBreve` de `timeline` pela rota do módulo;
  `core/layout/EmBreve.tsx` perde a ilustração `timeline` se ela não tiver mais uso.
- `core/i18n/resources.ts`: textos nos três idiomas, revisados com `better-writing`.
- `e2e/timeline.spec.ts`: com a API simulada por `page.route`, escolher o projeto, filtrar duas pessoas,
  trocar para Mês e abrir um card.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional + Vitest + e2e | `test_timeline_semana_retorna_cards_nos_dias`; página abre na semana atual; e2e escolhe o projeto |
| CA-02 | Unidade + Vitest | `test_agrupa_mudancas_da_mesma_pessoa_caso_e_dia`; card mostra "2 mudanças" e o painel as duas |
| CA-03 | Unidade + e2e | `test_filtra_varias_pessoas`; e2e filtra Ana e Bia |
| CA-04 | Unidade + Vitest | `test_filtra_varios_casos`; filtro de caso na página |
| CA-05 | Vitest | `periodo.test.ts`: Semana → Mês; filtros mantidos na troca de visão |
| CA-06 | Vitest | `periodo.test.ts`: `avancar` e rótulo; botão "Hoje" na página |
| CA-07 | Vitest | `PilhaAvatares`: 6 pessoas → 5 avatares e "+1" |
| CA-08 | Integração | `test_timeline_mantem_nome_e_perfil_do_momento` (renomeia a pessoa depois da mudança) |
| CA-09 | Unidade + Funcional | `test_timeline_projeto_fora_do_escopo_404` (dev de outro time) |
| CA-10 | Integração + Funcional | `test_timeline_nao_mostra_registros_de_outra_unidade` |
| CA-11 | Vitest | período vazio mostra a mensagem; com filtro, "Limpar filtros" volta aos cards |
| CA-12 | Unidade + Funcional | `test_intervalo_periodo_fim_antes_do_inicio`, `..._maior_que_31_dias`; rota responde 422 |

## Riscos e decisões pendentes

- **O Figma mostra 14 dias** na visão Week ("22 Dec - 4 Jan"). A spec define a semana com 7 dias (RN-03), e o
  plano segue a spec. Se o produto quiser duas semanas, basta mudar `periodoDe`; o limite de 31 dias do
  backend já comporta isso.
- **Volume:** um projeto com milhares de mudanças em um mês traz tudo numa resposta só. O `shortcut:` no
  repositório marca o ponto de evolução (agrupar no SQL e paginar por coluna).
- **Posição no Figma:** no desenho, os cards ficam soltos na altura da grade. Aqui eles se empilham por coluna,
  o que evita sobreposição e dispensa calcular posições.
- **Dependência da 038, T09:** resolvida. O item da lista é da 054 e reaproveita o componente da 052.
- **Fuso:** o dia do card vem do fuso do navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`), como na
  General Results. Uma mudança às 23h30 no Brasil cai no dia local, não no dia em UTC.
