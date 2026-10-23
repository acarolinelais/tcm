# 0016. Repositório ganha `atualizar()` via `session.merge()`

- **Status:** Aceito
- **Data:** 2026-10-22
- **Substitui parcialmente:** [0004](0004-repository-unit-of-work-paginacao.md) — só a frase "'atualizar' não
  precisa de método: uma entidade rastreada é persistida no commit".

## Contexto
O ADR 0004 previa que mutar uma entidade e dar `commit()` bastaria, porque a entidade seria "rastreada"
pela sessão do SQLAlchemy. Na prática, `obter_por_id`/`obter_por_time_e_usuario` sempre devolvem uma
**entidade de domínio nova**, construída a partir do model (`_to_entity`), desconectada do objeto que a
sessão realmente rastreia. Mutar essa entidade e chamar `commit()` não persiste nada — foi descoberto ao
implementar `TimeMembro.papel` (spec 002, CA-09) e já valia, sem terem sido testados contra um banco real,
para `Usuario.atualizar`/`ativar`/`inativar` (spec 001).

## Decisão
`RepositoryBase` (domain) e `RepositoryBaseImpl` (infrastructure) ganham um método `atualizar`:
```python
class RepositoryBase(Protocol[T]):
    async def atualizar(self, entity: T) -> None: ...
```
```python
# RepositoryBaseImpl
async def atualizar(self, entity: T) -> None:
    await self.session.merge(self._to_model(entity))
```
`session.merge()` localiza a linha existente pela chave primária e aplica os campos do model passado —
resolve a desconexão entre entidade de domínio e objeto rastreado sem exigir que o repositório guarde
estado entre `obter` e `atualizar`. Todo service que mude uma entidade existente passa a chamar
`self._repo.atualizar(entidade)` antes do `self._uow.commit()` — inclusive os fluxos que já existiam
(`UsuarioServiceImpl.atualizar/ativar/inativar`, retroativamente corrigidos).

## Alternativas consideradas
- **Repositório cachear o model original entre `obter_por_id` e `atualizar` (padrão "unit of work" com
  identity map manual):** mais fiel ao "entidade rastreada" original do ADR 0004, mas exige guardar estado
  na instância do repositório entre chamadas — frágil se o mesmo repositório for reusado para mais de uma
  entidade na mesma requisição, e mais código pra manter.
- **Expor o model do SQLAlchemy direto no service (pular o mapeamento entidade↔model pra updates):**
  reacopla a `application` ao ORM, exatamente o que o ADR 0005/0007 separam.

## Consequências
- ✅ `atualizar`/`ativar`/`inativar`/mudar papel de um membro agora persistem de verdade — confirmado
  contra o Postgres nativo (não só testes de unidade com dublê, que nunca pegariam esse bug).
- ✅ Um método a mais na interface genérica, sem repetir lógica de merge em cada repositório concreto.
- ⚠️ `UsuarioServiceImpl.atualizar/ativar/inativar` (spec 001) precisam ser corrigidos retroativamente
  pra chamar `atualizar()`; até esta correção, esses fluxos silenciosamente não persistiam a mudança.
