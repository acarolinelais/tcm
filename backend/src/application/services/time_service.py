from uuid import UUID

from src.application.schemas.time import (
    AdicionarMembroRequest,
    AtualizarTimeRequest,
    CriarTimeRequest,
    TimeMembroResponse,
    TimeResponse,
    membro_to_response,
    to_response,
)
from src.application.schemas.usuario import to_response as to_usuario_response
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.setor_gerente_repository import SetorGerenteRepository
from src.domain.entities.interfaces.setor_repository import SetorRepository
from src.domain.entities.interfaces.time_membro_repository import TimeMembroRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro


class TimeServiceImpl:
    def __init__(
        self,
        repo: TimeRepository,
        setor_repo: SetorRepository,
        membro_repo: TimeMembroRepository,
        usuario_repo: UsuarioRepository,
        uow: UnitOfWork,
        setor_gerente_repo: SetorGerenteRepository | None = None,
    ) -> None:
        self._repo = repo
        self._setor_repo = setor_repo
        self._membro_repo = membro_repo
        self._usuario_repo = usuario_repo
        self._uow = uow
        self._setor_gerente_repo = setor_gerente_repo

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarTimeRequest
    ) -> TimeResponse:
        unidade_id = usuario_atual.unidade_id
        if not usuario_atual.eh_administrador:
            if (
                not usuario_atual.pode("times.criar")
                or request.setor_id not in usuario_atual.setores_gerenciados
            ):
                raise ForbiddenException(
                    "O time deve pertencer a um setor sob sua responsabilidade."
                )
        setor = await self._setor_repo.obter_por_id(unidade_id, request.setor_id)
        if setor is None:
            raise NotFoundException("Setor não encontrado.")
        if not setor.ativo:
            raise ConflictException("Não é possível criar times em um setor inativo.")
        gerente_id = usuario_atual.id if not usuario_atual.eh_administrador else request.gerente_id
        if gerente_id is not None:
            await self._garantir_usuario(unidade_id, gerente_id)
            if not await self._usuario_repo.gerente_ativo_na_unidade(unidade_id, gerente_id):
                raise ConflictException(
                    "O responsável principal precisa ter o perfil Gerente ativo."
                )
            if self._setor_gerente_repo and not await self._setor_gerente_repo.gerente_associado(
                unidade_id, request.setor_id, gerente_id
            ):
                raise ConflictException("O responsável principal precisa estar associado ao setor.")
        time = Time(unidade_id, request.setor_id, request.nome, gerente_id)
        await self._repo.adicionar(time)
        await self._uow.commit()
        return to_response(time)

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AtualizarTimeRequest
    ) -> TimeResponse:
        time = await self._obter_time(usuario_atual.unidade_id, id)
        self._garantir_gestao_time(usuario_atual, time)
        time.nome = request.nome
        await self._repo.atualizar(time)
        await self._uow.commit()
        return to_response(time)

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        setor_id: UUID | None = None,
        ativo: bool | None = None,
        busca: str | None = None,
    ) -> PagedResult[TimeResponse]:
        if usuario_atual.eh_administrador:
            result = await self._repo.listar_paginado(
                usuario_atual.unidade_id, page, page_size, setor_id, ativo, busca
            )
        elif usuario_atual.perfil_codigo == "GERENTE" and usuario_atual.pode("times.consultar"):
            result = await self._repo.listar_visiveis(
                usuario_atual.unidade_id,
                page,
                page_size,
                usuario_atual.times_gerenciados,
                setor_id,
                ativo,
                busca,
            )
        elif (
            usuario_atual.perfil_codigo == "KP"
            and usuario_atual.pode("times.consultar")
            and usuario_atual.time_ids
        ):
            result = await self._repo.listar_visiveis(
                usuario_atual.unidade_id,
                page,
                page_size,
                usuario_atual.time_ids,
                setor_id,
                ativo,
                busca,
            )
        else:
            result = PagedResult([], page, page_size, 0)
        nomes_por_ids = getattr(self._setor_repo, "nomes_por_ids", None)
        nomes_setores = {}
        if result.items and nomes_por_ids:
            dados_nomes = await nomes_por_ids(
                usuario_atual.unidade_id,
                tuple(dict.fromkeys(time.setor_id for time in result.items)),
            )
            if isinstance(dados_nomes, dict):
                nomes_setores = dados_nomes
        return result.map(
            lambda time: to_response(time).model_copy(
                update={"setor_nome": nomes_setores.get(time.setor_id)}
            )
        )

    async def adicionar_membro(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AdicionarMembroRequest
    ) -> TimeMembroResponse:
        unidade_id = usuario_atual.unidade_id
        time = await self._obter_time(unidade_id, id)
        self._garantir_gestao_time(usuario_atual, time)
        await self._garantir_usuario(unidade_id, request.usuario_id)
        membro_existente = await self._membro_repo.obter_por_time_e_usuario(
            unidade_id, id, request.usuario_id
        )
        if membro_existente and membro_existente.ativo:
            raise ConflictException("Usuário já é membro deste time.")
        if membro_existente:
            membro_existente.ativar()
            membro = membro_existente
            await self._membro_repo.atualizar(membro)
        else:
            membro = TimeMembro(unidade_id, id, request.usuario_id)
            await self._membro_repo.adicionar(membro)
        await self._invalidar_sessoes(request.usuario_id)
        await self._uow.commit()
        return membro_to_response(membro)

    async def remover_membro(
        self, usuario_atual: UsuarioAutenticado, id: UUID, usuario_id: UUID
    ) -> None:
        unidade_id = usuario_atual.unidade_id
        time = await self._obter_time(unidade_id, id)
        self._garantir_gestao_time(usuario_atual, time)
        membro = await self._membro_repo.obter_por_time_e_usuario(unidade_id, id, usuario_id)
        if membro is None or not membro.ativo:
            raise NotFoundException("Membro não encontrado.")
        membro.inativar()
        await self._membro_repo.atualizar(membro)
        await self._invalidar_sessoes(usuario_id)
        await self._uow.commit()

    async def listar_membros(
        self, usuario_atual: UsuarioAutenticado, id: UUID
    ) -> list[TimeMembroResponse]:
        time = await self._obter_time(usuario_atual.unidade_id, id)
        if (
            not usuario_atual.eh_administrador
            and time.setor_id not in usuario_atual.setores_gerenciados
            and not (
                usuario_atual.perfil_codigo == "KP"
                and usuario_atual.pode("times.consultar")
                and id in usuario_atual.time_ids
            )
            and not (
                usuario_atual.perfil_codigo == "USUARIO_PADRAO"
                and usuario_atual.pode("test_cases.consultar")
                and id in usuario_atual.time_ids
            )
        ):
            raise NotFoundException("Time não encontrado.")
        membros = await self._membro_repo.listar_por_time(usuario_atual.unidade_id, id)
        dados_usuario = await self._usuario_repo.dados_por_usuarios(
            usuario_atual.unidade_id, tuple(m.usuario_id for m in membros)
        )
        return [
            membro_to_response(
                m,
                dados_usuario.get(m.usuario_id, (None, None, None))[0],
                dados_usuario.get(m.usuario_id, (None, None, None))[1],
                dados_usuario.get(m.usuario_id, (None, None, None))[2],
            )
            for m in membros
        ]

    async def listar_usuarios_disponiveis(self, usuario_atual: UsuarioAutenticado):
        if (
            not usuario_atual.eh_administrador
            and not (
                usuario_atual.perfil_codigo == "GERENTE" and usuario_atual.pode("times.gerenciar")
            )
            and not (
                usuario_atual.perfil_codigo == "KP"
                and usuario_atual.pode("times.gerenciar")
                and usuario_atual.time_ids
            )
        ):
            raise ForbiddenException("Você não tem permissão para gerenciar membros dos times.")
        return [
            to_usuario_response(u)
            for u in await self._usuario_repo.listar_ativos_da_unidade(usuario_atual.unidade_id)
        ]

    async def definir_ativo(
        self, usuario_atual: UsuarioAutenticado, id: UUID, ativo: bool
    ) -> TimeResponse:
        if not usuario_atual.eh_administrador:
            raise ForbiddenException(
                "Apenas administradores da unidade podem ativar ou inativar times."
            )
        time = await self._obter_time(usuario_atual.unidade_id, id)
        if ativo:
            setor = await self._setor_repo.obter_por_id(usuario_atual.unidade_id, time.setor_id)
            if setor is None:
                raise NotFoundException("Setor não encontrado.")
            if not setor.ativo:
                raise ConflictException("Reative o setor antes de reativar o time.")
            time.ativar()
        else:
            time.inativar()
            for membro in await self._membro_repo.listar_por_time(usuario_atual.unidade_id, id):
                await self._invalidar_sessoes(membro.usuario_id)
        await self._repo.atualizar(time)
        await self._uow.commit()
        return to_response(time)

    async def _obter_time(self, unidade_id: UUID, id: UUID) -> Time:
        time = await self._repo.obter_por_id(unidade_id, id)
        if time is None:
            raise NotFoundException("Time não encontrado.")
        return time

    async def _garantir_usuario(self, unidade_id: UUID, id: UUID) -> None:
        usuario = await self._usuario_repo.obter_por_id(unidade_id, id)
        if usuario is None or not usuario.ativo:
            raise NotFoundException("Usuário não encontrado.")

    async def _invalidar_sessoes(self, usuario_id: UUID) -> None:
        invalidar = getattr(self._usuario_repo, "invalidar_sessoes", None)
        if invalidar is not None:
            await invalidar(usuario_id)

    @staticmethod
    def _garantir_gestao_time(usuario_atual: UsuarioAutenticado, time: Time) -> None:
        dentro_do_setor = time.setor_id in usuario_atual.setores_gerenciados
        dentro_do_time = time.id in usuario_atual.time_ids
        if (
            not usuario_atual.eh_administrador
            and not (
                usuario_atual.perfil_codigo == "GERENTE"
                and usuario_atual.pode("times.gerenciar")
                and dentro_do_setor
            )
            and not (
                usuario_atual.perfil_codigo == "KP"
                and usuario_atual.pode("times.gerenciar")
                and dentro_do_time
            )
        ):
            raise ForbiddenException("Apenas o gerente do time ou administrador pode alterá-lo.")
