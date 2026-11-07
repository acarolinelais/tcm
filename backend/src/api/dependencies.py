import os
from datetime import UTC, datetime
from uuid import UUID

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.services.auditoria_service import AuditoriaServiceImpl
from src.application.services.caso_teste_service import CasoTesteServiceImpl
from src.application.services.form_factor_service import FormFactorServiceImpl
from src.application.services.importacao_projeto_service import ImportacaoProjetoServiceImpl
from src.application.services.importacao_sdf_service import ImportacaoSdfServiceImpl
from src.application.services.modelo_dispositivo_service import ModeloDispositivoServiceImpl
from src.application.services.overview_service import OverviewServiceImpl
from src.application.services.projeto_service import ProjetoServiceImpl
from src.application.services.setor_service import SetorServiceImpl
from src.application.services.time_service import TimeServiceImpl
from src.application.services.usuario_service import UsuarioServiceImpl
from src.domain.common.exceptions import CredenciaisInvalidasException, ForbiddenException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.auditoria import (
    ContextoAuditoriaImpl,
    tela_auditoria,
    tela_da_requisicao,
    usuario_auditoria,
)
from src.infrastructure.data.models.auth_sessao_model import AuthSessaoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.permissao_model import PerfilPermissaoModel, PermissaoModel
from src.infrastructure.data.models.setor_gerente_model import SetorGerenteModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.data.session import get_session as get_session
from src.infrastructure.data.unit_of_work import UnitOfWorkImpl
from src.infrastructure.repositories.auditoria_repository import AuditoriaRepositoryImpl
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl
from src.infrastructure.repositories.execucao_sdf_repository import ExecucaoSdfRepositoryImpl
from src.infrastructure.repositories.historico_caso_teste_repository import (
    HistoricoCasoTesteRepositoryImpl,
)
from src.infrastructure.repositories.historico_form_factor_repository import (
    HistoricoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.importacao_sdf_repository import ImportacaoSdfRepositoryImpl
from src.infrastructure.repositories.importacao_sdf_status_repository import (
    ImportacaoSdfStatusRepositoryImpl,
)
from src.infrastructure.repositories.link_pull_request_repository import (
    LinkPullRequestRepositoryImpl,
)
from src.infrastructure.repositories.modelo_dispositivo_repository import (
    ModeloDispositivoRepositoryImpl,
)
from src.infrastructure.repositories.overview_repository import OverviewRepositoryImpl
from src.infrastructure.repositories.projeto_modelo_repository import ProjetoModeloRepositoryImpl
from src.infrastructure.repositories.projeto_repository import ProjetoRepositoryImpl
from src.infrastructure.repositories.resultado_form_factor_repository import (
    ResultadoFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.rodada_form_factor_repository import (
    RodadaFormFactorRepositoryImpl,
)
from src.infrastructure.repositories.setor_gerente_repository import SetorGerenteRepositoryImpl
from src.infrastructure.repositories.setor_repository import SetorRepositoryImpl
from src.infrastructure.repositories.time_membro_repository import TimeMembroRepositoryImpl
from src.infrastructure.repositories.time_repository import TimeRepositoryImpl
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl
from src.infrastructure.security.autenticador_local import AutenticadorLocal
from src.infrastructure.security.jwt import criar_token, decodificar_token
from src.infrastructure.security.senha_hasher import hash_senha
from src.infrastructure.services.auth_service import AuthServiceImpl

bearer = HTTPBearer(auto_error=False)


async def get_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
    x_tela: str | None = Header(default=None),
) -> UsuarioAutenticado:
    # A tela de onde a operação veio entra no histórico de auditoria (spec 038, ADR 0044).
    tela_auditoria.set(tela_da_requisicao(x_tela))
    return await _obter_usuario_atual(credentials, session, permitir_senha_inicial=False)


async def get_usuario_atual_para_troca_senha(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> UsuarioAutenticado:
    return await _obter_usuario_atual(credentials, session, permitir_senha_inicial=True)


async def _obter_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None,
    session: AsyncSession,
    *,
    permitir_senha_inicial: bool,
) -> UsuarioAutenticado:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    payload = decodificar_token(credentials.credentials)
    if payload is None:
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    # Antes da primeira leitura: o listener after_begin grava o usuário na transação que ela abre
    # e nas seguintes, e os triggers de auditoria o leem de lá (ADR 0044).
    usuario_auditoria.set(payload.usuario_id)
    sessao = await session.get(AuthSessaoModel, payload.sessao_id)
    usuario = await session.get(UsuarioModel, payload.usuario_id)
    agora = datetime.now(UTC).replace(tzinfo=None)
    if (
        sessao is None
        or sessao.revoked_at is not None
        or sessao.expires_at <= agora
        or usuario is None
        or not usuario.ativo
        or usuario.unidade_id != payload.unidade_id
        or usuario.auth_version != payload.auth_version
        or sessao.auth_version != usuario.auth_version
        or sessao.usuario_id != usuario.id
    ):
        raise CredenciaisInvalidasException("Credenciais inválidas.")
    perfil_nome = ""
    perfil = None
    permissoes: frozenset[str] = frozenset()
    if usuario.perfil_id:
        perfil = await session.get(PerfilModel, usuario.perfil_id)
        perfil_nome = perfil.nome if perfil else ""
        stmt = (
            select(PermissaoModel.id)
            .join(PerfilPermissaoModel, PerfilPermissaoModel.permissao_id == PermissaoModel.id)
            .where(PerfilPermissaoModel.perfil_id == usuario.perfil_id)
        )
        permissoes = frozenset((await session.execute(stmt)).scalars().all())
    perfil_codigo = perfil.codigo if perfil else None
    if perfil_codigo == "ADMIN_UNIDADE":
        permissoes = frozenset((await session.execute(select(PermissaoModel.id))).scalars().all())
        if not perfil_nome:
            perfil_nome = "Administrador da unidade"
    membership_rows = (
        await session.execute(
            select(TimeMembroModel.time_id).where(
                TimeMembroModel.usuario_id == usuario.id,
                TimeMembroModel.unidade_id == usuario.unidade_id,
                TimeMembroModel.ativo.is_(True),
                TimeMembroModel.time_id.in_(
                    select(TimeModel.id).where(
                        TimeModel.unidade_id == usuario.unidade_id,
                        TimeModel.ativo.is_(True),
                    )
                ),
            )
        )
    ).all()
    memberships = tuple(row.time_id for row in membership_rows)
    setores_gerenciados: tuple[UUID, ...] = ()
    if perfil_codigo == "GERENTE":
        setores_gerenciados = tuple(
            (
                await session.execute(
                    select(SetorGerenteModel.setor_id)
                    .join(SetorModel, SetorModel.id == SetorGerenteModel.setor_id)
                    .where(
                        SetorGerenteModel.unidade_id == usuario.unidade_id,
                        SetorGerenteModel.usuario_id == usuario.id,
                        SetorGerenteModel.ativo.is_(True),
                        SetorModel.ativo.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )
    managed = ()
    if setores_gerenciados:
        managed = (
            (
                await session.execute(
                    select(TimeModel.id).where(
                        TimeModel.unidade_id == usuario.unidade_id,
                        TimeModel.setor_id.in_(setores_gerenciados),
                        TimeModel.ativo.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )
    identidade = UsuarioAutenticado(
        usuario.id,
        usuario.unidade_id,
        perfil_codigo,
        usuario.nome,
        usuario.email,
        perfil_nome,
        permissoes,
        tuple(memberships),
        tuple(managed),
        payload.time_id,
        payload.sessao_id,
        usuario.senha_alteracao_obrigatoria,
        setores_gerenciados,
    )
    if identidade.senha_alteracao_obrigatoria and not permitir_senha_inicial:
        raise ForbiddenException("Altere sua senha inicial para continuar.")
    return identidade


async def get_usuario_service(session: AsyncSession = Depends(get_session)) -> UsuarioServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    uow = UnitOfWorkImpl(session)
    return UsuarioServiceImpl(
        repo,
        uow,
        os.environ.get("SENHA_INICIAL_USUARIOS"),
        hash_senha,
    )


def exigir_permissao(usuario: UsuarioAutenticado, permissao: str) -> None:
    from src.domain.common.exceptions import ForbiddenException

    if not usuario.pode(permissao):
        raise ForbiddenException("Você não tem permissão para realizar esta operação.")


async def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthServiceImpl:
    repo = UsuarioRepositoryImpl(session)
    return AuthServiceImpl(AutenticadorLocal(repo), repo, criar_token, session)


async def get_setor_service(session: AsyncSession = Depends(get_session)) -> SetorServiceImpl:
    return SetorServiceImpl(
        SetorRepositoryImpl(session),
        UnitOfWorkImpl(session),
        SetorGerenteRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
    )


async def get_time_service(session: AsyncSession = Depends(get_session)) -> TimeServiceImpl:
    return TimeServiceImpl(
        TimeRepositoryImpl(session),
        SetorRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        UnitOfWorkImpl(session),
        SetorGerenteRepositoryImpl(session),
    )


async def get_projeto_service(session: AsyncSession = Depends(get_session)) -> ProjetoServiceImpl:
    return ProjetoServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        ModeloDispositivoRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        UnitOfWorkImpl(session),
    )


async def get_caso_teste_service(
    session: AsyncSession = Depends(get_session),
) -> CasoTesteServiceImpl:
    return CasoTesteServiceImpl(
        CasoTesteRepositoryImpl(session),
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        LinkPullRequestRepositoryImpl(session),
        UnitOfWorkImpl(session),
        HistoricoCasoTesteRepositoryImpl(session),
    )


async def get_auditoria_service(
    session: AsyncSession = Depends(get_session),
) -> AuditoriaServiceImpl:
    return AuditoriaServiceImpl(AuditoriaRepositoryImpl(session), UsuarioRepositoryImpl(session))


async def get_overview_service(
    session: AsyncSession = Depends(get_session),
) -> OverviewServiceImpl:
    return OverviewServiceImpl(
        OverviewRepositoryImpl(session), ProjetoRepositoryImpl(session), TimeRepositoryImpl(session)
    )


async def get_modelo_dispositivo_service(
    session: AsyncSession = Depends(get_session),
) -> ModeloDispositivoServiceImpl:
    return ModeloDispositivoServiceImpl(
        ModeloDispositivoRepositoryImpl(session), UnitOfWorkImpl(session)
    )


async def get_importacao_projeto_service(
    session: AsyncSession = Depends(get_session),
) -> ImportacaoProjetoServiceImpl:
    return ImportacaoProjetoServiceImpl(
        ProjetoRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        TimeRepositoryImpl(session),
        TimeMembroRepositoryImpl(session),
        UsuarioRepositoryImpl(session),
        ModeloDispositivoRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        UnitOfWorkImpl(session),
    )


async def get_importacao_sdf_service(
    session: AsyncSession = Depends(get_session),
) -> ImportacaoSdfServiceImpl:
    return ImportacaoSdfServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ModeloDispositivoRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        ImportacaoSdfRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        ImportacaoSdfStatusRepositoryImpl(session),
        ContextoAuditoriaImpl(session),
    )


async def get_form_factor_service(
    session: AsyncSession = Depends(get_session),
) -> FormFactorServiceImpl:
    return FormFactorServiceImpl(
        ProjetoRepositoryImpl(session),
        TimeRepositoryImpl(session),
        ResultadoFormFactorRepositoryImpl(session),
        ProjetoModeloRepositoryImpl(session),
        CasoTesteRepositoryImpl(session),
        ExecucaoSdfRepositoryImpl(session),
        UnitOfWorkImpl(session),
        RodadaFormFactorRepositoryImpl(session),
        HistoricoFormFactorRepositoryImpl(session),
        ContextoAuditoriaImpl(session),
    )
