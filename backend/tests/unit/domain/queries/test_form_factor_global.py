from datetime import datetime
from uuid import uuid4

from src.domain.queries.form_factor_linha import (
    FormFactorExecucaoLinhaGlobal,
    FormFactorLinhaGlobal,
    FormFactorModeloGlobal,
)


def test_linhas_globais_carregam_projeto_e_modelos_aplicaveis():
    projeto_id, caso_id, responsavel_id, modelo_id = (uuid4() for _ in range(4))
    data = datetime(2026, 10, 25)

    resumo = FormFactorLinhaGlobal(
        projeto_id,
        "Keyboard 9.8",
        caso_id,
        "TC-001",
        responsavel_id,
        (modelo_id,),
        "SDF-1",
        data,
        {modelo_id: "PASS"},
    )
    execucao = FormFactorExecucaoLinhaGlobal(
        uuid4(),
        projeto_id,
        "Keyboard 9.8",
        caso_id,
        "TC-001",
        responsavel_id,
        (modelo_id,),
        "SDF-1",
        data,
        "SDF",
        {modelo_id: "FAIL"},
    )

    assert resumo.projeto_id == execucao.projeto_id == projeto_id
    assert resumo.modelos_ids == execucao.modelos_ids == (modelo_id,)
    assert FormFactorModeloGlobal(modelo_id, "SM-123").nome == "SM-123"
