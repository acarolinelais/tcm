from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from src.application.schemas.usuario import (
    AtualizarUsuarioRequest,
    CriarUsuarioRequest,
    UsuarioResponse,
    to_response,
)
from src.domain.common.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ServiceUnavailableException,
)
from src.domain.common.paged_result import PagedResult
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.usuario import Usuario


class UsuarioServiceImpl:
    def __init__(
        self,
        repo: UsuarioRepository,
        uow: UnitOfWork,
        senha_inicial: str | None = None,
        hash_senha: Callable[[str], str] | None = None,
    ) -> None:
        self._repo = repo
        self._uow = uow
        self._senha_inicial = senha_inicial
        self._hash_senha = hash_senha

    async def listar(
        self,
        usuario_atual: UsuarioAutenticado,
        page: int,
        page_size: int,
        nome: str | None = None,
        email: str | None = None,
        ativo: bool | None = None,
        perfil_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        sem_responsavel: bool = False,
        setor_id: UUID | None = None,
    ) -> PagedResult[UsuarioResponse]:
        self._exigir_permissao(usuario_atual, "usuarios.consultar")
        tem_filtros = any(
            (nome, email, ativo is not None, perfil_id, responsavel_id, sem_responsavel, setor_id)
        )
        filtros_adicionais = {
            chave: valor
            for chave, valor in (
                ("responsavel_id", responsavel_id),
                ("sem_responsavel", True if sem_responsavel else None),
                ("setor_id", setor_id),
            )
            if valor is not None
        }
        if usuario_atual.eh_administrador:
            if tem_filtros:
                result = await self._repo.listar_filtrado(
                    usuario_atual.unidade_id,
                    page,
                    page_size,
                    nome,
                    email,
                    ativo,
                    perfil_id,
                    **filtros_adicionais,
                )
            else:
                result = await self._repo.listar_paginado(usuario_atual.unidade_id, page, page_size)
        else:
            escopo = tuple(
                dict.fromkeys((*usuario_atual.times_gerenciados, *usuario_atual.time_ids))
            )
            if tem_filtros:
                result = await self._repo.listar_visiveis_filtrado(
                    usuario_atual.unidade_id,
                    page,
                    page_size,
                    escopo,
                    usuario_atual.id,
                    nome,
                    email,
                    ativo,
                    perfil_id,
                    usuario_atual.id,
                    **(
                        {"filtro_responsavel_id": responsavel_id}
                        if responsavel_id is not None
                        else {}
                    ),
                    **({"sem_responsavel": True} if sem_responsavel else {}),
                    **({"setor_id": setor_id} if setor_id is not None else {}),
                )
            else:
                result = await self._repo.listar_visiveis(
                    usuario_atual.unidade_id,
                    page,
                    page_size,
                    escopo,
                    usuario_atual.id,
                    usuario_atual.id,
                )
        pode_consultar_perfil = "usuarios.perfil.consultar" in usuario_atual.permissoes
        perfil_por_usuario = (
            await self._repo.dados_por_usuarios(
                usuario_atual.unidade_id, tuple(usuario.id for usuario in result.items)
            )
            if pode_consultar_perfil and result.items
            else {}
        )
        items = []
        setores_por_usuario = {}
        pode_consultar_setores = usuario_atual.eh_administrador or (
            usuario_atual.perfil_codigo in ("GERENTE", "KP")
            and usuario_atual.pode("setores.consultar")
        )
        if result.items and pode_consultar_setores:
            listar_setores = getattr(self._repo, "setores_por_usuarios", None)
            if listar_setores:
                dados_setores = await listar_setores(
                    usuario_atual.unidade_id, tuple(usuario.id for usuario in result.items)
                )
                if isinstance(dados_setores, dict):
                    setores_por_usuario = dados_setores
        for usuario in result.items:
            resposta = to_response(usuario)
            _, _, perfil_nome, perfil_codigo = perfil_por_usuario.get(
                usuario.id, ("", None, "", None)
            )
            items.append(
                resposta.model_copy(
                    update={
                        "perfil_nome": perfil_nome or None,
                        "perfil_codigo": perfil_codigo,
                        "setores": setores_por_usuario.get(usuario.id, []),
                    }
                )
            )
        return PagedResult(items, result.page, result.page_size, result.total_count)

    async def obter(self, usuario_atual: UsuarioAutenticado, id: UUID) -> UsuarioResponse:
        self._exigir_permissao(usuario_atual, "usuarios.consultar")
        if not usuario_atual.eh_administrador:
            if (
                id != usuario_atual.id
                and not await self._repo.pertence_a_escopo(
                    usuario_atual.unidade_id,
                    id,
                    tuple(
                        dict.fromkeys((*usuario_atual.times_gerenciados, *usuario_atual.time_ids))
                    ),
                )
                and not await self._repo.pertence_a_responsabilidade(
                    usuario_atual.unidade_id, id, usuario_atual.id
                )
            ):
                raise NotFoundException(f"Usuário {id} não encontrado.")
        return to_response(await self._obter_entidade(usuario_atual.unidade_id, id))

    async def criar(
        self, usuario_atual: UsuarioAutenticado, request: CriarUsuarioRequest
    ) -> UsuarioResponse:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        await self._garantir_email_unico(request.email, None)
        await self._garantir_user_id_unico(usuario_atual.unidade_id, request.user_id, None)
        usuario = Usuario(
            usuario_atual.unidade_id, request.nome, request.email, user_id=request.user_id
        )
        if not usuario_atual.eh_administrador:
            perfil_padrao_id = await self._repo.obter_perfil_padrao(usuario_atual.unidade_id)
            if request.perfil_id is None or request.perfil_id == perfil_padrao_id:
                usuario.perfil_id = perfil_padrao_id
            elif (
                usuario_atual.perfil_codigo == "GERENTE"
                and request.perfil_id is not None
                and await self._repo.perfil_kp_atribuivel(
                    usuario_atual.unidade_id, request.perfil_id
                )
            ):
                usuario.perfil_id = request.perfil_id
            else:
                raise ForbiddenException("Gerentes podem atribuir somente o perfil KP ou padrão.")
            usuario.responsavel_id = usuario_atual.id
        elif request.perfil_id is None:
            usuario.perfil_id = await self._repo.obter_perfil_padrao(usuario_atual.unidade_id)
        else:
            if not await self._repo.perfil_atribuivel(usuario_atual.unidade_id, request.perfil_id):
                raise NotFoundException("Perfil não encontrado ou reservado ao administrador.")
            usuario.perfil_id = request.perfil_id
        if not self._senha_inicial or self._hash_senha is None:
            raise ServiceUnavailableException(
                "Configure SENHA_INICIAL_USUARIOS antes de cadastrar usuários."
            )
        usuario.definir_senha_hash(self._hash_senha(self._senha_inicial))
        usuario.senha_alteracao_obrigatoria = True
        usuario.created_at = datetime.now()
        await self._repo.adicionar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def atualizar(
        self, usuario_atual: UsuarioAutenticado, id: UUID, request: AtualizarUsuarioRequest
    ) -> UsuarioResponse:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        await self._exigir_responsavel_ou_admin(usuario_atual, id)
        if Usuario.normalizar_email(request.email) != usuario.email:
            await self._garantir_email_unico(request.email, id)
        if Usuario.normalizar_user_id(request.user_id) != usuario.user_id:
            await self._garantir_user_id_unico(usuario.unidade_id, request.user_id, id)
        usuario.atualizar(request.nome, request.email)
        usuario.definir_user_id(request.user_id)
        usuario.auth_version += 1
        await self._repo.atualizar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def ativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        await self._exigir_responsavel_ou_admin(usuario_atual, id)
        usuario.ativar()
        usuario.auth_version += 1
        await self._repo.atualizar(usuario)
        await self._uow.commit()

    async def inativar(self, usuario_atual: UsuarioAutenticado, id: UUID) -> None:
        self._exigir_permissao(usuario_atual, "usuarios.gerenciar")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        await self._exigir_responsavel_ou_admin(usuario_atual, id)
        usuario.inativar()
        usuario.auth_version += 1
        await self._repo.atualizar(usuario)
        await self._uow.commit()

    async def atribuir_responsavel(
        self, usuario_atual: UsuarioAutenticado, id: UUID, responsavel_id: UUID | None
    ) -> UsuarioResponse:
        if not usuario_atual.eh_administrador:
            raise ForbiddenException("Apenas o administrador pode atribuir responsáveis.")
        usuario = await self._obter_entidade(usuario_atual.unidade_id, id)
        if responsavel_id == usuario.id:
            raise ConflictException("Um gerente não pode ser responsável pela própria conta.")
        if responsavel_id is not None and not await self._repo.responsavel_gerente_valido(
            usuario_atual.unidade_id, responsavel_id
        ):
            raise NotFoundException("Gerente ativo não encontrado nesta unidade.")
        usuario.responsavel_id = responsavel_id
        usuario.auth_version += 1
        await self._repo.atualizar(usuario)
        await self._uow.commit()
        return to_response(usuario)

    async def _exigir_responsavel_ou_admin(
        self, usuario_atual: UsuarioAutenticado, usuario_id: UUID
    ) -> None:
        if usuario_atual.eh_administrador:
            return
        if not await self._repo.pertence_a_responsabilidade(
            usuario_atual.unidade_id, usuario_id, usuario_atual.id
        ):
            raise NotFoundException(f"Usuário {usuario_id} não encontrado.")

    async def _obter_entidade(self, unidade_id: UUID, id: UUID) -> Usuario:
        usuario = await self._repo.obter_por_id(unidade_id, id)
        if usuario is None:
            raise NotFoundException(f"Usuário {id} não encontrado.")
        return usuario

    async def _garantir_email_unico(self, email: str, ignorar_id: UUID | None) -> None:
        if await self._repo.existe_email(email, ignorar_id):
            raise ConflictException("Já existe um usuário com este e-mail.")

    async def _garantir_user_id_unico(
        self, unidade_id: UUID, user_id: str | None, ignorar_id: UUID | None
    ) -> None:
        normalizado = Usuario.normalizar_user_id(user_id)
        if normalizado is not None and await self._repo.existe_user_id(
            unidade_id, normalizado, ignorar_id
        ):
            raise ConflictException("Já existe um usuário com este User ID nesta unidade.")

    @staticmethod
    def _exigir_permissao(usuario_atual: UsuarioAutenticado, permissao: str) -> None:
        if not usuario_atual.pode(permissao):
            raise ForbiddenException("Você não tem permissão para realizar esta operação.")
