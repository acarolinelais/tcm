# 0013. Multi-tenancy e hierarquia organizacional

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
O sistema vai atender várias unidades organizacionais (ex.: "Unidade Manaus"), cada uma com setores,
times e pessoas próprias. Os dados de uma unidade não podem vazar para outra, e a estrutura interna
(setor → time → pessoas) precisa de um modelo de dados antes de existir qualquer tela ou regra de
permissão em cima dela. A decisão vem de um diagrama desenhado à mão pelo usuário, que também aponta
que pode existir uma "Organização" acima da Unidade no futuro, agrupando várias unidades.

## Decisão
**`Unidade` é a fronteira do tenant.** Nenhuma consulta cruza unidades; `Organização` **não existe no
v1** — fica só como extensão futura (quando existir, um ADR novo decide se ela também isola dados ou só
agrupa Unidades para fins administrativos).

**Hierarquia** (todas as entidades novas em `domain/entities/`, seguindo o padrão do ADR 0003):
```
Unidade                          # id, nome — raiz do tenant
  Setor (unidade_id)             # id, unidade_id, nome
    Time (setor_id, gerente_id)  # id, setor_id, nome, gerente_id → Usuario
      TimeMembro (time_id, usuario_id, papel)  # N:N entre Time e Usuario; papel = dev | kp (ADR 0015)
```
- Um `Usuario` é **gerente** de um `Time` quando `Time.gerente_id` aponta pra ele; o mesmo usuário pode
  gerenciar vários times (`gerente pode ter múltiplos times`, conforme o diagrama).
- Um `Usuario` é **membro** de um `Time` via `TimeMembro`; um time tem vários membros. O campo `papel`
  de `TimeMembro` (`dev` ou `kp`) distingue um membro comum do **KP (Key Person)** daquele time — a
  semântica de cada papel está no ADR 0015, aqui só a coluna que a carrega.
- `Setor` tem seus próprios times; o diagrama mostra um gerente por setor no exemplo, mas o modelo não
  impede mais de um time — e portanto mais de um gerente — por setor.

**Isolamento por `unidade_id` denormalizado.** Toda tabela com dado específico de uma unidade
(`setores`, `times`, `time_membros` e, mais tarde, `tasks`) guarda o próprio `unidade_id`, em vez de só
herdar via join. O `RepositoryBaseImpl` (ADR 0004) passa a receber o `unidade_id` do contexto autenticado
(ADR 0014) e filtra **toda** consulta por ele — nenhuma query de entidade tenant-scoped roda sem esse
filtro.

```python
class RepositoryBaseImpl[T: EntidadeComTenant, M]:
    async def listar_paginado(self, unidade_id: UUID, page: int, page_size: int) -> PagedResult[T]:
        stmt = select(self.model).where(self.model.unidade_id == unidade_id)...
```

## Alternativas consideradas
- **Schema por tenant (um schema Postgres por Unidade):** isolamento mais forte, mas migrations e
  conexões multiplicam por unidade — complexidade operacional incompatível com um repositório de estudos.
- **Banco por tenant:** ainda mais isolamento, ainda mais operação; descartado pelo mesmo motivo.
- **Só join através da hierarquia (sem `unidade_id` denormalizado):** schema mais normalizado, mas toda
  consulta de `Task` precisaria de 3 joins (`Time → Setor → Unidade`) só para filtrar por tenant — mais
  fácil de esquecer o filtro em um repositório novo e vazar dado entre unidades.

## Consequências
- ✅ Isolamento simples de auditar: todo repositório tenant-scoped tem o mesmo filtro, no mesmo lugar.
- ✅ Um único banco Postgres (ADR 0005) continua servindo todas as unidades, sem custo operacional extra.
- ⚠️ O isolamento é feito na aplicação, não no banco (sem Row-Level Security do Postgres); um
  `RepositoryBaseImpl` que esqueça o filtro é o único ponto de falha — por isso o filtro fica na classe
  base, não repetido em cada repositório concreto.
- ⚠️ Se `Organização` existir no futuro, times de equipes gerentes de múltiplas unidades (ex.: relatórios
  cross-unidade) vão exigir um ADR novo — este documento assume que isso não é necessário agora.
