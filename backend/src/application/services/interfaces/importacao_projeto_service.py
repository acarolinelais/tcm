from typing import Protocol

from src.application.schemas.importacao_projeto import (
    ImportarProjetoPlanilhaRequest,
    ImportarProjetoPlanilhaResponse,
)
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class ImportacaoProjetoService(Protocol):
    async def importar(
        self,
        usuario_atual: UsuarioAutenticado,
        request: ImportarProjetoPlanilhaRequest,
        conteudo: bytes,
        fuso_horario: str = "UTC",
    ) -> ImportarProjetoPlanilhaResponse: ...
