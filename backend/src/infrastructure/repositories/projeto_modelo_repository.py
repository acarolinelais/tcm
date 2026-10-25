from uuid import UUID

from sqlalchemy import select

from src.domain.entities.projeto_modelo import ProjetoModelo
from src.domain.queries.modelo_do_projeto import ModeloDoProjeto
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ProjetoModeloRepositoryImpl(RepositoryBaseImpl[ProjetoModelo, ProjetoModeloModel]):
    model = ProjetoModeloModel

    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ProjetoModelo, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModeloModel).where(
                        ProjetoModeloModel.unidade_id == unidade_id,
                        ProjetoModeloModel.projeto_id == projeto_id,
                        ProjetoModeloModel.ativo.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(model) for model in modelos)

    async def listar_nomes_por_projetos(
        self, unidade_id: UUID, projeto_ids: tuple[UUID, ...]
    ) -> dict[UUID, tuple[str, ...]]:
        if not projeto_ids:
            return {}
        linhas = await self.session.execute(
            select(ProjetoModeloModel.projeto_id, ModeloDispositivoModel.nome)
            .join(
                ModeloDispositivoModel,
                (ModeloDispositivoModel.id == ProjetoModeloModel.modelo_dispositivo_id)
                & (ModeloDispositivoModel.unidade_id == ProjetoModeloModel.unidade_id),
            )
            .where(
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.projeto_id.in_(projeto_ids),
                ProjetoModeloModel.ativo.is_(True),
            )
            .order_by(ProjetoModeloModel.projeto_id, ModeloDispositivoModel.nome)
        )
        nomes: dict[UUID, list[str]] = {}
        for projeto_id, nome in linhas.all():
            nomes.setdefault(projeto_id, []).append(nome)
        return {projeto_id: tuple(itens) for projeto_id, itens in nomes.items()}

    async def listar_ids_por_projetos(
        self, unidade_id: UUID, projeto_ids: tuple[UUID, ...]
    ) -> dict[UUID, tuple[UUID, ...]]:
        if not projeto_ids:
            return {}
        linhas = await self.session.execute(
            select(ProjetoModeloModel.projeto_id, ProjetoModeloModel.modelo_dispositivo_id)
            .join(
                ModeloDispositivoModel,
                (ModeloDispositivoModel.id == ProjetoModeloModel.modelo_dispositivo_id)
                & (ModeloDispositivoModel.unidade_id == ProjetoModeloModel.unidade_id),
            )
            .where(
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.projeto_id.in_(projeto_ids),
                ProjetoModeloModel.ativo.is_(True),
                ModeloDispositivoModel.ativo.is_(True),
            )
            .order_by(ProjetoModeloModel.projeto_id, ProjetoModeloModel.modelo_dispositivo_id)
        )
        ids: dict[UUID, list[UUID]] = {}
        for projeto_id, modelo_id in linhas.all():
            ids.setdefault(projeto_id, []).append(modelo_id)
        return {projeto_id: tuple(itens) for projeto_id, itens in ids.items()}

    async def substituir_modelos(
        self, unidade_id: UUID, projeto_id: UUID, modelos_ids: tuple[UUID, ...]
    ) -> None:
        existentes = (
            (
                await self.session.execute(
                    select(ProjetoModeloModel).where(
                        ProjetoModeloModel.unidade_id == unidade_id,
                        ProjetoModeloModel.projeto_id == projeto_id,
                    )
                )
            )
            .scalars()
            .all()
        )
        por_modelo = {vinculo.modelo_dispositivo_id: vinculo for vinculo in existentes}
        desejados = set(modelos_ids)
        for modelo_id, vinculo in por_modelo.items():
            vinculo.ativo = modelo_id in desejados
        for modelo_id in desejados - por_modelo.keys():
            await self.adicionar(ProjetoModelo(unidade_id, projeto_id, modelo_id))

    async def listar_modelos_do_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ModeloDoProjeto, ...]:
        linhas = await self.session.execute(
            select(ModeloDispositivoModel.id, ModeloDispositivoModel.nome)
            .join(
                ProjetoModeloModel,
                (ModeloDispositivoModel.id == ProjetoModeloModel.modelo_dispositivo_id)
                & (ModeloDispositivoModel.unidade_id == ProjetoModeloModel.unidade_id),
            )
            .where(
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.projeto_id == projeto_id,
                ProjetoModeloModel.ativo.is_(True),
            )
            .order_by(ModeloDispositivoModel.nome)
        )
        return tuple(ModeloDoProjeto(*linha) for linha in linhas.all())

    def _to_entity(self, model: ProjetoModeloModel) -> ProjetoModelo:
        vinculo = ProjetoModelo(model.unidade_id, model.projeto_id, model.modelo_dispositivo_id)
        vinculo.id = model.id
        vinculo.ativo = model.ativo
        vinculo.created_at = model.created_at
        vinculo.updated_at = model.updated_at
        return vinculo

    def _to_model(self, entity: ProjetoModelo) -> ProjetoModeloModel:
        return ProjetoModeloModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            modelo_dispositivo_id=entity.modelo_dispositivo_id,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
