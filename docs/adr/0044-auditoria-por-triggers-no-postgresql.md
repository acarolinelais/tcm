# 0044. Auditoria de alterações por triggers no PostgreSQL

- **Status:** Aceito
- **Data:** 2026-10-30

## Contexto
A spec 038 pede o histórico de cada Test Case: o que mudou, o valor anterior e o novo, quem fez e quando. A
mudança e o registro precisam acontecer juntos, sem mudança sem registro (RN-03). Um Test Case muda por
vários caminhos: edição pela API, transferência para o Backup, exclusão com justificativa, links de PR,
importação de planilha e resultados de Form Factor, que mudam o Status sozinhos (spec 022). Gravar o
histórico em cada um desses pontos do código repete a mesma lógica e deixa passar o caminho que alguém
esquecer. O usuário escolheu seguir o padrão de triggers de auditoria do PostgreSQL descrito em
[How to Build PostgreSQL Triggers for Audit](https://oneuptime.com/blog/post/2026-01-30-postgresql-triggers-audit/view).

## Decisão
**Um trigger `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` grava cada mudança numa tabela de
auditoria.** O trigger e a tabela são criados por migration do Alembic (ADRs 0005 e 0012), com `op.execute`.

**Tabela `auditoria_alteracoes`**, no mesmo schema das tabelas auditadas (o `public`). As funções
`auditoria_registrar()` e `auditoria_ativar()` também ficam nele. Um schema próprio, como no artigo,
seria compartilhado pelo banco inteiro: desfazer a migration num schema temporário de teste apagaria a
auditoria de todos os outros.

| Coluna | Tipo | Conteúdo |
|---|---|---|
| `id` | `BIGSERIAL` PK | |
| `unidade_id` | `UUID NOT NULL` | copiado da linha alterada (ADR 0013) |
| `table_name` | `TEXT NOT NULL` | `TG_TABLE_NAME` |
| `operation` | `TEXT NOT NULL` | `INSERT`, `UPDATE` ou `DELETE` |
| `row_id` | `UUID NOT NULL` | `id` da linha alterada |
| `old_values` / `new_values` | `JSONB` | `to_jsonb(OLD)` / `to_jsonb(NEW)` |
| `changed_fields` | `TEXT[]` | colunas que mudaram (só em `UPDATE`) |
| `usuario_id` | `UUID` | `current_setting('app.usuario_id', true)` |
| `origem` | `TEXT NOT NULL` | `current_setting('app.origem', true)`, padrão `api` |
| `usuario_nome`, `perfil_nome` | `TEXT` | o trigger busca em `usuarios` e `perfis` pelo `usuario_id`, no momento da gravação |
| `tela` | `TEXT` | `current_setting('app.tela', true)`: caminho da tela que o front manda no cabeçalho `X-Tela` |
| `transaction_id` | `BIGINT` | `txid_current()` |
| `created_at` | `TIMESTAMPTZ NOT NULL` | `clock_timestamp()` |

Com índices em `(table_name, row_id, created_at)` e `(unidade_id, created_at)`.

**Função genérica `auditoria_registrar()`**, adaptada do artigo:
- usa `NEW.id`/`OLD.id` direto, porque todas as tabelas do projeto têm a PK `id`;
- ignora as colunas passadas em `TG_ARGV` (por padrão `updated_at`);
- não grava um `UPDATE` em que nada mudou além das colunas ignoradas.

**Tabelas auditadas agora:** `casos_teste` e `links_pull_request`. Outra tabela entra com
`auditoria_ativar('<tabela>')` numa migration da spec que precisar.

**Nome e perfil são uma foto do momento.** O trigger os copia ao gravar, então renomear a pessoa ou trocar o
perfil dela depois não reescreve o histórico.

**A tela vem do front.** O cliente HTTP manda `X-Tela: <location.pathname>` em toda requisição. A API guarda
só o caminho (sem query nem fragmento, até 500 caracteres) e o repassa ao trigger como faz com o usuário. O
valor é informado pelo navegador: serve de contexto para quem audita, não de prova.

**Contexto do usuário por `set_config(..., true)` (equivalente ao `SET LOCAL`) no início de cada transação.**
A dependência de autenticação guarda o `usuario_id` numa `ContextVar` antes da primeira leitura do banco. Um
evento `after_begin` da `Session` grava esse valor em cada transação que começa:

```python
@event.listens_for(Session, "after_begin")
def _aplicar_usuario(session, transaction, connection):
    usuario = usuario_auditoria.get()
    if usuario is not None:
        connection.execute(text("SELECT set_config('app.usuario_id', :u, true)"), {"u": str(usuario)})
```

Um service que muda dados em nome de outro processo (por exemplo, o Status por resultado de Form Factor)
chama `ContextoAuditoria.definir_origem("form_factor")` antes da escrita. Isso grava `app.origem` só na
transação aberta, e a escrita seguinte volta a ser `api`.

**O histórico é imutável.** Um trigger `BEFORE UPDATE OR DELETE` em `auditoria_alteracoes` levanta exceção.
A aplicação só **lê** a tabela, por um repositório de leitura na `infrastructure` que filtra por
`unidade_id` (ADR 0013). Nenhuma camada grava na tabela pelo ORM.

**Sem limpeza automática por enquanto.** Retenção e particionamento por mês, como sugere o artigo, ficam
para quando o volume pedir.

## Alternativas consideradas
- **Gravar o histórico no service (evento de domínio ou insert explícito):** cada caminho que muda um Test
  Case teria de lembrar de gravar. Isso inclui a importação, o Form Factor e scripts de manutenção. O primeiro
  esquecimento abre um buraco no histórico, e a lógica se repete em vários services.
- **Eventos do ORM (`before_flush` do SQLAlchemy):** não veem `UPDATE` em lote nem SQL escrito à mão, que já
  existem nas migrations e nos repositórios. Parece completo, mas não é.
- **Gravação assíncrona (`LISTEN/NOTIFY` ou tabela de buffer, como o artigo mostra para alto volume):** a
  mudança pode ser confirmada sem o registro, o que quebra a RN-03. O volume do projeto não justifica.
- **Extensões (`pgaudit`, `temporal_tables`):** o `pgaudit` escreve no log do servidor e não dá para
  consultar por Test Case. A `temporal_tables` não vem na imagem `postgres:18-alpine`.

## Consequências
- ✅ Nenhum caminho de escrita fica de fora: API, importação, Form Factor e SQL manual passam pelo trigger.
- ✅ A mudança e o registro estão na mesma transação. Se um falha, os dois voltam juntos.
- ✅ Outras tabelas entram com uma linha (`enable_tracking`), sem código novo na aplicação.
- ⚠️ Parte da regra mora em PL/pgSQL, fora do Python. Os testes do trigger são de integração, contra o
  Postgres, e não de unidade.
- ⚠️ Se uma escrita acontecer sem o contexto (`ContextVar` vazia), o registro fica com `usuario_id` nulo.
  Os testes conferem que todo endpoint que escreve preenche o usuário.
- ⚠️ O JSONB guarda os valores crus (códigos de Status, ids de usuário). Traduzir para nomes legíveis fica a
  cargo da aplicação, na leitura.
- ⚠️ A imutabilidade vale para a aplicação e para quem usa SQL comum. O dono da tabela ainda pode desligar o
  trigger (`ALTER TABLE ... DISABLE TRIGGER` ou `session_replication_role = replica`), e isso fica a cargo de
  quem administra o banco.
- ⚠️ A tabela só cresce. É preciso acompanhar o tamanho e decidir sobre retenção quando o volume pedir.
