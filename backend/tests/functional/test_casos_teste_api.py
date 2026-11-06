from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from src.api.dependencies import get_caso_teste_service, get_usuario_atual
from src.application.schemas.caso_teste import CasoTesteDetalheResponse, CasoTesteResponse
from src.application.schemas.link_pull_request import (
    LinkPullRequestResponse,
    LinksPullRequestResponse,
)
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.entities.projeto import Projeto
from src.domain.entities.time import Time
from tests.functional.conftest import dependency_override


def _caso(usuario, projeto_id, automation_level=None):
    return CasoTesteResponse(
        id=uuid4(),
        unidade_id=usuario.unidade_id,
        projeto_id=projeto_id,
        tc_id="Clock_001",
        category="A",
        difficulty="Low",
        automation_level=automation_level,
        situation="New",
        status="To-Do",
        responsavel_id=uuid4(),
        backup_id=uuid4(),
        justificativa_exclusao=None,
        code_done_em=None,
        all_passed_em=None,
        ativo=True,
        created_at=None,
        updated_at=None,
    )


def _detalhe(usuario, projeto_id, **textos):
    vazios = dict.fromkeys(("title", "precondition", "procedure", "expected_result"))
    return CasoTesteDetalheResponse(
        **_caso(usuario, projeto_id).model_dump(), **{**vazios, **textos}
    )


async def test_criar_test_case_retorna_location(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.criar.return_value = _caso(usuario, projeto_id)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{projeto_id}/test-cases",
        json={
            "tc_id": "Clock_001",
            "category": "A",
            "difficulty": "Low",
            "situation": "New",
            "responsavel_id": str(uuid4()),
            "backup_id": str(uuid4()),
        },
    )

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/test-cases/{response.json()['id']}"
    assert response.json()["situation"] == "New"
    assert response.json()["status"] == "To-Do"


async def test_criar_test_case_sem_situation_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{uuid4()}/test-cases",
        json={
            "tc_id": "Clock_001",
            "category": "A",
            "difficulty": "Low",
            "situation": "To-Do",
            "responsavel_id": str(uuid4()),
            "backup_id": str(uuid4()),
        },
    )

    assert response.status_code == 422
    assert any("situation" in erro["campo"] for erro in response.json()["errors"])
    service.criar.assert_not_awaited()


def _usar_service_real_com_caso(caso_do_membro: bool):
    """Autentica um membro sem gestão e usa o service real com um caso dele ou de outra pessoa."""
    from src.api.main import app

    unidade_id, time_id, setor_id = uuid4(), uuid4(), uuid4()
    membro = UsuarioAutenticado(
        uuid4(),
        unidade_id,
        "USUARIO_PADRAO",
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time_id,),
    )
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    time = Time(unidade_id, setor_id, "Clock", uuid4())
    time.id = time_id
    caso = CasoTeste(
        unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        membro.id if caso_do_membro else uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    caso_repo.obter_por_id.return_value = caso
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, AsyncMock(), uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(membro)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)
    return caso, uow


async def test_responsavel_altera_situation_mas_nao_o_backup(api_client):
    caso, _ = _usar_service_real_com_caso(caso_do_membro=True)
    backup_original = caso.backup_id

    permitido = await api_client.put(f"/api/test-cases/{caso.id}", json={"situation": "New Step"})
    negado = await api_client.put(f"/api/test-cases/{caso.id}", json={"backup_id": str(uuid4())})

    assert permitido.status_code == 200
    assert permitido.json()["situation"] == "New Step"
    assert negado.status_code == 403
    assert caso.backup_id == backup_original


async def test_responsavel_nao_altera_category_e_admin_altera(api_client):
    from src.api.main import app

    caso, uow = _usar_service_real_com_caso(caso_do_membro=True)

    negado = await api_client.put(f"/api/test-cases/{caso.id}", json={"category": "C"})

    assert negado.status_code == 403
    assert caso.category is CategoriaCasoTeste.A
    uow.commit.assert_not_awaited()

    admin = UsuarioAutenticado(uuid4(), caso.unidade_id, "ADMIN_UNIDADE")
    app.dependency_overrides[get_usuario_atual] = dependency_override(admin)
    permitido = await api_client.put(f"/api/test-cases/{caso.id}", json={"category": "C"})

    assert permitido.status_code == 200
    assert permitido.json()["category"] == "C"


