from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.entities.rodada_form_factor import RodadaFormFactor
from src.infrastructure.data.base import Base


class RodadaFormFactorModel(Base):
    __tablename__ = "rodadas_form_factor"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    unidade_id: Mapped[UUID] = mapped_column(ForeignKey("unidades.id"), nullable=False)
    projeto_id: Mapped[UUID] = mapped_column(ForeignKey("projetos.id"), nullable=False)
    criada_por: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    sdf_id: Mapped[str | None] = mapped_column(String(RodadaFormFactor.SDF_ID_MAX_LENGTH))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
