from typing import Protocol
from uuid import UUID

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.link_pull_request import LinkPullRequest
from src.domain.queries.link_pull_request_com_autor import LinkPullRequestComAutor


class LinkPullRequestRepository(RepositoryBase[LinkPullRequest], Protocol):
    async def listar_ativos_por_caso(
        self, unidade_id: UUID, caso_teste_id: UUID
    ) -> tuple[LinkPullRequestComAutor, ...]: ...

    async def existe_ativo(self, unidade_id: UUID, caso_teste_id: UUID, url: str) -> bool: ...
