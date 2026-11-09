import httpx
from fastapi import FastAPI
from pydantic import BaseModel
from src.api.error_handling.handlers import registrar_handlers
from src.domain.common.exceptions import (
    ConflictException,
    CredenciaisInvalidasException,
    ForbiddenException,
    NotFoundException,
)


class _Payload(BaseModel):
    nome: str


def _build_app() -> FastAPI:
    app = FastAPI()
    registrar_handlers(app)

    @app.post("/validar")
    def validar(payload: _Payload) -> dict:
        return {"ok": True}

    @app.get("/nao-encontrado")
    async def nao_encontrado():
        raise NotFoundException("Usuário 1 não encontrado.")

    @app.get("/conflito")
    async def conflito():
        raise ConflictException("E-mail já cadastrado.")

    @app.get("/conflito-com-campo")
    async def conflito_com_campo():
        raise ConflictException("SDF ID já usado.", campo="sdf_id")

    @app.get("/conflito-com-codigo")
    async def conflito_com_codigo():
        raise ConflictException(
            "2 Test Cases ainda não estão em Done.",
            campo="status",
            codigo="projeto_com_casos_pendentes",
            parametros={"quantidade": 2},
        )

    @app.get("/proibido")
    async def proibido():
        raise ForbiddenException("Sem permissão.")

    @app.get("/nao-autenticado")
    async def nao_autenticado():
        raise CredenciaisInvalidasException("Credenciais inválidas.")

    return app


app = _build_app()


async def _get(path: str) -> httpx.Response:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        return await client.get(path)


async def test_validacao_invalida_retorna_422_com_errors():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        resposta = await client.post("/validar", json={})

    assert resposta.status_code == 422
    assert resposta.headers["content-type"] == "application/problem+json"
    assert resposta.json()["errors"]


async def test_recurso_inexistente_retorna_404():
    resposta = await _get("/nao-encontrado")

    assert resposta.status_code == 404
    assert resposta.json()["title"] == "Recurso não encontrado."


async def test_conflito_retorna_409():
    resposta = await _get("/conflito")

    assert resposta.status_code == 409
    assert "errors" not in resposta.json()


async def test_conflito_com_campo_retorna_409_com_errors():
    resposta = await _get("/conflito-com-campo")

    assert resposta.status_code == 409
    assert resposta.json()["errors"] == [{"campo": "sdf_id", "mensagem": "SDF ID já usado."}]


async def test_conflito_com_codigo_retorna_409_com_codigo_e_parametros():
    resposta = await _get("/conflito-com-codigo")

    assert resposta.status_code == 409
    assert resposta.json()["errors"] == [
        {
            "campo": "status",
            "mensagem": "2 Test Cases ainda não estão em Done.",
            "codigo": "projeto_com_casos_pendentes",
            "parametros": {"quantidade": 2},
        }
    ]


async def test_forbidden_retorna_403():
    resposta = await _get("/proibido")
    assert resposta.status_code == 403
    assert resposta.headers["content-type"] == "application/problem+json"


async def test_credenciais_invalidas_retorna_401():
    resposta = await _get("/nao-autenticado")
    assert resposta.status_code == 401
    assert resposta.headers["content-type"] == "application/problem+json"
