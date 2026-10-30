# 038. Histórico de alterações do Test Case: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0010, 0012, 0013, 0015, 0037, **0044**
- **ADRs novos propostos:** nenhum além do [0044](../../adr/0044-auditoria-por-triggers-no-postgresql.md), já aceito.

## Abordagem

A gravação fica toda no banco, como manda o ADR 0044.
- Uma migration cria a tabela `auditoria_alteracoes`, a função `auditoria_registrar()`, o trigger
  que impede editar ou apagar o histórico e a função `auditoria_ativar()`.
- A mesma migration liga a auditoria em `casos_teste` e `links_pull_request`.
- Não muda nenhum service de escrita, a não ser para informar o contexto.

O **usuário** chega ao trigger pela `ContextVar` `usuario_auditoria`, em `infrastructure/data/auditoria.py`.
A `Session` começa a transação na primeira leitura, que acontece dentro do próprio `_obter_usuario_atual`. Por
isso a `ContextVar` é preenchida com o `usuario_id` do token **antes** dessa leitura. O evento `after_begin` da
`Session` grava o usuário em cada transação que começa, e não faz nada quando não há usuário (login, seeds,
scripts).

A **origem** não usa `ContextVar`, porque ela vazaria para as escritas seguintes da mesma tarefa.
`ContextoAuditoriaImpl.definir_origem` grava `app.origem` só na transação aberta. O
`FormFactorServiceImpl.registrar_resultados_rodada` chama `definir_origem("form_factor")` antes de mudar o
Status do caso (RN-04). Como o service não pode depender da
infrastructure (ADR 0003), a chamada passa por uma interface `ContextoAuditoria` no domain, com `definir_origem`.
Ela é injetada pela composição na camada `api`.

A **leitura** é um caso de uso novo, `CasoTesteService.historico(usuario, caso_id)`:
- reaproveita a checagem de acesso do `obter` (escopo e regras do dev, ADR 0015), então um caso fora do
  escopo ou de outra unidade dá 404 (RN-06, CA-06);
- busca em `HistoricoCasoTesteRepository` os registros do caso e dos links de PR dele, sempre filtrando por
  `unidade_id`;
- transforma cada linha em itens legíveis: cada coluna de `changed_fields` vira um item com o valor anterior e
  o novo. Ids de usuário viram nomes por uma busca em lote no `UsuarioRepository`. `updated_at`,
  `created_at`, `ativo`, `unidade_id` e `projeto_id` não são exibidos.

## Modelo de dados

Tabela `auditoria_alteracoes`, como no ADR 0044:

| Campo | Tipo | Regras |
|---|---|---|
| `id` | `BIGSERIAL` | PK |
| `unidade_id` | `UUID` | NOT NULL, vem de `NEW.unidade_id`/`OLD.unidade_id` |
| `table_name` | `TEXT` | NOT NULL |
| `operation` | `TEXT` | NOT NULL, `CHECK IN ('INSERT','UPDATE','DELETE')` |
| `row_id` | `UUID` | NOT NULL |
| `old_values`, `new_values` | `JSONB` | `to_jsonb(OLD)`/`to_jsonb(NEW)` |
| `changed_fields` | `TEXT[]` | só em `UPDATE`, sem as colunas de `TG_ARGV` (`updated_at`) |
| `usuario_id` | `UUID` | `NULLIF(current_setting('app.usuario_id', true), '')::uuid` |
| `usuario_nome`, `perfil_nome` | `TEXT` | copiados de `usuarios`/`perfis` pelo trigger (migration `e038b1c2d3e4`) |
| `tela` | `TEXT` | `app.tela`, do cabeçalho `X-Tela` (só o caminho, até 500 caracteres) |
| `origem` | `TEXT` | NOT NULL, `COALESCE(NULLIF(current_setting('app.origem', true), ''), 'api')` |
| `transaction_id` | `BIGINT` | `txid_current()` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, `clock_timestamp()` |

