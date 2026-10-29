from collections.abc import Sequence
from typing import Protocol
from uuid import UUID

from src.application.schemas.form_factor import (
    CriarRodadaFormFactorLoteRequest,
    CriarRodadaFormFactorRequest,
    EnviarResultadosRodadaRequest,
    FormFactorExecucaoResponse,
    FormFactorResponse,
    FormFactorResultadosResponse,
    RodadaFormFactorCasosResponse,
    RodadaFormFactorResponse,
)
from src.application.schemas.form_factor_historico import (
    HistoricoProjetoResponse,
    ResumoExecucoesResponse,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class FormFactorService(Protocol):
    async def historico_projeto(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        busca: str | None = None,
        tc_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        dia: str | None = None,
        semana: str | None = None,
        fuso_horario: str = "UTC",
        page: int = 1,
        page_size: int = 20,
    ) -> HistoricoProjetoResponse: ...

    async def resumo_execucoes(
        self, usuario_atual: UsuarioAutenticado, caso_teste_id: UUID, fuso_horario: str = "UTC"
    ) -> ResumoExecucoesResponse: ...

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        responsavel_ids: Sequence[UUID] | None = None,
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
        responsavel_ids: Sequence[UUID] | None = None,
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

    async def criar_rodada(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        request: CriarRodadaFormFactorLoteRequest,
    ) -> RodadaFormFactorResponse: ...

    async def listar_casos_rodada(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        rodada_id: UUID,
        page: int,
        page_size: int,
    ) -> RodadaFormFactorCasosResponse: ...

    async def registrar_resultados_rodada(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        rodada_id: UUID,
        caso_teste_id: UUID,
        request: EnviarResultadosRodadaRequest,
    ) -> FormFactorExecucaoResponse: ...
