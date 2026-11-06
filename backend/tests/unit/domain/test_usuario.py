from uuid import uuid4

from src.domain.entities.usuario import Usuario


def test_criar_usuario_fica_ativo_por_padrao_com_email_normalizado():
    unidade_id = uuid4()

    usuario = Usuario(unidade_id, "Ana", "  ANA@Example.com ")

    assert usuario.unidade_id == unidade_id
    assert usuario.nome == "Ana"
    assert usuario.email == "ana@example.com"
    assert usuario.ativo is True
    assert usuario.perfil_id is None
    assert usuario.responsavel_id is None
    assert usuario.senha_hash is None


def test_atualizar_troca_nome_e_email():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")

    usuario.atualizar("Ana Paula", "anapaula@example.com")

    assert usuario.nome == "Ana Paula"
    assert usuario.email == "anapaula@example.com"


def test_user_id_e_opcional_e_preserva_capitalizacao_sem_espacos_externos():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com", user_id="  User-123  ")

    assert usuario.user_id == "User-123"


def test_atualizar_nome_e_email_preserva_user_id():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com", user_id="USR-123")

    usuario.atualizar("Ana Paula", "anapaula@example.com")

    assert usuario.user_id == "USR-123"


def test_definir_user_id_vazio_limpa_o_valor():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com", user_id="USR-123")

    usuario.definir_user_id("   ")

    assert usuario.user_id is None


def test_inativar_marca_usuario_como_inativo():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")

    usuario.inativar()

    assert usuario.ativo is False


def test_definir_senha_hash_guarda_o_hash():
    usuario = Usuario(uuid4(), "Ana", "ana@example.com")

    usuario.definir_senha_hash("hash-fake")

    assert usuario.senha_hash == "hash-fake"
