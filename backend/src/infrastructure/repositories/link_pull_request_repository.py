from uuid import UUID

from sqlalchemy import exists, select

from src.domain.entities.link_pull_request import LinkPullRequest
from src.domain.queries.link_pull_request_com_autor import LinkPullRequestComAutor
from src.infrastructure.data.models.link_pull_request_model import LinkPullRequestModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class LinkPullRequestRepositoryImpl(RepositoryBaseImpl[LinkPullRequest, LinkPullRequestModel]):
    model = LinkPullRequestModel

    async def listar_ativos_por_caso(
        self, unidade_id: UUID, caso_teste_id: UUID
    ) -> tuple[LinkPullRequestComAutor, ...]:
        linhas = (
            await self.session.execute(
                select(LinkPullRequestModel, UsuarioModel.nome)
                .join(UsuarioModel, UsuarioModel.id == LinkPullRequestModel.created_by)
                .where(
                    LinkPullRequestModel.unidade_id == unidade_id,
                    LinkPullRequestModel.caso_teste_id == caso_teste_id,
                    LinkPullRequestModel.ativo,
                )
                .order_by(LinkPullRequestModel.created_at.desc(), LinkPullRequestModel.id)
            )
        ).all()
        return tuple(
            LinkPullRequestComAutor(self._to_entity(model), nome) for model, nome in linhas
        )

    async def existe_ativo(self, unidade_id: UUID, caso_teste_id: UUID, url: str) -> bool:
        return bool(
            await self.session.scalar(
                select(
                    exists().where(
                        LinkPullRequestModel.unidade_id == unidade_id,
                        LinkPullRequestModel.caso_teste_id == caso_teste_id,
                        LinkPullRequestModel.url == url,
                        LinkPullRequestModel.ativo,
                    )
                )
            )
        )

    def _to_entity(self, model: LinkPullRequestModel) -> LinkPullRequest:
        link = LinkPullRequest(
            model.unidade_id, model.caso_teste_id, model.url, model.created_by, validar_url=False
        )
        link.id = model.id
        link.ativo = model.ativo
        link.created_at = model.created_at
        link.updated_at = model.updated_at
        return link

    def _to_model(self, entity: LinkPullRequest) -> LinkPullRequestModel:
        return LinkPullRequestModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            caso_teste_id=entity.caso_teste_id,
            url=entity.url,
            created_by=entity.created_by,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
