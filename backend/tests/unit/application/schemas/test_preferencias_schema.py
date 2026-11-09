import pytest
from pydantic import ValidationError
from src.application.schemas.auth import AtualizarPreferenciasRequest
from src.domain.common.cor_avatar import CorAvatar


@pytest.mark.parametrize(
    ("corpo", "esperado"),
    [
        ({"cor_avatar": "verde"}, {"cor_avatar"}),
        ({"idioma_preferido": "ko"}, {"idioma_preferido"}),
        ({"idioma_preferido": "pt-BR", "cor_avatar": "azul"}, {"idioma_preferido", "cor_avatar"}),
    ],
)
def test_preferencias_aceita_atualizacao_parcial(corpo, esperado):
    request = AtualizarPreferenciasRequest.model_validate(corpo)

    assert request.model_fields_set == esperado


def test_preferencias_aceita_todas_as_cores_da_paleta():
    for cor in CorAvatar:
        assert AtualizarPreferenciasRequest(cor_avatar=cor).cor_avatar == cor


@pytest.mark.parametrize(
    "corpo",
    [
        {},
        {"cor_avatar": None},
        {"idioma_preferido": None, "cor_avatar": "verde"},
        {"cor_avatar": "#ff0000"},
        {"cor_avatar": "dourado"},
        {"cor_avatar": "Verde"},
    ],
)
def test_preferencias_recusa_corpo_vazio_nulo_ou_cor_fora_da_paleta(corpo):
    with pytest.raises(ValidationError):
        AtualizarPreferenciasRequest.model_validate(corpo)
