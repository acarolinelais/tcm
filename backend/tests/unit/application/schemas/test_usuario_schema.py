import pytest
from pydantic import ValidationError
from src.application.schemas.usuario import CriarUsuarioRequest


def test_criar_usuario_request_aceita_dados_validos():
    request = CriarUsuarioRequest(nome="Ana", email="ana@example.com")

    assert request.nome == "Ana"
    assert request.email == "ana@example.com"


def test_criar_usuario_request_rejeita_email_invalido():
    with pytest.raises(ValidationError):
        CriarUsuarioRequest(nome="Ana", email="nao-e-email")


def test_criar_usuario_request_rejeita_nome_vazio():
    with pytest.raises(ValidationError):
        CriarUsuarioRequest(nome="", email="ana@example.com")
