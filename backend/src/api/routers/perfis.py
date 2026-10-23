from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import exigir_permissao, get_session, get_usuario_atual
from src.application.catalogos.permissoes import metadados_permissao
from src.application.schemas.perfil import (
    AtribuirPerfilRequest,
    CriarPerfilRequest,
    DefinirPermissoesRequest,
    PerfilResponse,
    PermissaoResponse,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.permissao_model import PerfilPermissaoModel, PermissaoModel
from src.infrastructure.data.models.usuario_model import UsuarioModel

router = APIRouter(prefix="/api/perfis", tags=["perfis"])


@router.get("/permissoes", response_model=list[PermissaoResponse])
async def listar_permissoes(
    usuario: UsuarioAutenticado = Depends(get_usuario_atual),
    session: AsyncSession = Depends(get_session),
):
    exigir_permissao(usuario, "perfis.gerenciar")
    rows = (await session.execute(select(PermissaoModel))).scalars().all()
    catalogo = []
    for row in rows:
        modulo, ordem = metadados_permissao(row.id)
        catalogo.append(
            PermissaoResponse(
                id=row.id,
                descricao=row.descricao,
                modulo={"codigo": modulo.codigo, "nome": modulo.nome, "ordem": modulo.ordem},
                ordem=ordem,
            )
        )
    return sorted(catalogo, key=lambda item: (item.modulo.ordem, item.ordem, item.id))


@router.get("", response_model=list[PerfilResponse])
async def listar_perfis(
    usuario: UsuarioAutenticado = Depends(get_usuario_atual),
    session: AsyncSession = Depends(get_session),
):
    consulta = select(PerfilModel).where(PerfilModel.unidade_id == usuario.unidade_id)
    if usuario.perfil_codigo == "GERENTE" and usuario.pode("usuarios.gerenciar"):
        consulta = consulta.where(PerfilModel.codigo.in_(("KP", "USUARIO_PADRAO")))
    else:
        exigir_permissao(usuario, "perfis.gerenciar")
    perfis = (await session.execute(consulta.order_by(PerfilModel.nome))).scalars().all()
    saida = []
    for perfil in perfis:
        codigos = (
            (
                await session.execute(
                    select(PerfilPermissaoModel.permissao_id).where(
                        PerfilPermissaoModel.perfil_id == perfil.id
                    )
                )
            )
            .scalars()
            .all()
        )
        saida.append(
            PerfilResponse(
                id=perfil.id,
                nome=perfil.nome,
                descricao=perfil.descricao,
                permissoes=list(codigos),
                codigo=perfil.codigo,
            )
        )
    return saida


@router.post("", response_model=PerfilResponse, status_code=201)
async def criar_perfil(
    request: CriarPerfilRequest,
    usuario: UsuarioAutenticado = Depends(get_usuario_atual),
    session: AsyncSession = Depends(get_session),
):
    exigir_permissao(usuario, "perfis.gerenciar")
    existente = (
        await session.execute(
            select(PerfilModel.id).where(
                PerfilModel.unidade_id == usuario.unidade_id, PerfilModel.nome == request.nome
            )
        )
    ).first()
    if existente:
        raise ConflictException("Já existe um perfil com este nome.")
    perfil = PerfilModel(
        id=uuid4(), unidade_id=usuario.unidade_id, nome=request.nome, descricao=request.descricao
    )
    codigos = set(request.permissoes)
    existentes = (
        set(
            (await session.execute(select(PermissaoModel.id).where(PermissaoModel.id.in_(codigos))))
            .scalars()
            .all()
        )
        if codigos
        else set()
    )
    if codigos != existentes:
        raise NotFoundException("Uma ou mais permissões não existem.")

    try:
        session.add(perfil)
        session.add_all(
            [
                PerfilPermissaoModel(perfil_id=perfil.id, permissao_id=code)
                for code in sorted(codigos)
            ]
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictException("Já existe um perfil com este nome.") from exc
    except Exception:
        await session.rollback()
        raise

    return PerfilResponse(
        id=perfil.id,
        nome=perfil.nome,
        descricao=perfil.descricao,
        permissoes=sorted(codigos),
    )


@router.put("/{perfil_id}/permissoes", response_model=PerfilResponse)
async def definir_permissoes(
    perfil_id: UUID,
    request: DefinirPermissoesRequest,
    usuario: UsuarioAutenticado = Depends(get_usuario_atual),
    session: AsyncSession = Depends(get_session),
):
    exigir_permissao(usuario, "perfis.gerenciar")
    perfil = await session.get(PerfilModel, perfil_id)
    if perfil is None or perfil.unidade_id != usuario.unidade_id:
        raise NotFoundException("Perfil não encontrado.")
    if perfil.codigo is not None:
        raise ConflictException("Os perfis padrão do sistema não podem ser alterados.")
    codigos = set(request.permissoes)
    existentes = (
        set(
            (await session.execute(select(PermissaoModel.id).where(PermissaoModel.id.in_(codigos))))
            .scalars()
            .all()
        )
        if codigos
        else set()
    )
    if codigos != existentes:
        raise NotFoundException("Uma ou mais permissões não existem.")
    await session.execute(
        delete(PerfilPermissaoModel).where(PerfilPermissaoModel.perfil_id == perfil.id)
    )
    session.add_all(
        [PerfilPermissaoModel(perfil_id=perfil.id, permissao_id=code) for code in sorted(codigos)]
    )
    await session.execute(
        update(UsuarioModel)
        .where(UsuarioModel.perfil_id == perfil.id)
        .values(auth_version=UsuarioModel.auth_version + 1)
    )
    await session.commit()
    return PerfilResponse(
        id=perfil.id,
        nome=perfil.nome,
        descricao=perfil.descricao,
        permissoes=sorted(codigos),
        codigo=perfil.codigo,
    )


@router.patch("/usuarios/{usuario_id}", status_code=204)
async def atribuir_perfil(
    usuario_id: UUID,
    request: AtribuirPerfilRequest,
    response: Response,
    usuario: UsuarioAutenticado = Depends(get_usuario_atual),
    session: AsyncSession = Depends(get_session),
):
    eh_gerente = usuario.perfil_codigo == "GERENTE"
    if eh_gerente:
        exigir_permissao(usuario, "usuarios.gerenciar")
    else:
        exigir_permissao(usuario, "perfis.gerenciar")
    alvo = await session.get(UsuarioModel, usuario_id)
    if alvo is None or alvo.unidade_id != usuario.unidade_id:
        raise NotFoundException("Usuário não encontrado.")
    if eh_gerente and alvo.responsavel_id != usuario.id:
        raise NotFoundException("Usuário não encontrado.")
    perfil = await session.get(PerfilModel, request.perfil_id)
    if perfil is None or perfil.unidade_id != usuario.unidade_id:
        raise NotFoundException("Perfil não encontrado.")
    if eh_gerente and perfil.codigo not in ("KP", "USUARIO_PADRAO"):
        raise ForbiddenException("Gerentes podem atribuir somente o perfil KP ou padrão.")
    if perfil.codigo == "KP" and not (usuario.eh_administrador or eh_gerente):
        raise ForbiddenException(
            "Apenas o administrador ou gerente responsável pode atribuir o perfil KP."
        )
    atual = await session.get(PerfilModel, alvo.perfil_id)
    if perfil.codigo == "ADMIN_UNIDADE" and (atual is None or atual.codigo != "ADMIN_UNIDADE"):
        raise ConflictException("O perfil administrador é reservado à conta bootstrap.")
    if atual and atual.codigo == "ADMIN_UNIDADE" and perfil.id != atual.id:
        raise ConflictException("O perfil administrador da conta bootstrap não pode ser removido.")
    alvo.perfil_id = request.perfil_id
    alvo.auth_version += 1
    await session.commit()
    response.status_code = 204
