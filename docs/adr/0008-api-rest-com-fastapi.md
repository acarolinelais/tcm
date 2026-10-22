# 0008. API REST com FastAPI

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
Os endpoints precisam de um padrão REST único, previsível para o frontend e fácil de replicar para novas entidades.

## Decisão
- **Routers** do FastAPI (`APIRouter`), um por recurso, com ações finas que só delegam ao service
  (injetado por `Depends`, ADR 0003).
- Rotas em `/api/<recurso-no-plural>`, com o id tipado `{id}` como `UUID`.
- **Exclusão lógica por padrão**: toda entidade tem `ativo` e os métodos de domínio `ativar()` e `inativar()`.
  Só existe `DELETE` físico quando o `plan.md` justificar que a entidade não tem valor histórico (ADR 0004).
- Os nomes das ações e dos métodos de service seguem o domínio, em português:
  `listar`, `obter`, `criar`, `atualizar`, `ativar`, `inativar`.

| Ação | Verbo e rota | Sucesso | Erros |
|---|---|---|---|
| Listar | `GET /api/usuarios?page=1&page_size=20` | 200 `PagedResult[UsuarioResponse]` | 422 |
| Obter | `GET /api/usuarios/{id}` | 200 `UsuarioResponse` | 404 |
| Criar | `POST /api/usuarios` | 201 + `Location` | 422, 409 |
| Atualizar | `PUT /api/usuarios/{id}` | 200 `UsuarioResponse` | 422, 404, 409 |
| Ativar | `PATCH /api/usuarios/{id}/ativar` | 204 | 404 |
| Inativar | `PATCH /api/usuarios/{id}/inativar` | 204 | 404 |

Router de referência (esboço):
```python
router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

@router.get("", response_model=PagedResult[UsuarioResponse])
async def listar(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                 service: UsuarioService = Depends(get_usuario_service)):
    return await service.listar(page, page_size)

@router.get("/{id}", response_model=UsuarioResponse)
async def obter(id: UUID, service: UsuarioService = Depends(get_usuario_service)):
    return await service.obter(id)

@router.post("", response_model=UsuarioResponse, status_code=201)
async def criar(request: CriarUsuarioRequest, response: Response,
                service: UsuarioService = Depends(get_usuario_service)):
    usuario = await service.criar(request)
    response.headers["Location"] = f"/api/usuarios/{usuario.id}"
    return usuario

@router.patch("/{id}/inativar", status_code=204)
async def inativar(id: UUID, service: UsuarioService = Depends(get_usuario_service)):
    await service.inativar(id)
```
Os parâmetros `page` e `page_size` usam `Query(ge=..., le=...)`; fora do limite, o FastAPI responde 422.
Nenhuma lógica no router. Quando houver autenticação (ADR futuro), cada ação ganha a dependência de permissão.

- **Documentação da API:** o OpenAPI é gerado nativamente pelo FastAPI (`/openapi.json`), e a interface de
  documentação é o **Scalar** (`scalar-fastapi`, em `/scalar`), disponível só fora de produção. O Swagger UI
  embutido (`/docs`) pode ficar ligado em dev, mas o Scalar é a interface padrão, para paridade com o estudo de origem.

## Alternativas consideradas
- **Django REST Framework (ViewSets):** mais mágico e acoplado ao Django; foge da Clean Architecture.
- **Flask + blueprints:** exige montar validação e OpenAPI à mão.
- **`DELETE` físico como padrão:** perde histórico e quebra referências. A exclusão lógica atende o CRUD.

## Consequências
- ✅ Toda entidade tem os mesmos 6 endpoints, e o frontend reutiliza o mesmo padrão de API.
- ✅ As ações cabem em poucas linhas, e as regras ficam no service.
- ⚠️ As listagens precisam decidir se mostram inativos. O padrão é mostrar todos, com a indicação de status.
