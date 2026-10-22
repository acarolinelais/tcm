# 0006. Validação com Pydantic e erros como ProblemDetails

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
As regras de entrada precisam ficar testáveis e fora dos routers, e todos os erros da API
precisam chegar ao frontend em um formato único.

## Decisão
- **Pydantic v2** valida a entrada: cada request é um modelo Pydantic em `application/schemas/`
  (`CriarUsuarioRequest`, `AtualizarUsuarioRequest`), com os limites e formatos declarados por campo
  (`Field(max_length=...)`, `EmailStr`, validadores customizados). Os limites vêm das constantes da entidade.
- O FastAPI valida o corpo e os parâmetros automaticamente contra esses modelos; regras de negócio que
  dependem de dados (ex.: e-mail único) ficam no service, não no schema.
- As exceções de negócio ficam em `domain/common/exceptions.py`: `NotFoundException` e `ConflictException`.
- **Handlers de exceção** registrados na camada `api` convertem tudo em **ProblemDetails (RFC 9457)**,
  com `Content-Type: application/problem+json`:

| Exceção | Status | Corpo |
|---|---|---|
| `RequestValidationError` (Pydantic/FastAPI) | 422 | ProblemDetails com `errors` por campo |
| `NotFoundException` | 404 | ProblemDetails |
| `ConflictException` | 409 | ProblemDetails (ex.: e-mail já cadastrado) |
| qualquer outra | 500 | ProblemDetails genérico, sem stack trace |

- O erro de validação de corpo do FastAPI é 422 por padrão. Mantemos 422 (padrão do framework) e
  padronizamos o **corpo** como ProblemDetails com a lista `errors` por campo, para o frontend ter um só formato.
- As mensagens de validação são escritas em português.

## Alternativas consideradas
- **Validar no router com `if`:** espalha as regras e são difíceis de compor e testar.
- **Biblioteca de validação separada (Cerberus, marshmallow):** o Pydantic já é a base do FastAPI;
  uma segunda camada seria redundante.
- **Result pattern em vez de exceções:** mais explícito, mas exige mais código em todo service e router.
  Para um CRUD de estudos, exceções somadas a handlers centrais são mais simples.

## Consequências
- ✅ Os routers ficam finos: sem `try/except` nem validação manual.
- ✅ O frontend trata um único formato de erro.
- ⚠️ Exceções como controle de fluxo têm um custo de desempenho, irrelevante nesta escala.
