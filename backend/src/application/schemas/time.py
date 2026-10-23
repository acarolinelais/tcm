from uuid import UUID

from pydantic import BaseModel, Field

from src.domain.common.papel_time import PapelTime
from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro


class CriarTimeRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Time.NOME_MAX_LENGTH)
    setor_id: UUID
    gerente_id: UUID | None = None


class AdicionarMembroRequest(BaseModel):
    usuario_id: UUID
    papel: PapelTime = PapelTime.DEV


class AtualizarPapelMembroRequest(BaseModel):
    papel: PapelTime


class TimeResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    setor_id: UUID
    nome: str
    gerente_id: UUID | None
    ativo: bool


class TimeMembroResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    time_id: UUID
    usuario_id: UUID
    usuario_nome: str | None = None
    usuario_perfil: str | None = None
    usuario_perfil_codigo: str | None = None
    papel: PapelTime
    ativo: bool


def to_response(time: Time) -> TimeResponse:
    return TimeResponse(
        id=time.id,
        unidade_id=time.unidade_id,
        setor_id=time.setor_id,
        nome=time.nome,
        gerente_id=time.gerente_id,
        ativo=time.ativo,
    )


def membro_to_response(
    membro: TimeMembro,
    usuario_nome: str | None = None,
    usuario_perfil: str | None = None,
    usuario_perfil_codigo: str | None = None,
) -> TimeMembroResponse:
    return TimeMembroResponse(
        id=membro.id,
        unidade_id=membro.unidade_id,
        time_id=membro.time_id,
        usuario_id=membro.usuario_id,
        usuario_nome=usuario_nome,
        usuario_perfil=usuario_perfil,
        usuario_perfil_codigo=usuario_perfil_codigo,
        papel=membro.papel,
        ativo=membro.ativo,
    )
