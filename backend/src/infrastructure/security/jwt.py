import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from dotenv import load_dotenv

from src.domain.entities.usuario import Usuario

load_dotenv()

ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_HOURS = 10
JWT_ISSUER = "sdf-manager"
JWT_AUDIENCE = "sdf-manager-api"


@dataclass(frozen=True)
class TokenPayload:
    usuario_id: UUID
    unidade_id: UUID
    nome: str = ""
    email: str = ""
    perfil: str = ""
    tem_multiplos_times: bool = False
    time_id: UUID | None = None
    sessao_id: UUID | None = None
    auth_version: int = 0


def _secret() -> str:
    secret = os.environ.get("JWT_SECRET_KEY", "")
    if len(secret.encode()) < 32:
        raise RuntimeError("JWT_SECRET_KEY deve ter pelo menos 32 bytes.")
    return secret


def validar_configuracao_jwt() -> None:
    _secret()


def criar_token(
    usuario: Usuario,
    *,
    perfil: str = "",
    tem_multiplos_times: bool = False,
    time_id: UUID | None = None,
    sessao_id: UUID | None = None,
    auth_version: int = 0,
) -> str:
    agora = datetime.now(UTC)
    payload = {
        "sub": str(usuario.id),
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": perfil,
        "unidade_id": str(usuario.unidade_id),
        "tem_multiplos_times": tem_multiplos_times,
        "time_id": str(time_id) if time_id else None,
        "sid": str(sessao_id or uuid4()),
        "ver": auth_version,
        "jti": str(uuid4()),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": agora,
        "exp": agora + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decodificar_token(token: str) -> TokenPayload | None:
    try:
        payload = jwt.decode(
            token,
            _secret(),
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={
                "require": [
                    "sub",
                    "nome",
                    "email",
                    "perfil",
                    "unidade_id",
                    "tem_multiplos_times",
                    "ver",
                    "iss",
                    "aud",
                    "iat",
                    "exp",
                    "jti",
                    "sid",
                ]
            },
        )
        usuario_id = UUID(payload["sub"])
        unidade_id = UUID(payload["unidade_id"])
        sessao_id = UUID(payload["sid"])
        tem_multiplos_times = payload.get("tem_multiplos_times", False)
        auth_version = payload.get("ver", 0)
        if not isinstance(tem_multiplos_times, bool):
            return None
        if not isinstance(auth_version, int) or isinstance(auth_version, bool) or auth_version < 0:
            return None
        if not all(isinstance(payload[key], str) for key in ("nome", "email", "perfil", "jti")):
            return None
        UUID(payload["jti"])
        time_id = UUID(payload["time_id"]) if payload.get("time_id") else None
        return TokenPayload(
            usuario_id,
            unidade_id,
            str(payload.get("nome", "")),
            str(payload.get("email", "")),
            str(payload.get("perfil", "")),
            tem_multiplos_times,
            time_id,
            sessao_id,
            auth_version,
        )
    except (jwt.PyJWTError, KeyError, TypeError, ValueError, RuntimeError):
        return None
