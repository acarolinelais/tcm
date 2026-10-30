from dataclasses import dataclass

from src.domain.common.cor_avatar import CorAvatar
from src.domain.entities.caso_teste import CasoTeste


@dataclass(frozen=True)
class CasoTesteComResponsavel:
    caso: CasoTeste
    responsavel_nome: str
    responsavel_cor_avatar: CorAvatar
