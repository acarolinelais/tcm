from src.domain.entities.usuario import Usuario


def test_criar_usuario_fica_ativo_por_padrao_com_email_normalizado():
    usuario = Usuario("Ana", "  ANA@Example.com ")

    assert usuario.nome == "Ana"
    assert usuario.email == "ana@example.com"
    assert usuario.ativo is True


def test_atualizar_troca_nome_e_email():
    usuario = Usuario("Ana", "ana@example.com")

    usuario.atualizar("Ana Paula", "anapaula@example.com")

    assert usuario.nome == "Ana Paula"
    assert usuario.email == "anapaula@example.com"


def test_inativar_marca_usuario_como_inativo():
    usuario = Usuario("Ana", "ana@example.com")

    usuario.inativar()

    assert usuario.ativo is False
