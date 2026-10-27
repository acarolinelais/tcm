from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class FormFactorLinha:
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    sdf_id: str | None
    data_reportada: datetime | None
    resultados: dict[UUID, str]
    backup_id: UUID | None = None
    # Rodada mais recente em que o TC ainda aguarda resultados (spec 023, RN-09).
    rodada_pendente_id: UUID | None = None


@dataclass(frozen=True)
class FormFactorExecucaoLinha:
    execucao_id: UUID
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    sdf_id: str | None
    data_reportada: datetime
    origem: str
    resultados: dict[UUID, str]
    rodada_id: UUID | None = None
    resultados_registrados: bool = True


@dataclass(frozen=True)
class FormFactorModeloGlobal:
    id: UUID
    nome: str


@dataclass(frozen=True)
class FormFactorResponsavelGlobal:
    id: UUID
    identificador: str


@dataclass(frozen=True)
class FormFactorLinhaGlobal:
    projeto_id: UUID
    projeto_nome: str
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    modelos_ids: tuple[UUID, ...]
    sdf_id: str | None
    data_reportada: datetime | None
    resultados: dict[UUID, str]


@dataclass(frozen=True)
class FormFactorExecucaoLinhaGlobal:
    execucao_id: UUID
    projeto_id: UUID
    projeto_nome: str
    caso_teste_id: UUID
    tc_id: str
    responsavel_id: UUID
    modelos_ids: tuple[UUID, ...]
    sdf_id: str | None
    data_reportada: datetime
    origem: str
    resultados: dict[UUID, str]
    rodada_id: UUID | None = None
    resultados_registrados: bool = True
