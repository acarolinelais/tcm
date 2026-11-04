from typing import Protocol
from uuid import UUID

from src.application.schemas.importacao_sdf import ImportarRelatorioSdfResponse
from src.domain.common.usuario_autenticado import UsuarioAutenticado


class ImportacaoSdfService(Protocol):
    async def importar(
        self,
        usuario_atual: UsuarioAutenticado,
        projeto_id: UUID,
        nome_arquivo: str | None,
        conteudo: bytes,
    ) -> ImportarRelatorioSdfResponse: ...
