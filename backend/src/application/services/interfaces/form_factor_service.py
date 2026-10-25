from typing import Protocol
from uuid import UUID

from src.application.schemas.form_factor import (
    CriarRodadaFormFactorRequest,
    FormFactorExecucaoResponse,
    FormFactorGlobalResponse,
    FormFactorResponse,
    FormFactorResultadosGlobaisResponse,
    FormFactorResultadosResponse,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class FormFactorService(Protocol):
    async def listar_global(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        semana: str | None = None,
        projeto_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> FormFactorGlobalResponse: ...

    async def listar_resultados_global(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        semana: str | None = None,
        projeto_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> FormFactorResultadosGlobaisResponse: ...

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> FormFactorResponse: ...

    async def listar_resultados(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> FormFactorResultadosResponse: ...

    async def criar_rodada_manual(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: CriarRodadaFormFactorRequest,
    ) -> FormFactorExecucaoResponse: ...
