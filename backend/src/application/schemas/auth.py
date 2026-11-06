from typing import Self
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from src.domain.common.cor_avatar import CorAvatar
from src.domain.common.idioma_preferido import IdiomaPreferido
from src.domain.entities.usuario import Usuario


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=Usuario.EMAIL_MAX_LENGTH)
    senha: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    expires_in: int = 900
    token_type: str = "bearer"


class SessaoEmitida(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int = 900


class AlterarSenhaRequest(BaseModel):
    nova_senha: str = Field(min_length=1, max_length=128)


class TrocarPropriaSenhaRequest(BaseModel):
    senha_atual: str = Field(min_length=1, max_length=128)
    nova_senha: str = Field(min_length=1, max_length=128)


class AtualizarPreferenciasRequest(BaseModel):
    # Atualização parcial (ADR 0043): campo ausente fica como está; null explícito é recusado.
    idioma_preferido: IdiomaPreferido | None = None
    cor_avatar: CorAvatar | None = None

    @model_validator(mode="after")
    def exigir_preferencia_informada(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Informe ao menos uma preferência.")
        if any(getattr(self, campo) is None for campo in self.model_fields_set):
            raise ValueError("As preferências informadas não podem ser nulas.")
        return self


class PreferenciasResponse(BaseModel):
    idioma_preferido: IdiomaPreferido
    cor_avatar: CorAvatar


class PerfilAtualResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    unidade_id: UUID
    unidade_nome: str
    perfil_codigo: str | None
    perfil: str | None
    permissoes: list[str]
    times: list[dict[str, str]]
    setores_gerenciados: list[UUID]
    time_atual_id: UUID | None
    tem_multiplos_times: bool
    senha_alteracao_obrigatoria: bool
    idioma_preferido: IdiomaPreferido
    cor_avatar: CorAvatar
