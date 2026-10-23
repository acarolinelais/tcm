import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from dotenv import load_dotenv

from src.domain.entities.usuario import Usuario

load_dotenv()

ALGORITHM = "HS256"
EXPIRA_EM_MINUTOS = 60


@dataclass(frozen=True)
class TokenPayload:
    usuario_id: UUID
    unidade_id: UUID
    admin_unidade: bool


def criar_token(usuario: Usuario) -> str:
    agora = datetime.now(UTC)
    payload = {
        "sub": str(usuario.id),
        "unidade_id": str(usuario.unidade_id),
        "admin_unidade": usuario.admin_unidade,
        "iat": agora,
        "exp": agora + timedelta(minutes=EXPIRA_EM_MINUTOS),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET_KEY"], algorithm=ALGORITHM)


def decodificar_token(token: str) -> TokenPayload | None:
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET_KEY"], algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return TokenPayload(
        usuario_id=UUID(payload["sub"]),
        unidade_id=UUID(payload["unidade_id"]),
        admin_unidade=payload["admin_unidade"],
    )
