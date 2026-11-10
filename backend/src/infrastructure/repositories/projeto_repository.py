from uuid import UUID

from sqlalchemy import and_, case, func, or_, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.projeto import Projeto, StatusProjeto
from src.domain.queries.linha_navegacao_board import LinhaNavegacaoBoard
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_membro_model import TimeMembroModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ProjetoRepositoryImpl(RepositoryBaseImpl[Projeto, ProjetoModel]):
    model = ProjetoModel

    async def tem_atribuicoes_fora_do_time(
        self, unidade_id: UUID, projeto_id: UUID, time_id: UUID
    ) -> bool:
        membros_ativos = select(TimeMembroModel.usuario_id).where(
            TimeMembroModel.unidade_id == unidade_id,
            TimeMembroModel.time_id == time_id,
            TimeMembroModel.ativo.is_(True),
        )
        atribuicao_invalida = select(CasoTesteModel.id).where(
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
            CasoTesteModel.ativo.is_(True),
            or_(
                ~CasoTesteModel.responsavel_id.in_(membros_ativos),
                and_(
                    CasoTesteModel.backup_id.is_not(None),
                    ~CasoTesteModel.backup_id.in_(membros_ativos),
                ),
            ),
        )
        return (await self.session.execute(select(atribuicao_invalida.exists()))).scalar_one()

    async def listar_associados_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...] | None,
        usuario_id: UUID,
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]:
        if time_ids == ():
            return PagedResult([], page, page_size, 0)
        associado = (
            select(CasoTesteModel.id)
            .where(
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.projeto_id == ProjetoModel.id,
                CasoTesteModel.ativo.is_(True),
                # Spec 072, RN-15: o Dev Fix também chega ao projeto pelo seletor.
                or_(
                    CasoTesteModel.responsavel_id == usuario_id,
                    CasoTesteModel.backup_id == usuario_id,
                    CasoTesteModel.dev_fix_id == usuario_id,
                ),
            )
            .exists()
        )
        filtros = (
            ProjetoModel.unidade_id == unidade_id,
            ProjetoModel.ativo.is_(True),
            ProjetoModel.time_id.in_(time_ids) if time_ids is not None else True,
            associado,
        )
        total = (
            await self.session.execute(
                select(func.count()).select_from(ProjetoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModel)
                    .where(*filtros)
                    .order_by(ProjetoModel.created_at.desc(), ProjetoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def adicionar(self, entity: Projeto) -> None:
        # A importação adiciona Projeto e Test Cases na mesma unidade de trabalho, mas
        # não há relacionamento ORM entre as entidades para ordenar o flush automaticamente.
        # Persista o projeto primeiro para que as linhas de Test Case encontrem a FK.
        self.session.add(self._to_model(entity))
        await self.session.flush()

    async def listar_por_times(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...],
        page: int,
        page_size: int,
    ) -> PagedResult[Projeto]:
        if not time_ids:
            return PagedResult([], page, page_size, 0)
        filtros = [ProjetoModel.unidade_id == unidade_id, ProjetoModel.ativo.is_(True)]
        filtros.append(ProjetoModel.time_id.in_(time_ids))
        total = (
            await self.session.execute(
                select(func.count()).select_from(ProjetoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModel)
                    .where(*filtros)
                    .order_by(ProjetoModel.created_at.desc(), ProjetoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def listar_paginado(
        self, unidade_id: UUID, page: int, page_size: int
    ) -> PagedResult[Projeto]:
        filtros = (ProjetoModel.unidade_id == unidade_id, ProjetoModel.ativo.is_(True))
        total = (
            await self.session.execute(
                select(func.count()).select_from(ProjetoModel).where(*filtros)
            )
        ).scalar_one()
        modelos = (
            (
                await self.session.execute(
                    select(ProjetoModel)
                    .where(*filtros)
                    .order_by(ProjetoModel.created_at.desc(), ProjetoModel.id)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(model) for model in modelos], page, page_size, total)

    async def listar_navegacao(
        self, unidade_id: UUID, time_ids: tuple[UUID, ...] | None
    ) -> tuple[LinhaNavegacaoBoard, ...]:
        # time_ids None = a unidade inteira (admin). O outer join mantém o time sem projeto ativo.
        if time_ids == ():
            return ()
        encerrado = ProjetoModel.status.in_(
            (StatusProjeto.COMPLETED.value, StatusProjeto.CANCELED.value)
        )
        membros = (
            select(func.count())
            .where(TimeMembroModel.time_id == TimeModel.id, TimeMembroModel.ativo.is_(True))
            .correlate(TimeModel)
            .scalar_subquery()
        )
        stmt = (
            select(
                SetorModel.id,
                SetorModel.nome,
                TimeModel.id,
                TimeModel.nome,
                membros,
                ProjetoModel.id,
                ProjetoModel.nome,
                ProjetoModel.status,
            )
            .join(SetorModel, SetorModel.id == TimeModel.setor_id)
            .outerjoin(
                ProjetoModel,
                and_(ProjetoModel.time_id == TimeModel.id, ProjetoModel.ativo.is_(True)),
            )
            .where(
                TimeModel.unidade_id == unidade_id,
                TimeModel.ativo.is_(True),
                SetorModel.ativo.is_(True),
            )
            .order_by(
                SetorModel.nome,
                TimeModel.nome,
                TimeModel.id,
                case((encerrado, 1), else_=0),
                ProjetoModel.nome,
            )
        )
        if time_ids is not None:
            stmt = stmt.where(TimeModel.id.in_(time_ids))
        linhas = await self.session.execute(stmt)

        def para_linha(setor_id, setor_nome, time_id, time_nome, membros, projeto_id, nome, status):
            # Mesma ordem das colunas do select acima.
            return LinhaNavegacaoBoard(
                setor_id=setor_id,
                setor_nome=setor_nome,
                time_id=time_id,
                time_nome=time_nome,
                time_membros=membros,
                projeto_id=projeto_id,
                projeto_nome=nome,
                projeto_status=StatusProjeto(status) if status is not None else None,
            )

        return tuple(para_linha(*linha) for linha in linhas)

    async def desativar(self, unidade_id: UUID, projeto_id: UUID) -> None:
        model = (
            await self.session.execute(
                select(ProjetoModel).where(
                    ProjetoModel.unidade_id == unidade_id, ProjetoModel.id == projeto_id
                )
            )
        ).scalar_one_or_none()
        if model is not None:
            model.ativo = False

    def _to_entity(self, model: ProjetoModel) -> Projeto:
        projeto = Projeto(model.unidade_id, model.time_id, model.app, model.one_ui, model.nome)
        projeto.id = model.id
        projeto.ativo = model.ativo
        projeto.status = StatusProjeto(model.status)
        projeto.data_planejada = model.data_planejada
        projeto.planejamento_iniciado_em = model.planejamento_iniciado_em
        projeto.created_at = model.created_at
        projeto.updated_at = model.updated_at
        return projeto

    def _to_model(self, entity: Projeto) -> ProjetoModel:
        return ProjetoModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            time_id=entity.time_id,
            nome=entity.nome,
            app=entity.app,
            one_ui=entity.one_ui,
            status=entity.status.value,
            data_planejada=entity.data_planejada,
            planejamento_iniciado_em=entity.planejamento_iniciado_em,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
