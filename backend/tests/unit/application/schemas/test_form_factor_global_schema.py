from datetime import datetime
from uuid import uuid4

from src.application.schemas.form_factor import (
    to_global_response,
    to_global_resultados_response,
)
from src.domain.common.paged_result import PagedResult
from src.domain.queries.form_factor_linha import (
    FormFactorExecucaoLinhaGlobal,
    FormFactorLinhaGlobal,
    FormFactorModeloGlobal,
    FormFactorResponsavelGlobal,
)


def test_serializa_resumo_global_com_projeto_modelos_aplicaveis_e_resultados():
    projeto_id, caso_id, responsavel_id, modelo_id = (uuid4() for _ in range(4))
    linha = FormFactorLinhaGlobal(
        projeto_id,
        "Keyboard 9.8",
        caso_id,
        "TC-1",
        responsavel_id,
        (modelo_id,),
        "SDF-1",
        datetime(2026, 10, 25),
        {modelo_id: "PASS"},
    )

    response = to_global_response(
        (FormFactorModeloGlobal(modelo_id, "SM-123"),),
        (FormFactorResponsavelGlobal(responsavel_id, "ana.souza"),),
        PagedResult([linha], 1, 20, 1),
    )

    assert response.modelos[0].nome == "SM-123"
    assert response.items[0].projeto_nome == "Keyboard 9.8"
    assert response.items[0].modelos_ids == (modelo_id,)
    assert response.items[0].resultados == {modelo_id: "PASS"}


def test_serializa_historico_global_sem_perder_origem_e_execucao():
    projeto_id, caso_id, responsavel_id, modelo_id, execucao_id = (uuid4() for _ in range(5))
    linha = FormFactorExecucaoLinhaGlobal(
        execucao_id,
        projeto_id,
        "Keyboard 9.8",
        caso_id,
        "TC-1",
        responsavel_id,
        (modelo_id,),
        None,
        datetime(2026, 10, 25),
        "MANUAL",
        {modelo_id: "FAIL"},
    )

    response = to_global_resultados_response(
        (FormFactorModeloGlobal(modelo_id, "SM-123"),),
        (FormFactorResponsavelGlobal(responsavel_id, "ana.souza"),),
        PagedResult([linha], 1, 20, 1),
    )

    assert response.items[0].execucao_id == execucao_id
    assert response.items[0].origem == "MANUAL"
    assert response.items[0].resultados == {modelo_id: "FAIL"}
