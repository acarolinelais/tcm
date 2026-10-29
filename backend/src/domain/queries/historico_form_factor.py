from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID


@dataclass(frozen=True)
class CasoHistorico:
    """Test Case de um projeto na tela Resultados Gerais (spec 032), com o ID externo do tester."""

    caso_teste_id: UUID
    projeto_id: UUID
    tc_id: str
    responsavel_id: UUID
    responsavel_identificador: str | None


@dataclass(frozen=True)
class LinhaHistoricoExecucao:
    """Resultado de um modelo numa execução válida do projeto, com o dia no fuso pedido."""

    caso_teste_id: UUID
    dia: date
    modelo_dispositivo_id: UUID
    resultado: str
    execucao_id: UUID
    sdf_id: str | None
    origem: str
    data_reportada: datetime
