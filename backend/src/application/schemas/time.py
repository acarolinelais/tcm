from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.domain.entities.time import Time
from src.domain.entities.time_membro import TimeMembro


class CriarTimeRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=Time.NOME_MAX_LENGTH)
    setor_id: UUID
    gerente_id: UUID | None = None


class AtualizarTimeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str = Field(min_length=1, max_length=Time.NOME_MAX_LENGTH)

    @field_validator("nome")
    @classmethod
    def nome_nao_pode_ser_vazio(cls, nome: str) -> str:
        nome = nome.strip()
        if not nome:
            raise ValueError("O nome do time é obrigatório.")
        return nome


class AdicionarMembroRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    usuario_id: UUID


class TimeResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    setor_id: UUID
    setor_nome: str | None = None
    nome: str
    gerente_id: UUID | None
    ativo: bool


class TimeMembroResponse(BaseModel):
    id: UUID
    unidade_id: UUID
    time_id: UUID
    usuario_id: UUID
    usuario_nome: str | None = None
    usuario_user_id: str | None = None
    usuario_perfil: str | None = None
    usuario_perfil_codigo: str | None = None
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
    usuario_user_id: str | None = None,
    usuario_perfil: str | None = None,
    usuario_perfil_codigo: str | None = None,
) -> TimeMembroResponse:
    return TimeMembroResponse(
        id=membro.id,
        unidade_id=membro.unidade_id,
        time_id=membro.time_id,
        usuario_id=membro.usuario_id,
        usuario_nome=usuario_nome,
        usuario_user_id=usuario_user_id,
        usuario_perfil=usuario_perfil,
        usuario_perfil_codigo=usuario_perfil_codigo,
        ativo=membro.ativo,
    )
