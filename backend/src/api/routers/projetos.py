from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile

from src.api.dependencies import (
    get_caso_teste_service,
    get_form_factor_service,
    get_importacao_projeto_service,
    get_importacao_sdf_service,
    get_projeto_service,
    get_usuario_atual,
)
from src.application.schemas.caso_teste import CasoTesteResponse, CriarCasoTesteRequest
from src.application.schemas.form_factor import FormFactorResponse
from src.application.schemas.importacao_projeto import (
    ImportarProjetoPlanilhaRequest,
    ImportarProjetoPlanilhaResponse,
)
from src.application.schemas.importacao_sdf import ImportarRelatorioSdfResponse
from src.application.schemas.projeto import (
    AtualizarProjetoRequest,
    AtualizarStatusProjetoRequest,
    CriarProjetoRequest,
    ProjetoResponse,
)
from src.application.services.interfaces.caso_teste_service import CasoTesteService
from src.application.services.interfaces.form_factor_service import FormFactorService
from src.application.services.interfaces.importacao_projeto_service import ImportacaoProjetoService
from src.application.services.interfaces.importacao_sdf_service import ImportacaoSdfService
from src.application.services.interfaces.projeto_service import ProjetoService
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado

router = APIRouter(prefix="/api/projetos", tags=["projetos"])


@router.get("", response_model=PagedResult[ProjetoResponse])
async def listar_projetos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ProjetoService = Depends(get_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, page, page_size)


@router.post("", response_model=ProjetoResponse, status_code=201)
async def criar_projeto(
    request: CriarProjetoRequest,
    response: Response,
    service: ProjetoService = Depends(get_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    projeto = await service.criar(usuario_atual, request)
    response.headers["Location"] = f"/api/projetos/{projeto.id}"
    return projeto


@router.post("/importar", response_model=ImportarProjetoPlanilhaResponse, status_code=201)
async def importar_projeto(
    arquivo: Annotated[UploadFile, File()],
    time_id: Annotated[UUID, Form()],
    modelos_ids: Annotated[list[UUID] | None, Form()] = None,
    service: ImportacaoProjetoService = Depends(get_importacao_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    conteudo = await arquivo.read()
    return await service.importar(
        usuario_atual,
        ImportarProjetoPlanilhaRequest(time_id=time_id, modelos_ids=modelos_ids or []),
        conteudo,
    )


@router.get("/{projeto_id}", response_model=ProjetoResponse)
async def obter_projeto(
    projeto_id: UUID,
    service: ProjetoService = Depends(get_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.obter(usuario_atual, projeto_id)


@router.put("/{projeto_id}", response_model=ProjetoResponse)
async def atualizar_projeto(
    projeto_id: UUID,
    request: AtualizarProjetoRequest,
    service: ProjetoService = Depends(get_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar(usuario_atual, projeto_id, request)


@router.delete("/{projeto_id}", status_code=204)
async def excluir_projeto(
    projeto_id: UUID,
    service: ProjetoService = Depends(get_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    await service.excluir(usuario_atual, projeto_id)
    return Response(status_code=204)


@router.patch("/{projeto_id}/status", response_model=ProjetoResponse)
async def atualizar_status_projeto(
    projeto_id: UUID,
    request: AtualizarStatusProjetoRequest,
    service: ProjetoService = Depends(get_projeto_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.atualizar_status(usuario_atual, projeto_id, request)


@router.get("/{projeto_id}/test-cases", response_model=PagedResult[CasoTesteResponse])
async def listar_test_cases(
    projeto_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, projeto_id, page, page_size)


@router.post("/{projeto_id}/test-cases", response_model=CasoTesteResponse, status_code=201)
async def criar_test_case(
    projeto_id: UUID,
    request: CriarCasoTesteRequest,
    response: Response,
    service: CasoTesteService = Depends(get_caso_teste_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    caso = await service.criar(usuario_atual, projeto_id, request)
    response.headers["Location"] = f"/api/test-cases/{caso.id}"
    return caso


@router.post(
    "/{projeto_id}/relatorios-sdf",
    response_model=ImportarRelatorioSdfResponse,
    status_code=201,
)
async def importar_relatorio_sdf(
    projeto_id: UUID,
    arquivo: Annotated[UploadFile, File()],
    service: ImportacaoSdfService = Depends(get_importacao_sdf_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.importar(usuario_atual, projeto_id, await arquivo.read())


@router.get("/{projeto_id}/form-factor", response_model=FormFactorResponse)
async def listar_form_factor(
    projeto_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    semana: str | None = Query(None, pattern=r"^\d{4}-W\d{2}$"),
    one_ui: str | None = Query(None, max_length=40),
    service: FormFactorService = Depends(get_form_factor_service),
    usuario_atual: UsuarioAutenticado = Depends(get_usuario_atual),
):
    return await service.listar(usuario_atual, projeto_id, page, page_size, semana, one_ui)
