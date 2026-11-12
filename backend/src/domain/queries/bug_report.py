from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class FalhaSdf:
    """Um resultado que é falha (spec 072, RN-01) e ainda está na página."""

    modelo_dispositivo_id: UUID
    modelo_nome: str
    sdf_id: str | None
    resultado: str
    descricao: str | None
    data_execucao: datetime
    # Spec 073: a tentativa de correção em que a falha entrou; nula nas falhas anteriores a ela.
    tentativa: int | None = None


@dataclass(frozen=True)
class CasoComFalhas:
    """Uma linha de SDF Failures: o caso e as falhas dele, da mais recente para a mais antiga."""

    caso_teste_id: UUID
    tc_id: str
    status: str
    time_id: UUID
    responsavel_id: UUID
    responsavel_identificador: str | None
    backup_id: UUID | None
    dev_fix_id: UUID | None
    dev_fix_identificador: str | None
    falhas: tuple[FalhaSdf, ...]
    # Spec 073: a tentativa de correção do caso e quando a atual entrou em In Review.
    tentativa_correcao: int = 0
    correcao_em_revisao_em: datetime | None = None


@dataclass(frozen=True, kw_only=True)
class FiltrosBugReport:
    projeto_id: UUID
    modelo_dispositivo_id: UUID | None = None
    responsavel: str | None = None
    dev_fix: str | None = None
    # Dia ou semana da execução (RN-09), em UTC sem fuso, com o fim exclusivo.
    inicio: datetime | None = None
    fim: datetime | None = None
    # Spec 073: só os casos a partir da segunda tentativa de correção (filtro Reincidentes).
    reincidentes: bool = False
    # Spec 073 (My Fixes): só os casos em correção desta pessoa, e filtro por Status.
    corretor_id: UUID | None = None
    status: tuple[str, ...] = ()
