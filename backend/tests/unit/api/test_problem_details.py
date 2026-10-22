from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel
from src.api.error_handling.handlers import registrar_handlers
from src.domain.common.exceptions import ConflictException, NotFoundException


class _Payload(BaseModel):
    nome: str


def _build_app() -> FastAPI:
    app = FastAPI()
    registrar_handlers(app)

    @app.post("/validar")
    def validar(payload: _Payload) -> dict:
        return {"ok": True}

    @app.get("/nao-encontrado")
    def nao_encontrado():
        raise NotFoundException("Usuário 1 não encontrado.")

    @app.get("/conflito")
    def conflito():
        raise ConflictException("E-mail já cadastrado.")

    return app


client = TestClient(_build_app(), raise_server_exceptions=False)


def test_validacao_invalida_retorna_422_com_errors():
    resposta = client.post("/validar", json={})

    assert resposta.status_code == 422
    assert resposta.headers["content-type"] == "application/problem+json"
    assert resposta.json()["errors"]


def test_recurso_inexistente_retorna_404():
    resposta = client.get("/nao-encontrado")

    assert resposta.status_code == 404
    assert resposta.json()["title"] == "Recurso não encontrado."


def test_conflito_retorna_409():
    resposta = client.get("/conflito")

    assert resposta.status_code == 409
