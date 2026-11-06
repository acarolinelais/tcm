from uuid import uuid4

import pytest
from src.domain.entities.link_pull_request import LinkPullRequest

URL_VALIDA = "https://github.sec.samsung.net/org/repo/pull/12"


def test_criar_link_guarda_caso_url_e_autor():
    unidade_id, caso_id, autor_id = uuid4(), uuid4(), uuid4()

    link = LinkPullRequest(unidade_id, caso_id, f"  {URL_VALIDA}  ", autor_id)

    assert link.unidade_id == unidade_id
    assert link.caso_teste_id == caso_id
    assert link.url == URL_VALIDA
    assert link.created_by == autor_id
    assert link.ativo is True


def test_inativar_link_desativa():
    link = LinkPullRequest(uuid4(), uuid4(), URL_VALIDA, uuid4())

    link.inativar()

    assert link.ativo is False


@pytest.mark.parametrize(
    "url",
    [
        URL_VALIDA,
        "https://GitHub.sec.samsung.net/org/repo/pull/12",
        "HTTPS://github.sec.samsung.net/org/repo/pull/12",
        "https://github.sec.samsung.net",
    ],
)
def test_normalizar_url_aceita_https_do_dominio_sem_mudar_o_texto(url):
    assert LinkPullRequest.normalizar_url(url) == url


def test_normalizar_url_aceita_exatamente_o_limite():
    prefixo = "https://github.sec.samsung.net/"
    url = prefixo + "a" * (LinkPullRequest.URL_MAX_LENGTH - len(prefixo))

    assert LinkPullRequest.normalizar_url(url) == url


def test_normalizar_url_recusa_acima_do_limite():
    prefixo = "https://github.sec.samsung.net/"
    url = prefixo + "a" * (LinkPullRequest.URL_MAX_LENGTH - len(prefixo) + 1)

    with pytest.raises(ValueError, match="2000"):
        LinkPullRequest.normalizar_url(url)


@pytest.mark.parametrize("url", ["", "   "])
def test_normalizar_url_recusa_vazio(url):
    with pytest.raises(ValueError, match="obrigatório"):
        LinkPullRequest.normalizar_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "github.sec.samsung.net/org/repo/pull/1",
        "http://github.sec.samsung.net/org/repo/pull/1",
        "ftp://github.sec.samsung.net/x",
        "https://",
        "https://github.sec.samsung.net/org/repo pull/1",
    ],
)
def test_normalizar_url_recusa_formato_invalido(url):
    with pytest.raises(ValueError, match="https válido"):
        LinkPullRequest.normalizar_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/org/repo/pull/1",
        "https://outro.github.sec.samsung.net/org/repo/pull/1",
        "https://github.sec.samsung.net.outro.com/org/repo/pull/1",
        "https://usuario@github.sec.samsung.net/org/repo/pull/1",
        "https://github.sec.samsung.net@outro.com/org/repo/pull/1",
        "https://github.sec.samsung.net:443/org/repo/pull/1",
        "https://github.sec.samsung.net:porta/x",
    ],
)
def test_normalizar_url_recusa_outro_dominio(url):
    with pytest.raises(ValueError, match="github.sec.samsung.net"):
        LinkPullRequest.normalizar_url(url)


def test_reidratacao_mantem_url_que_a_regra_atual_recusaria():
    link = LinkPullRequest(
        uuid4(), uuid4(), "https://github.com/antigo/1", uuid4(), validar_url=False
    )

    assert link.url == "https://github.com/antigo/1"
