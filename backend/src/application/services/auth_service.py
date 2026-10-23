import hashlib
import secrets
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.domain.entities.interfaces.autenticador import Autenticador
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.usuario import Usuario
from src.infrastructure.data.models.auth_sessao_model import AuthSessaoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.security.jwt import ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS


class AuthServiceImpl:
    def __init__(
        self,
        autenticador: Autenticador,
        usuario_repo: UsuarioRepository,
        criar_token: Callable[..., str],
        session: AsyncSession | None = None,
    ) -> None:
        self._autenticador = autenticador
        self._usuario_repo = usuario_repo
        self._criar_token = criar_token
        self._session = session

    async def login(self, request: LoginRequest) -> TokenResponse:
        usuario_id = await self._autenticador.autenticar(request.email, request.senha)
        if usuario_id is None:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        usuario = await self._usuario_repo.obter_por_email(request.email)
        if usuario is None or usuario.id != usuario_id or not usuario.ativo:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        if self._session is None:
            return TokenResponse(access_token=self._criar_token(usuario))
        usuario_model = await self._session.get(UsuarioModel, usuario.id)
        if usuario_model is None:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        perfil, times = await self._contexto_usuario(usuario.id, usuario.unidade_id)
        sessao_id = uuid4()
        refresh = secrets.token_urlsafe(48)
        sessao = AuthSessaoModel(
            id=sessao_id,
            usuario_id=usuario.id,
            refresh_hash=self._hash(refresh),
            auth_version=usuario_model.auth_version,
            expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(days=REFRESH_TOKEN_DAYS),
        )
        self._session.add(sessao)
        await self._session.commit()
        access = self._emitir_access(usuario, perfil, times, sessao_id, usuario_model.auth_version)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=ACCESS_TOKEN_MINUTES * 60,
        )

    async def renovar(self, request: RefreshRequest) -> TokenResponse:
        if self._session is None:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        sessao = (
            await self._session.execute(
                select(AuthSessaoModel)
                .where(
                    AuthSessaoModel.refresh_hash == self._hash(request.refresh_token),
                    AuthSessaoModel.revoked_at.is_(None),
                    AuthSessaoModel.expires_at > datetime.now(UTC).replace(tzinfo=None),
                )
                .with_for_update()
            )
        ).scalar_one_or_none()
        if sessao is None:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        usuario_model = await self._session.get(UsuarioModel, sessao.usuario_id)
        if (
            usuario_model is None
            or not usuario_model.ativo
            or usuario_model.auth_version != sessao.auth_version
        ):
            sessao.revoked_at = datetime.now(UTC).replace(tzinfo=None)
            await self._session.commit()
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        usuario = await self._usuario_repo.obter_por_id(usuario_model.unidade_id, usuario_model.id)
        if usuario is None:
            raise CredenciaisInvalidasException("Credenciais inválidas.")
        perfil, times = await self._contexto_usuario(usuario.id, usuario.unidade_id)
        novo_refresh = secrets.token_urlsafe(48)
        sessao.refresh_hash = self._hash(novo_refresh)
        await self._session.commit()
        return TokenResponse(
            access_token=self._emitir_access(
                usuario, perfil, times, sessao.id, usuario_model.auth_version
            ),
            refresh_token=novo_refresh,
            expires_in=ACCESS_TOKEN_MINUTES * 60,
        )

    async def logout(self, sessao_id: UUID) -> None:
        if self._session is None:
            return
        sessao = await self._session.get(AuthSessaoModel, sessao_id)
        if sessao is not None and sessao.revoked_at is None:
            sessao.revoked_at = datetime.now(UTC).replace(tzinfo=None)
            await self._session.commit()

    async def _contexto_usuario(self, usuario_id: UUID, unidade_id: UUID) -> tuple[str, list[UUID]]:
        if self._session is None:
            return "", []
        usuario_model = await self._session.get(UsuarioModel, usuario_id)
        perfil = ""
        if usuario_model and usuario_model.perfil_id:
            perfil_model = await self._session.get(PerfilModel, usuario_model.perfil_id)
            perfil = perfil_model.nome if perfil_model else ""
        stmt = (
            select(TimeMembroModel.time_id)
            .join(TimeModel, TimeModel.id == TimeMembroModel.time_id)
            .where(
                TimeMembroModel.usuario_id == usuario_id,
                TimeMembroModel.unidade_id == unidade_id,
                TimeMembroModel.ativo.is_(True),
                TimeModel.ativo.is_(True),
            )
            .order_by(TimeModel.nome, TimeModel.id)
        )
        times = list((await self._session.execute(stmt)).scalars().all())
        managed_stmt = select(TimeModel.id).where(
            TimeModel.gerente_id == usuario_id,
            TimeModel.unidade_id == unidade_id,
            TimeModel.ativo.is_(True),
        )
        managed = list((await self._session.execute(managed_stmt)).scalars().all())
        ids = set(times) | set(managed)
        ordered_times = []
        if ids:
            ordered_times = list(
                (
                    await self._session.execute(
                        select(TimeModel.id)
                        .where(TimeModel.id.in_(ids))
                        .order_by(TimeModel.nome, TimeModel.id)
                    )
                )
                .scalars()
                .all()
            )
        nome_perfil = perfil or (
            "Administrador da unidade" if usuario_model and usuario_model.admin_unidade else ""
        )
        return nome_perfil, ordered_times

    def _emitir_access(
        self,
        usuario: Usuario,
        perfil: str,
        times: list[UUID],
        sessao_id: UUID,
        auth_version: int,
    ) -> str:
        return self._criar_token(
            usuario,
            perfil=perfil,
            tem_multiplos_times=len(times) > 1,
            time_id=times[0] if times else None,
            sessao_id=sessao_id,
            auth_version=auth_version,
        )

    @staticmethod
    def _hash(value: str) -> str:
        return hashlib.sha256(value.encode()).hexdigest()