Índices: `(table_name, row_id, created_at)` e `(unidade_id, created_at)`. Em `links_pull_request`, o link
aponta para o caso por `new_values->>'caso_teste_id'`. A consulta do histórico busca os links do caso em
`links_pull_request` (pelo `caso_teste_id`) e depois os registros desses ids, então não precisa de índice em
JSONB.

Domain: um dataclass `RegistroAuditoria` (a linha crua da auditoria com o nome do autor), em
`domain/queries/registro_auditoria.py`, e a interface `HistoricoCasoTesteRepository`. A transformação em itens
("campo: anterior → novo") fica em `application/schemas/historico_caso_teste.py` (ADR 0007).

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/test-cases/{caso_id}/historico` | — | 200 `HistoricoCasoTesteResponse` | 401, 404 (inexistente, de outra unidade ou fora do escopo) |

```json
{ "itens": [
  { "campo": "status", "valor_anterior": "In Progress", "valor_novo": "In Review",
    "usuario_nome": "Ana Souza", "usuario_perfil": "Key Person", "origem": "api",
    "alterado_em": "2026-10-30T15:00:00Z" },
  { "campo": "pull_request", "valor_anterior": null, "valor_novo": "https://github.com/...",
    "usuario_nome": "Ana Souza", "origem": "api", "alterado_em": "..." },
  { "campo": "criacao", "valor_anterior": null, "valor_novo": null, "usuario_nome": null,
    "origem": "api", "alterado_em": "..." } ] }
