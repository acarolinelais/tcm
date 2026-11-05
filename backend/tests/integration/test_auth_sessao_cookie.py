import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-functional-tests-0123456789")

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.application.schemas.auth import LoginRequest
from src.domain.common.exceptions import CredenciaisInvalidasException
from src.infrastructure.data.models.auth_sessao_model import AuthSessaoModel
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.usuario_repository import UsuarioRepositoryImpl
from src.infrastructure.security.autenticador_local import AutenticadorLocal
from src.infrastructure.security.jwt import criar_token, decodificar_token
from src.infrastructure.security.senha_hasher import hash_senha
from src.infrastructure.services.auth_service import AuthServiceImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)

SENHA = "senha-de-teste"


@pytest_asyncio.fixture
async def cenario():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    fabrica = async_sessionmaker(engine, expire_on_commit=False)
    email = f"sessao-{uuid4().hex}@example.com"
    async with fabrica() as session:
        unidade_id = await session.scalar(
            select(UnidadeModel.id).where(UnidadeModel.nome == "Manaus")
        )
        perfil_id = await session.scalar(
            select(PerfilModel.id).where(PerfilModel.codigo == "USUARIO_PADRAO")
        )
        usuario = UsuarioModel(
            id=uuid4(),
            unidade_id=unidade_id,
            nome="Pessoa Sessao",
            email=email,
            senha_hash=hash_senha(SENHA),
            perfil_id=perfil_id,
        )
        session.add(usuario)
        await session.commit()

    def service(session):
        repo = UsuarioRepositoryImpl(session)
        return AuthServiceImpl(AutenticadorLocal(repo), repo, criar_token, session)

    yield fabrica, service, usuario, LoginRequest(email=email, senha=SENHA)
    async with fabrica() as session:
        await session.delete(await session.get(UsuarioModel, usuario.id))
        await session.commit()
    await engine.dispose()


async def _login(cenario):
    fabrica, service, _, request = cenario
    async with fabrica() as session:
        return await service(session).login(request)


async def _renovar(cenario, refresh_token):
    fabrica, service, _, _ = cenario
    async with fabrica() as session:
        return await service(session).renovar(refresh_token)


async def test_sessao_expira_dez_horas_depois_do_login(cenario):
    fabrica, _, usuario, _ = cenario
    antes = datetime.now(UTC).replace(tzinfo=None)
    await _login(cenario)
    async with fabrica() as session:
        sessao = await session.scalar(
            select(AuthSessaoModel).where(AuthSessaoModel.usuario_id == usuario.id)
        )
    assert (
        antes + timedelta(hours=10) <= sessao.expires_at <= antes + timedelta(hours=10, minutes=1)
    )


async def test_refresh_rotaciona_e_recusa_o_token_anterior(cenario):
    emitida = await _login(cenario)
    renovada = await _renovar(cenario, emitida.refresh_token)
    assert renovada.access_token and renovada.refresh_token != emitida.refresh_token
    with pytest.raises(CredenciaisInvalidasException):
        await _renovar(cenario, emitida.refresh_token)


async def test_refresh_depois_do_logout_e_recusado(cenario):
    fabrica, service, _, _ = cenario
    emitida = await _login(cenario)
    async with fabrica() as session:
        await service(session).logout(emitida.refresh_token, None)
    with pytest.raises(CredenciaisInvalidasException):
        await _renovar(cenario, emitida.refresh_token)


async def test_logout_com_token_desconhecido_nao_falha(cenario):
    fabrica, service, _, _ = cenario
    async with fabrica() as session:
        await service(session).logout("token-que-nao-existe-" + uuid4().hex, None)


async def test_refresh_de_sessao_revogada_e_recusado(cenario):
    fabrica, _, usuario, _ = cenario
    emitida = await _login(cenario)
    async with fabrica() as session:
        (await session.get(UsuarioModel, usuario.id)).auth_version += 1
        await session.commit()
    with pytest.raises(CredenciaisInvalidasException):
        await _renovar(cenario, emitida.refresh_token)


async def test_refresh_de_sessao_vencida_e_recusado(cenario):
    fabrica, _, usuario, _ = cenario
    emitida = await _login(cenario)
    async with fabrica() as session:
        sessao = await session.scalar(
            select(AuthSessaoModel).where(AuthSessaoModel.usuario_id == usuario.id)
        )
        sessao.expires_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=1)
        await session.commit()
    with pytest.raises(CredenciaisInvalidasException):
        await _renovar(cenario, emitida.refresh_token)


async def test_logout_revoga_a_sessao_do_access_mesmo_com_cookie_de_outra(cenario):
    fabrica, service, _, _ = cenario
    da_aba = await _login(cenario)
    outra = await _login(cenario)
    sessao_da_aba = decodificar_token(da_aba.access_token).sessao_id
    async with fabrica() as session:
        await service(session).logout(outra.refresh_token, sessao_da_aba)
    for emitida in (da_aba, outra):
        with pytest.raises(CredenciaisInvalidasException):
            await _renovar(cenario, emitida.refresh_token)
