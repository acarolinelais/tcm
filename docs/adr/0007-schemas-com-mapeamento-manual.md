# 0007. Schemas com mapeamento manual

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
As entidades e os models do ORM não podem sair pela API (para não vazar o modelo nem permitir overposting).
É preciso converter entre entidade e schema de resposta de forma **simples de ler**.

## Decisão
- Schemas como modelos Pydantic em `application/schemas/<entidade>.py`:
  `UsuarioResponse`, `CriarUsuarioRequest` e `AtualizarUsuarioRequest`.
- O mapeamento de entidade para response é **manual**, com uma função no mesmo módulo:
  ```python
  class UsuarioResponse(BaseModel):
      id: UUID
      nome: str
      email: str
      ativo: bool
      created_at: datetime

  def to_response(u: Usuario) -> UsuarioResponse:
      return UsuarioResponse(id=u.id, nome=u.nome, email=u.email, ativo=u.ativo, created_at=u.created_at)
  ```
- Request para entidade: o service chama o construtor ou os métodos da entidade
  (`Usuario(request.nome, request.email)`, `usuario.atualizar(...)`). Não existe "map de request para entidade".
- O mapeamento entre a entidade de domínio e o model SQLAlchemy fica na infrastructure (repositório),
  separado deste mapeamento de API.

## Alternativas consideradas
- **`from_attributes=True` (ORM mode) direto no model do ORM:** reexpõe o model de banco como resposta e
  reacopla a API ao ORM — exatamente o que o ADR 0005 separa.
- **Serializer automático genérico:** o mapeamento fica implícito e os erros só aparecem em runtime.

## Consequências
- ✅ O mapeamento é visível e explícito, e o type checker acusa campos novos.
- ✅ Nenhuma dependência extra.
- ⚠️ Algumas linhas repetitivas por entidade.
