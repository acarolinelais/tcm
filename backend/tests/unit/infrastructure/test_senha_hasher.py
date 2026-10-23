from src.infrastructure.security.senha_hasher import hash_senha, verificar_senha


def test_verificar_senha_correta_retorna_true():
    senha_hash = hash_senha("senha-forte-123")

    assert verificar_senha("senha-forte-123", senha_hash) is True


def test_verificar_senha_incorreta_retorna_false():
    senha_hash = hash_senha("senha-forte-123")

    assert verificar_senha("senha-errada", senha_hash) is False


def test_hash_nunca_e_igual_a_senha_em_texto_puro():
    senha_hash = hash_senha("senha-forte-123")

    assert senha_hash != "senha-forte-123"
