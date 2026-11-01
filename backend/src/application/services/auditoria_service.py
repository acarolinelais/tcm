from collections.abc import Sequence
from datetime import UTC
from uuid import UUID

from src.application.schemas.auditoria import (
    RegistroAuditoriaResponse,
    to_registro_auditoria_response,
)
from src.application.schemas.historico_caso_teste import ids_de_usuarios
from src.application.validators.semana import fuso_horario_valido, intervalo_dia
from src.domain.common.exceptions import ForbiddenException, InvalidInputException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.auditoria_repository import AuditoriaRepository
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.queries.auditoria import AcaoAuditoria, FiltrosAuditoria, OrigemAuditoria


class AuditoriaServiceImpl:
    def __init__(
        self, auditoria_repo: AuditoriaRepository, usuario_repo: UsuarioRepository
    ) -> None:
        self._auditoria_repo = auditoria_repo
        self._usuario_repo = usuario_repo

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        *,
        data_inicio: str | None = None,
        data_fim: str | None = None,
        fuso_horario: str = "UTC",
        usuario_ids: Sequence[UUID] = (),
        perfil: str | None = None,
        acao: AcaoAuditoria | None = None,
        tc_id: str | None = None,
        projeto_id: UUID | None = None,
        origem: OrigemAuditoria | None = None,
        tela: str | None = None,
    ) -> PagedResult[RegistroAuditoriaResponse]:
        # RN-01: só o administrador da unidade.
        if not usuario_atual.eh_administrador:
            raise ForbiddenException(
                "Apenas administradores da unidade podem consultar a auditoria."
            )
        fuso_horario_valido(fuso_horario)  # mesmo sem período, um fuso inválido é recusado
        inicio, _ = intervalo_dia(data_inicio, fuso_horario)
        _, fim = intervalo_dia(data_fim, fuso_horario)  # o dia final entra inteiro
        if inicio is not None and fim is not None and fim <= inicio:
            raise InvalidInputException("A data final não pode ser anterior à data inicial.")
        filtros = FiltrosAuditoria(
            # intervalo_dia devolve UTC sem fuso; a coluna é TIMESTAMPTZ.
            inicio=inicio and inicio.replace(tzinfo=UTC),
            fim=fim and fim.replace(tzinfo=UTC),
            usuario_ids=tuple(usuario_ids),
            perfil=perfil,
            acao=acao,
            tc_id=tc_id,
            projeto_id=projeto_id,
            origem=origem,
            tela=tela,
        )
        linhas = await self._auditoria_repo.listar(
            usuario_atual.unidade_id, filtros, page, page_size
        )
        # Responsável e Backup estão gravados como id: uma busca de nomes por página.
        dados = await self._usuario_repo.dados_por_usuarios(
            usuario_atual.unidade_id,
            tuple(ids_de_usuarios([linha.registro for linha in linhas.items])),
        )
        nomes = {id_: nome for id_, (nome, *_) in dados.items()}
        return linhas.map(lambda linha: to_registro_auditoria_response(linha, nomes))