```

Os itens vêm do mais recente para o mais antigo (RN-07), sem paginação: um caso tem dezenas de mudanças, não
milhares. `campo` usa o nome da coluna (`status`, `responsavel_id`, `backup_id`, `justificativa_exclusao`,
`category`, `difficulty`, `situation`, `automation_level`, `title`, `precondition`, `procedure`,
`expected_result`) mais `criacao` e `pull_request`. Em `responsavel_id` e `backup_id`, os valores saem como
nomes. O frontend traduz o rótulo de cada campo (i18n, spec 007).

Não existe rota para alterar ou apagar o histórico (RN-05).

## Backend: arquivos

Seguindo a skill `python-crud`:
- `infrastructure/data/migrations/versions/e038…_auditoria_test_case.py` (novo): o SQL do ADR 0044, com
  `down_revision = "e036a1b2c3d4"` e um `downgrade` que remove os triggers, as funções e a tabela.
- `infrastructure/data/auditoria.py` (novo): a `ContextVar` do usuário, o listener `after_begin` e a
  implementação de `ContextoAuditoria`.
- `domain/entities/interfaces/contexto_auditoria.py` (novo): `ContextoAuditoria` (Protocol).
- `domain/queries/registro_auditoria.py` e `domain/entities/interfaces/historico_caso_teste_repository.py`
  (novos).
- `infrastructure/repositories/historico_caso_teste_repository.py` (novo): só leitura, com `text()` em
  `auditoria_alteracoes`, filtrando por `unidade_id`.
- `application/services/caso_teste_service.py` e a interface (alterados): `historico`, reaproveitando a
  checagem de acesso do `obter`.
- `application/services/form_factor_service.py` (alterado): `definir_origem("form_factor")` antes de
  `caso.registrar_resultado_form_factor`.
- `application/schemas/caso_teste.py` (alterado): `HistoricoCasoTesteResponse`, com mapeamento manual (ADR 0007).
- `api/dependencies.py` (alterado): contexto de auditoria no `_obter_usuario_atual` e injeção do
  `ContextoAuditoria` e do repositório.
- `api/routers/test_cases.py` (alterado): `GET /{caso_id}/historico`.
- `.claude/skills/python-crud/SKILL.md` (alterado): uma linha que lembra `auditoria_ativar` quando uma
  entidade nova precisar de histórico (passo 6 da skill `adr`).

## Frontend: arquivos

Seguindo a skill `react-crud`, no módulo `projetos`:
- `api/projetos.api.ts` (alterado): `historicoCasoTeste(id)`, com o ramo do modo mock.
- `model/` (alterado): tipo `AlteracaoCasoTeste`.
- `hooks/useProjetos.ts` (alterado): `useHistoricoCasoTeste(casoId)`, com uma chave de cache que é invalidada
  junto com a do caso, quando ele é editado, transferido ou recebe um PR.
- `components/casos-teste/HistoricoCasoTeste.tsx` (novo): uma seção em HeroUI (ADR 0037) dentro do
  `DetalhesCasoTesteDrawer`, abaixo dos PRs. É uma lista cronológica com "Campo: anterior → novo", autor ou
  "Sistema", a origem Form Factor quando houver, e data e hora. Tem os estados carregando, vazio ("Nenhuma
  alteração registrada ainda") e erro.
- `core/mock/database.ts` (alterado): `historicoCasosTeste` no banco mock. As operações mock de editar,
  transferir, excluir e PR acrescentam registros, para o modo mock (spec 010) mostrar a seção funcionando.
- `core/i18n/resources.ts` (alterado): rótulos dos campos e textos da seção nos três idiomas.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração | `test_auditoria_caso_teste.py`: `UPDATE` de Status com `app.usuario_id` definido grava um registro com `changed_fields = {status}`, o antes, o depois e o usuário |
| CA-01 | Funcional | `test_historico_api.py`: o dev move o caso pela API e `GET /historico` devolve "In Progress → In Review" com o nome dele |
| CA-02 | Funcional | excluir com justificativa e ler o histórico: item `status → Excluded` e item `justificativa_exclusao` com o texto e o autor |
| CA-03 | Funcional | registrar FAIL numa rodada e ler o histórico: item `status → In Fixes` com `origem = form_factor` e o autor do lançamento |
| CA-04 | Funcional | transferir para o Backup: item `responsavel_id` com os nomes anterior e novo |
| CA-05 | Funcional | uma mudança recusada (403) não acrescenta itens ao histórico |
| CA-05 | Integração | um `UPDATE` seguido de `ROLLBACK` não deixa registro (RN-03) |
| CA-06 | Funcional | um usuário de outra unidade recebe 404 em `GET /historico` |
| CA-07 | Integração | `UPDATE` e `DELETE` em `auditoria_alteracoes` levantam exceção |
| CA-08 | Funcional | mudar a Category devolve "category: A → B" com o autor |
| CA-09 | Integração | um `UPDATE` com os mesmos valores (só o `updated_at` muda) não grava registro |
| RN-01 | Integração | `INSERT` em `links_pull_request` e a inativação gravam registros. A criação do caso grava `INSERT` |
| CA-01, 02, 04, 08 | Unidade | `test_caso_teste_service.py`: a transformação das linhas em itens (vários campos, nomes de usuário, colunas ocultas) |
| CA-01, 02 | Frontend | `HistoricoCasoTeste.test.tsx`: renderiza os itens, o estado vazio e o erro, com rótulos traduzidos |
| CA-01 | E2E | `historico-test-case.spec.ts` (API simulada por `page.route`): abrir o painel de um caso mostra os itens do Histórico |

## Riscos e decisões pendentes

- **Contexto na transação certa:** se uma rota escrever sem passar por `get_usuario_atual` (por exemplo, um
  script ou seed), o registro sai com `usuario_id` nulo e aparece como "Sistema". Isso é aceito pelo ADR. Um
  teste funcional confere que as rotas de escrita do Test Case preenchem o usuário.
- **Testes de integração dependem do Postgres:** ficam em `tests/integration`, como os outros. Os testes que
  já sujam o banco (backlog da 022) podem interferir; os novos criam e removem os próprios dados.
- **Downgrade:** o `downgrade` apaga a tabela `auditoria_alteracoes` e perde o histórico gravado. Isso vale só para
  desenvolvimento.
- **Importação de planilha:** os casos criados pela importação também geram `INSERT` no histórico, um por caso.
  Em planilhas de centenas de linhas, isso dobra as escritas, e é aceitável no volume atual.
