from uuid import uuid4

from src.domain.entities.usuario import Usuario
from src.infrastructure.security.jwt import criar_token, decodificar_token


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
