from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import case, func, or_, select, update

from src.domain.common.cor_avatar import CorAvatar
from src.domain.common.paged_result import PagedResult
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
    StatusCasoTeste,
)
from src.domain.queries.caso_teste_com_responsavel import CasoTesteComResponsavel
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.historico_form_factor_repository import (
    _ordem_de_gravacao,
    _resultados_validos,
)
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class CasoTesteRepositoryImpl(RepositoryBaseImpl[CasoTeste, CasoTesteModel]):
    model = CasoTesteModel

    async def listar_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        responsavel_ids: Sequence[UUID] | None = None,
        priorizar_responsavel_id: UUID | None = None,
        associado_usuario_id: UUID | None = None,
        data_final_inicio: datetime | None = None,
        data_final_fim: datetime | None = None,
    ) -> PagedResult[CasoTeste]:
        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
        ]
        if responsavel_ids:
            filtros.append(CasoTesteModel.responsavel_id.in_(responsavel_ids))
        if data_final_inicio is not None and data_final_fim is not None:
            # Semana da End date (spec 065, RN-10): a finalização de tudo, sem depender do Status.
            filtros.extend(
                (
                    CasoTesteModel.ativo.is_(True),
                    CasoTesteModel.all_passed_em >= data_final_inicio,
                    CasoTesteModel.all_passed_em < data_final_fim,
                )
            )
        if associado_usuario_id is not None:
            filtros.extend(
                (
                    CasoTesteModel.ativo.is_(True),
                    or_(
                        CasoTesteModel.responsavel_id == associado_usuario_id,
                        CasoTesteModel.backup_id == associado_usuario_id,
                    ),
                )
            )
        total = (
            await self.session.execute(
                select(func.count()).select_from(CasoTesteModel).where(*filtros)
            )
        ).scalar_one()
        ordenacao = [CasoTesteModel.tc_id, CasoTesteModel.id]
        if priorizar_responsavel_id is not None:
            # Casos em que o usuário é o responsável principal vêm primeiro; ser backup não conta.
            ordenacao.insert(
                0, case((CasoTesteModel.responsavel_id == priorizar_responsavel_id, 0), else_=1)
            )
        modelos = (
            (
                await self.session.execute(
                    select(CasoTesteModel)
                    .where(*filtros)
                    .order_by(*ordenacao)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            )
            .scalars()
            .all()
        )
        return PagedResult([self._to_entity(modelo) for modelo in modelos], page, page_size, total)

    async def existe_tc_id(self, unidade_id: UUID, projeto_id: UUID, tc_id: str) -> bool:
        encontrado = await self.session.execute(
            select(CasoTesteModel.id)
            .where(
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.projeto_id == projeto_id,
                CasoTesteModel.tc_id == tc_id,
            )
            .limit(1)
        )
        return encontrado.scalar_one_or_none() is not None

    async def obter_por_projeto_tc_id(
        self, unidade_id: UUID, projeto_id: UUID, tc_id: str
    ) -> CasoTeste | None:
        modelo = (
            await self.session.execute(
                select(CasoTesteModel).where(
                    CasoTesteModel.unidade_id == unidade_id,
                    CasoTesteModel.projeto_id == projeto_id,
                    CasoTesteModel.tc_id == tc_id,
                    CasoTesteModel.ativo.is_(True),
                )
            )
        ).scalar_one_or_none()
        return self._to_entity(modelo) if modelo is not None else None

    async def listar_em_validacao(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[CasoTeste, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(CasoTesteModel)
                    .where(
                        CasoTesteModel.unidade_id == unidade_id,
                        CasoTesteModel.projeto_id == projeto_id,
                        CasoTesteModel.ativo.is_(True),
                        CasoTesteModel.status == StatusCasoTeste.IN_VALIDATION.value,
                    )
                    .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    async def listar_cards_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[CasoTesteComResponsavel, ...]:
        # shortcut: sem paginação, cabe até alguns milhares de casos por projeto (spec 037, RN-10);
        # paginar por coluna se um projeto passar disso.
        linhas = await self.session.execute(
            select(CasoTesteModel, UsuarioModel.nome, UsuarioModel.cor_avatar)
            .join(UsuarioModel, UsuarioModel.id == CasoTesteModel.responsavel_id)
            .where(
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.projeto_id == projeto_id,
                CasoTesteModel.ativo.is_(True),
            )
            .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
        )
        return tuple(
            CasoTesteComResponsavel(self._to_entity(modelo), nome, CorAvatar(cor or CorAvatar.AZUL))
            for modelo, nome, cor in linhas
        )

    async def listar_todos_aprovados(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> set[UUID]:
        """Casos com o último resultado de cada device do projeto em PASS (spec 066, RN-02).

        Diferente do `all_passed_em`, que fica fixo, isto reflete os resultados de hoje.
        """
        if not caso_ids:
            return set()
        await self.session.flush()
        aprovados = self._aprovados(unidade_id, projeto_id, caso_ids)
        return set((await self.session.execute(select(aprovados.c.caso_teste_id))).scalars())

    async def marcar_todos_aprovados(
        self, unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]
    ) -> None:
        """Grava a finalização de tudo (spec 065) nos casos que fecharam e ainda não a têm.

        A data é a mais recente entre os últimos resultados de cada device (RN-03 a RN-08). A
        migration g065 repete esta regra em SQL para o retroativo.
        """
        if not caso_ids:
            return
        # Os resultados recém-adicionados na sessão precisam estar no banco para o UPDATE.
        await self.session.flush()
        aprovados = self._aprovados(unidade_id, projeto_id, caso_ids)
        await self.session.execute(
            update(CasoTesteModel)
            .where(
                CasoTesteModel.id == aprovados.c.caso_teste_id,
                CasoTesteModel.unidade_id == unidade_id,
                CasoTesteModel.all_passed_em.is_(None),
            )
            # Mantém o updated_at: sem isso o onupdate do model muda a End date de um caso Done.
            .values(all_passed_em=aprovados.c.data, updated_at=CasoTesteModel.updated_at)
            # Nenhum caminho lê o caso da sessão depois deste UPDATE (plan, Riscos).
            .execution_options(synchronize_session=False)
        )

    async def limpar_todos_aprovados(self, unidade_id: UUID, caso_ids: Sequence[UUID]) -> None:
        if not caso_ids:
            return
        await self.session.flush()
        await self.session.execute(
            update(CasoTesteModel)
            .where(CasoTesteModel.unidade_id == unidade_id, CasoTesteModel.id.in_(caso_ids))
            .values(all_passed_em=None, updated_at=CasoTesteModel.updated_at)
            .execution_options(synchronize_session=False)
        )

    @staticmethod
    def _aprovados(unidade_id: UUID, projeto_id: UUID, caso_ids: Sequence[UUID]):
        """Casos (e a data mais recente) em que cada device ativo do projeto tem resultado e o mais
        recente de cada um é PASS, com a ordem de "mais recente" da General Results."""
        posicao = (
            func.row_number()
            .over(
                partition_by=(
                    ExecucaoSdfModel.caso_teste_id,
                    ResultadoFormFactorModel.modelo_dispositivo_id,
                ),
                order_by=(
                    ExecucaoSdfModel.data_reportada.desc(),
                    _ordem_de_gravacao().desc(),
                    ExecucaoSdfModel.id.desc(),
                ),
            )
            .label("posicao")
        )
        ultimos = (
            _resultados_validos(
                unidade_id,
                projeto_id,
                ExecucaoSdfModel.caso_teste_id.label("caso_teste_id"),
                ResultadoFormFactorModel.resultado.label("resultado"),
                ExecucaoSdfModel.data_reportada.label("data_reportada"),
                posicao,
            )
            .where(ExecucaoSdfModel.caso_teste_id.in_(caso_ids))
            .subquery()
        )
        devices_do_projeto = (
            select(func.count())
            .select_from(ProjetoModeloModel)
            .where(
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.projeto_id == projeto_id,
                ProjetoModeloModel.ativo.is_(True),
            )
            .scalar_subquery()
        )
        aprovados = (
            select(
                ultimos.c.caso_teste_id,
                func.max(ultimos.c.data_reportada).label("data"),
            )
            .where(ultimos.c.posicao == 1)
            .group_by(ultimos.c.caso_teste_id)
            .having(
                func.bool_and(func.upper(func.trim(ultimos.c.resultado)) == "PASS"),
                func.count() == devices_do_projeto,
            )
            .subquery()
        )
        return aprovados

    def _to_entity(self, model: CasoTesteModel) -> CasoTeste:
        caso = CasoTeste(
            model.unidade_id,
            model.projeto_id,
            model.tc_id,
            CategoriaCasoTeste(model.category),
            DificuldadeCasoTeste(model.difficulty),
            model.responsavel_id,
            model.backup_id,
            SituacaoCasoTeste(model.situation),
            StatusCasoTeste(model.status),
            exigir_backup=False,
            automation_level=(
                None
                if model.automation_level is None
                else NivelAutomacaoCasoTeste(model.automation_level)
            ),
            justificativa_exclusao=model.justificativa_exclusao,
            title=model.title,
            precondition=model.precondition,
            procedure=model.procedure,
            expected_result=model.expected_result,
        )
        caso.id = model.id
        caso.code_done_em = model.code_done_em
        caso.all_passed_em = model.all_passed_em
        caso.ativo = model.ativo
        caso.created_at = model.created_at
        caso.updated_at = model.updated_at
        return caso

    def _to_model(self, entity: CasoTeste) -> CasoTesteModel:
        return CasoTesteModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            tc_id=entity.tc_id,
            category=entity.category.value,
            difficulty=entity.difficulty.value,
            automation_level=(
                None if entity.automation_level is None else entity.automation_level.value
            ),
            situation=entity.situation.value,
            status=entity.status.value,
            responsavel_id=entity.responsavel_id,
            backup_id=entity.backup_id,
            justificativa_exclusao=entity.justificativa_exclusao,
            title=entity.title,
            precondition=entity.precondition,
            procedure=entity.procedure,
            expected_result=entity.expected_result,
            code_done_em=entity.code_done_em,
            all_passed_em=entity.all_passed_em,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
