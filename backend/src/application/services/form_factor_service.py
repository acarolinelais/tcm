from uuid import UUID

from src.application.schemas.form_factor import FormFactorResponse, to_response
from src.application.validators.semana import intervalo_semana_iso as _intervalo_semana_iso
from src.domain.common.exceptions import (
    ForbiddenException,
    NotFoundException,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.projeto_modelo_repository import ProjetoModeloRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.resultado_form_factor_repository import (
    ResultadoFormFactorRepository,
)
from src.domain.entities.interfaces.time_repository import TimeRepository


class FormFactorServiceImpl:
    def __init__(
        self,
        projeto_repo: ProjetoRepository,
        time_repo: TimeRepository,
        resultado_repo: ResultadoFormFactorRepository,
        projeto_modelo_repo: ProjetoModeloRepository,
    ) -> None:
        self._projeto_repo = projeto_repo
        self._time_repo = time_repo
        self._resultado_repo = resultado_repo
        self._projeto_modelo_repo = projeto_modelo_repo

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        page: int,
        page_size: int,
        semana: str | None = None,
        responsavel_id: UUID | None = None,
    ) -> FormFactorResponse:
        if not usuario_atual.pode("form_factor.consultar"):
            raise ForbiddenException("Você não tem permissão para consultar Form Factor.")
        projeto = await self._projeto_repo.obter_por_id(usuario_atual.unidade_id, projeto_id)
        if projeto is None:
            raise NotFoundException("Projeto não encontrado.")
        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, projeto.time_id)
        permitido = usuario_atual.eh_administrador or (
            time is not None
            and (
                usuario_atual.perfil_codigo == "GERENTE"
                and time.setor_id in usuario_atual.setores_gerenciados
                or time.id in usuario_atual.time_ids
            )
        )
        if not permitido or time is None:
            raise NotFoundException("Projeto não encontrado.")
        inicio, fim = _intervalo_semana_iso(semana)
        dados = await self._resultado_repo.listar_form_factor_por_projeto(
            usuario_atual.unidade_id,
            projeto.id,
            page,
            page_size,
            inicio,
            fim,
            responsavel_id,
        )
        modelos = await self._projeto_modelo_repo.listar_modelos_do_projeto(
            usuario_atual.unidade_id, projeto.id
        )
        return to_response(modelos, dados)
