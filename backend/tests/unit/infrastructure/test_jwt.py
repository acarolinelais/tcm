from uuid import uuid4

import jwt
import pytest
from src.domain.entities.usuario import Usuario
from src.infrastructure.security.jwt import ALGORITHM, criar_token, decodificar_token


def test_criar_e_decodificar_token_recupera_os_dados():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")
    usuario.admin_unidade = True

    token = criar_token(usuario)
    payload = decodificar_token(token)

    assert payload is not None
    assert payload.usuario_id == usuario.id
    assert payload.unidade_id == usuario.unidade_id
    assert payload.admin_unidade is True


def test_decodificar_token_invalido_retorna_none():
    payload = decodificar_token("token-invalido")

    assert payload is None


@pytest.mark.parametrize(
    "claims",
    [
        {"unidade_id": str(uuid4()), "admin_unidade": False},
        {"sub": "nao-e-uuid", "unidade_id": str(uuid4()), "admin_unidade": False},
        {"sub": str(uuid4()), "unidade_id": str(uuid4()), "admin_unidade": "sim"},
    ],
)
def test_decodificar_token_com_claims_invalidos_retorna_none(monkeypatch, claims):
    secret = "segredo-com-comprimento-suficiente-para-hs256"
    monkeypatch.setenv("JWT_SECRET_KEY", secret)
    token = jwt.encode(claims, secret, algorithm=ALGORITHM)

    assert decodificar_token(token) is None
