from dataclasses import dataclass

from src.domain.entities.caso_teste import CasoTeste


@dataclass(frozen=True)
class CasoTesteComResponsavel:
    caso: CasoTeste
    responsavel_nome: str