async def test_responsavel_volta_o_status_para_to_do(api_client):
    caso, uow = _usar_service_real_com_caso(caso_do_membro=True)
    caso.atualizar_campos_do_responsavel(
        StatusCasoTeste.IN_PROGRESS, caso.category, caso.difficulty
    )

    response = await api_client.put(f"/api/test-cases/{caso.id}", json={"status": "To-Do"})

    assert response.status_code == 200
    assert caso.status is StatusCasoTeste.TO_DO
    uow.commit.assert_awaited_once()


async def test_excluir_com_justificativa_retorna_200(api_client):
    caso, uow = _usar_service_real_com_caso(caso_do_membro=True)

    response = await api_client.put(
        f"/api/test-cases/{caso.id}",
        json={"status": "Cancelled", "justificativa_exclusao": " Depende de hardware "},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Cancelled"
    assert response.json()["justificativa_exclusao"] == "Depende de hardware"
    uow.commit.assert_awaited_once()


@pytest.mark.parametrize(
    "corpo",
    [
        {"status": "Cancelled"},
        {"status": "Cancelled", "justificativa_exclusao": "   "},
        {"status": "Cancelled", "justificativa_exclusao": "x" * 501},
        {"status": "To-Do", "justificativa_exclusao": "Fora do escopo"},
    ],
)
async def test_excluir_sem_justificativa_valida_retorna_422(api_client, corpo):
    caso, uow = _usar_service_real_com_caso(caso_do_membro=True)

    response = await api_client.put(f"/api/test-cases/{caso.id}", json=corpo)

    assert response.status_code == 422
    assert caso.status is StatusCasoTeste.TO_DO
    assert caso.justificativa_exclusao is None
    uow.commit.assert_not_awaited()


async def test_atualizar_status_invalido_retorna_422(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(f"/api/test-cases/{uuid4()}", json={"status": "Validation"})

    assert response.status_code == 422
    assert any("status" in erro["campo"] for erro in response.json()["errors"])
    service.atualizar.assert_not_awaited()


async def test_membro_nao_altera_status_de_caso_alheio_para_in_validation(api_client):
    caso, uow = _usar_service_real_com_caso(caso_do_membro=False)

    response = await api_client.put(f"/api/test-cases/{caso.id}", json={"status": "InValidation"})

    assert response.status_code == 403
    uow.commit.assert_not_awaited()


async def test_listar_test_cases_retorna_paginacao(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 20, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{projeto_id}/test-cases")

    assert response.status_code == 200
    assert response.json()["page_size"] == 20
    service.listar.assert_awaited_once_with(usuario, projeto_id, 1, 20, None, False)


async def test_listar_test_cases_repassa_filtro_de_responsavel(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    projeto_id = uuid4()
    ana, bruno = uuid4(), uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult([], 1, 20, 0)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    # Seleção múltipla: o parâmetro se repete na URL e chega ao service como lista.
    response = await api_client.get(
        f"/api/projetos/{projeto_id}/test-cases?responsavel_id={ana}&responsavel_id={bruno}"
    )

    assert response.status_code == 200
    service.listar.assert_awaited_once_with(usuario, projeto_id, 1, 20, [ana, bruno], False)


async def test_obter_test_case_retorna_200(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _detalhe(usuario, uuid4())
    service = AsyncMock()
    service.obter.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 200
    assert response.json()["tc_id"] == "Clock_001"


@pytest.mark.parametrize("campo", ["code_done_em", "all_passed_em"])
async def test_atualizar_datas_de_finalizacao_retorna_422(api_client, campo):
    # Spec 065, CA-14: as duas datas são do sistema, nenhum perfil as envia.
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(
        f"/api/test-cases/{uuid4()}", json={"status": "InReview", campo: "2026-11-01T10:00:00Z"}
    )

    assert response.status_code == 422
    service.atualizar.assert_not_awaited()


async def test_atualizar_test_case_devolve_as_datas_de_finalizacao(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _caso(usuario, uuid4()).model_copy(
        update={"code_done_em": datetime(2026, 11, 1, 10, tzinfo=UTC)}
    )
    service = AsyncMock()
    service.atualizar.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(f"/api/test-cases/{caso.id}", json={"status": "InReview"})

    assert response.status_code == 200
    assert response.json()["code_done_em"] == "2026-11-01T10:00:00Z"
    assert response.json()["all_passed_em"] is None


async def test_atualizar_test_case_usa_put_e_repassa_payload(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _caso(usuario, uuid4())
    service = AsyncMock()
    service.atualizar.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(f"/api/test-cases/{caso.id}", json={"status": "InProgress"})

    assert response.status_code == 200
    service.atualizar.assert_awaited_once()


async def test_atualizar_test_case_repassa_automation_level_e_devolve_o_nivel(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _caso(usuario, uuid4(), automation_level=2)
    service = AsyncMock()
    service.atualizar.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(f"/api/test-cases/{caso.id}", json={"automation_level": 2})

    assert response.status_code == 200
    assert response.json()["automation_level"] == 2
    request = service.atualizar.await_args.args[2]
    assert request.automation_level == 2


@pytest.mark.parametrize("nivel", [0, 4, -1, 1.5, 2.0, "2", "abc", True])
async def test_atualizar_automation_level_invalido_retorna_422(api_client, nivel):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.put(f"/api/test-cases/{uuid4()}", json={"automation_level": nivel})

    assert response.status_code == 422
    service.atualizar.assert_not_awaited()


async def test_obter_test_case_sem_nivel_devolve_automation_level_nulo(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso = _detalhe(usuario, uuid4())
    service = AsyncMock()
    service.obter.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 200
    assert response.json()["automation_level"] is None


def _payload_criar(**extra):
    return {
        "tc_id": "Clock_001",
        "category": "A",
        "difficulty": "Low",
        "situation": "New",
        "responsavel_id": str(uuid4()),
        "backup_id": str(uuid4()),
        **extra,
    }


@pytest.mark.parametrize("nivel", [None, 1, 3])
async def test_criar_test_case_com_ou_sem_automation_level_retorna_201(api_client, nivel):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.criar.return_value = _caso(usuario, projeto_id, automation_level=nivel)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)
    extra = {} if nivel is None else {"automation_level": nivel}

    response = await api_client.post(
        f"/api/projetos/{projeto_id}/test-cases", json=_payload_criar(**extra)
    )

    assert response.status_code == 201
    assert response.json()["automation_level"] == nivel
    assert service.criar.await_args.args[2].automation_level == nivel


@pytest.mark.parametrize("nivel", [0, 5, "3", 3.0, "abc", True])
async def test_criar_test_case_com_automation_level_invalido_retorna_422(api_client, nivel):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.post(
        f"/api/projetos/{uuid4()}/test-cases", json=_payload_criar(automation_level=nivel)
    )

    assert response.status_code == 422
    service.criar.assert_not_awaited()


async def test_transferir_test_case_para_backup(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "USUARIO_PADRAO")
    caso = _caso(usuario, uuid4())
    caso = caso.model_copy(update={"responsavel_id": uuid4(), "backup_id": None})
    service = AsyncMock()
    service.transferir_para_backup.return_value = caso
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.patch(f"/api/test-cases/{caso.id}/transferir-para-backup")

    assert response.status_code == 200
    assert response.json()["backup_id"] is None


async def test_gerente_nao_consulta_test_case_de_outro_setor(api_client):
    from src.api.main import app

    unidade_id, usuario_id, setor_id, time_id = (uuid4() for _ in range(4))
    gerente = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"test_cases.consultar"}),
        setores_gerenciados=(uuid4(),),
    )
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    caso_repo.obter_por_id.return_value = caso
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = Time(unidade_id, setor_id, "Outro setor", usuario_id)
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, AsyncMock(), uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 404


async def test_gerente_membro_do_time_consulta_test_case_de_outro_setor(api_client):
    from src.api.main import app

    unidade_id, usuario_id, time_id = (uuid4() for _ in range(3))
    gerente = UsuarioAutenticado(
        usuario_id,
        unidade_id,
        "GERENTE",
        permissoes=frozenset({"test_cases.consultar"}),
        setores_gerenciados=(uuid4(),),
        time_ids=(time_id,),
    )
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
    )
    time = Time(unidade_id, uuid4(), "Time de outro setor", uuid4())
    time.id = time_id
    caso_repo.obter_por_id.return_value = caso
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, AsyncMock(), uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(gerente)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 200
    assert response.json()["tc_id"] == "Clock_001"


async def test_test_case_de_outra_unidade_nao_e_encontrado(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    caso_repo.obter_por_id.return_value = None
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, AsyncMock(), uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{uuid4()}")

    assert response.status_code == 404
    caso_repo.obter_por_id.assert_awaited_once()
    assert caso_repo.obter_por_id.await_args.args[0] == usuario.unidade_id


@pytest.mark.parametrize("perfil", ["DEV", "KP", "GERENTE"])
async def test_obter_test_case_devolve_os_textos_da_planilha(api_client, perfil):
    from src.api.main import app

    unidade_id, time_id = uuid4(), uuid4()
    usuario = UsuarioAutenticado(
        uuid4(),
        unidade_id,
        perfil,
        permissoes=frozenset({"test_cases.consultar"}),
        time_ids=(time_id,),
    )
    caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, uow = (
        AsyncMock() for _ in range(6)
    )
    projeto = Projeto(unidade_id, time_id, "Clock", "9.5")
    caso = CasoTeste(
        unidade_id,
        projeto.id,
        "Clock_001",
        CategoriaCasoTeste.A,
        DificuldadeCasoTeste.LOW,
        uuid4(),
        uuid4(),
        SituacaoCasoTeste.NEW,
        title="Check Writing style",
        procedure="1. Messages\n2-1. Select Shorten",
    )
    time = Time(unidade_id, uuid4(), "Time", uuid4())
    time.id = time_id
    caso_repo.obter_por_id.return_value = caso
    projeto_repo.obter_por_id.return_value = projeto
    time_repo.obter_por_id.return_value = time
    service = CasoTesteServiceImpl(
        caso_repo, projeto_repo, time_repo, membro_repo, usuario_repo, AsyncMock(), uow
    )
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/test-cases/{caso.id}")

    assert response.status_code == 200
    corpo = response.json()
    assert corpo["title"] == "Check Writing style"
    assert corpo["procedure"] == "1. Messages\n2-1. Select Shorten"
    assert corpo["precondition"] is None
    assert corpo["expected_result"] is None


async def test_listar_test_cases_nao_traz_os_textos_da_planilha(api_client):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    projeto_id = uuid4()
    service = AsyncMock()
    service.listar.return_value = PagedResult([_caso(usuario, projeto_id)], 1, 20, 1)
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    response = await api_client.get(f"/api/projetos/{projeto_id}/test-cases")

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert {"title", "precondition", "procedure", "expected_result"}.isdisjoint(item)


@pytest.mark.parametrize("campo", ["title", "precondition", "procedure", "expected_result"])
async def test_criar_ou_atualizar_com_texto_da_planilha_retorna_422(api_client, campo):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), "ADMIN_UNIDADE")
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)

    criar = await api_client.post(
        f"/api/projetos/{uuid4()}/test-cases", json=_payload_criar(**{campo: "outro"})
    )
    atualizar = await api_client.put(
        f"/api/test-cases/{uuid4()}", json={"category": "B", campo: "outro"}
    )

    assert criar.status_code == 422
    assert atualizar.status_code == 422
    service.criar.assert_not_awaited()
    service.atualizar.assert_not_awaited()


# Spec 030: links de PR do Test Case.
URL_PR = "https://github.sec.samsung.net/org/repo/pull/12"


def _link_response(caso_id, autor_id):
    return LinkPullRequestResponse(
        id=uuid4(),
        caso_teste_id=caso_id,
        url=URL_PR,
        created_at=datetime(2026, 10, 28, 12, 0, tzinfo=UTC),
        created_by=autor_id,
        created_by_nome="Ana",
    )


def _usar_service_simulado(perfil="USUARIO_PADRAO"):
    from src.api.main import app

    usuario = UsuarioAutenticado(uuid4(), uuid4(), perfil)
    service = AsyncMock()
    app.dependency_overrides[get_usuario_atual] = dependency_override(usuario)
    app.dependency_overrides[get_caso_teste_service] = dependency_override(service)
    return usuario, service


async def test_listar_links_de_pr_retorna_itens_e_permissao(api_client):
    usuario, service = _usar_service_simulado()
    caso_id = uuid4()
    service.listar_pull_requests.return_value = LinksPullRequestResponse(
        itens=[_link_response(caso_id, usuario.id)], pode_remover=False
    )

    response = await api_client.get(f"/api/test-cases/{caso_id}/pull-requests")

    assert response.status_code == 200
    assert response.json()["pode_remover"] is False
    assert response.json()["itens"][0]["url"] == URL_PR
    assert response.json()["itens"][0]["created_by_nome"] == "Ana"
    service.listar_pull_requests.assert_awaited_once_with(usuario, caso_id)


async def test_adicionar_link_de_pr_retorna_201_com_o_autor(api_client):
    usuario, service = _usar_service_simulado()
    caso_id = uuid4()
    service.adicionar_pull_request.return_value = _link_response(caso_id, usuario.id)

    response = await api_client.post(
        f"/api/test-cases/{caso_id}/pull-requests", json={"url": f" {URL_PR} "}
    )

    assert response.status_code == 201
    assert response.json()["created_by"] == str(usuario.id)
    assert response.json()["created_by_nome"] == "Ana"
    request = service.adicionar_pull_request.call_args.args[2]
    assert request.url == URL_PR


@pytest.mark.parametrize(
    "corpo",
    [
        {"url": "github.sec.samsung.net/org/repo/pull/1"},
        {"url": "http://github.sec.samsung.net/org/repo/pull/1"},
        {"url": "https://github.com/org/repo/pull/1"},
        {"url": "https://outro.github.sec.samsung.net/org/repo/pull/1"},
        {"url": "https://github.sec.samsung.net/" + "a" * 2000},
        {"url": "   "},
        {},
        {"url": URL_PR, "created_by": "00000000-0000-0000-0000-000000000000"},
    ],
)
async def test_adicionar_link_de_pr_invalido_retorna_422_sem_chamar_o_service(api_client, corpo):
    _, service = _usar_service_simulado()

    response = await api_client.post(f"/api/test-cases/{uuid4()}/pull-requests", json=corpo)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    service.adicionar_pull_request.assert_not_awaited()


async def test_remover_link_de_pr_retorna_204(api_client):
    usuario, service = _usar_service_simulado("KP")
    caso_id, link_id = uuid4(), uuid4()

    response = await api_client.patch(f"/api/test-cases/{caso_id}/pull-requests/{link_id}/inativar")

    assert response.status_code == 204
    service.remover_pull_request.assert_awaited_once_with(usuario, caso_id, link_id)


@pytest.mark.parametrize(
    ("metodo", "erro", "status"),
    [
        ("adicionar_pull_request", ConflictException("Este link de PR já está registrado."), 409),
        ("remover_pull_request", ForbiddenException("Sem permissão para remover."), 403),
        ("remover_pull_request", NotFoundException("Link de PR não encontrado."), 404),
        ("listar_pull_requests", NotFoundException("Test Case não encontrado."), 404),
    ],
)
async def test_erros_dos_links_de_pr_saem_como_problem_details(api_client, metodo, erro, status):
    _, service = _usar_service_simulado()
    getattr(service, metodo).side_effect = erro
    caso_id = uuid4()
    chamadas = {
        "listar_pull_requests": lambda: api_client.get(f"/api/test-cases/{caso_id}/pull-requests"),
        "adicionar_pull_request": lambda: api_client.post(
            f"/api/test-cases/{caso_id}/pull-requests", json={"url": URL_PR}
        ),
        "remover_pull_request": lambda: api_client.patch(
            f"/api/test-cases/{caso_id}/pull-requests/{uuid4()}/inativar"
        ),
    }

    response = await chamadas[metodo]()

    assert response.status_code == status
    assert response.headers["content-type"].startswith("application/problem+json")
    # O 403 do projeto não detalha o motivo; os demais repetem a mensagem do service.
    assert response.json().get("detail") == (None if status == 403 else str(erro))


async def test_rotas_de_links_de_pr_aparecem_no_openapi(api_client):
    response = await api_client.get("/openapi.json")

    caminhos = response.json()["paths"]
    assert {"get", "post"} <= set(caminhos["/api/test-cases/{caso_id}/pull-requests"])
    assert "patch" in caminhos["/api/test-cases/{caso_id}/pull-requests/{link_id}/inativar"]
