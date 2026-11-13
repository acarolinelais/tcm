from uuid import UUID

from sqlalchemy import func, or_, select

from src.domain.common.paged_result import PagedResult
from src.domain.entities.correcao import Correcao, ResultadoCorrecao
from src.domain.queries.correcao_concluida import CorrecaoConcluida, FiltrosCorrecoesConcluidas
from src.domain.queries.resumo_overview import EscopoOverview
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.correcao_model import CorrecaoModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


def dia_no_fuso(coluna, fuso_horario: str):
    """O dia de uma data gravada em UTC sem fuso, no fuso pedido."""
    return func.date(func.timezone(fuso_horario, func.timezone("UTC", coluna)))


def dias_ate_corrigir(fuso_horario: str):
    """Spec 076, RN-09: dias corridos entre a falha e o fechamento, no fuso de quem consulta."""
    return dia_no_fuso(CorrecaoModel.fechada_em, fuso_horario) - dia_no_fuso(
        CorrecaoModel.falha_em, fuso_horario
    )


class CorrecaoRepositoryImpl(RepositoryBaseImpl[Correcao, CorrecaoModel]):
    model = CorrecaoModel

    async def obter_aberta(self, unidade_id: UUID, caso_teste_id: UUID) -> Correcao | None:
        return await self._uma(
            CorrecaoModel.unidade_id == unidade_id,
            CorrecaoModel.caso_teste_id == caso_teste_id,
            CorrecaoModel.resultado.is_(None),
        )

    async def obter_por_tentativa(
        self, unidade_id: UUID, caso_teste_id: UUID, tentativa: int
    ) -> Correcao | None:
        return await self._uma(
            CorrecaoModel.unidade_id == unidade_id,
            CorrecaoModel.caso_teste_id == caso_teste_id,
            CorrecaoModel.tentativa == tentativa,
        )

    async def listar_por_importacao(
        self, unidade_id: UUID, importacao_sdf_id: UUID
    ) -> tuple[Correcao, ...]:
        modelos = await self.session.scalars(
            select(CorrecaoModel).where(
                CorrecaoModel.unidade_id == unidade_id,
                CorrecaoModel.ativo.is_(True),
                or_(
                    CorrecaoModel.aberta_por_importacao_id == importacao_sdf_id,
                    CorrecaoModel.fechada_por_importacao_id == importacao_sdf_id,
                ),
            )
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    async def listar_concluidas(
        self,
        unidade_id: UUID,
        escopo: EscopoOverview,
        filtros: FiltrosCorrecoesConcluidas,
        page: int,
        page_size: int,
        fuso_horario: str,
    ) -> PagedResult[CorrecaoConcluida]:
        condicoes = [
            CorrecaoModel.unidade_id == unidade_id,
            CorrecaoModel.ativo.is_(True),
            CorrecaoModel.resultado.is_not(None),
            CasoTesteModel.projeto_id == filtros.projeto_id,
            CasoTesteModel.ativo.is_(True),
            ProjetoModel.ativo.is_(True),
        ]
        if escopo.time_ids is not None:
            condicoes.append(ProjetoModel.time_id.in_(escopo.time_ids))
        if escopo.pessoa_id is not None:
            # RN-13: o dev vê só as tentativas em que era o corretor.
            condicoes.append(CorrecaoModel.corretor_id == escopo.pessoa_id)
        if filtros.corretor_id is not None:
            condicoes.append(CorrecaoModel.corretor_id == filtros.corretor_id)
        if filtros.resultado is not None:
            condicoes.append(CorrecaoModel.resultado == filtros.resultado)
        if filtros.inicio is not None:
            condicoes.append(CorrecaoModel.fechada_em >= filtros.inicio)
        if filtros.fim is not None:
            condicoes.append(CorrecaoModel.fechada_em < filtros.fim)
        base = (
            select(CorrecaoModel.id)
            .join(CasoTesteModel, CasoTesteModel.id == CorrecaoModel.caso_teste_id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .where(*condicoes)
        )
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        linhas = await self.session.execute(
            select(
                CorrecaoModel.id,
                CorrecaoModel.caso_teste_id,
                CasoTesteModel.tc_id,
                CorrecaoModel.tentativa,
                CorrecaoModel.origem,
                CorrecaoModel.corretor_id,
                UsuarioModel.user_id,
                CorrecaoModel.falha_em,
                CorrecaoModel.em_revisao_em,
                CorrecaoModel.fechada_em,
                CorrecaoModel.resultado,
                dias_ate_corrigir(fuso_horario),
            )
            .join(CasoTesteModel, CasoTesteModel.id == CorrecaoModel.caso_teste_id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .outerjoin(UsuarioModel, UsuarioModel.id == CorrecaoModel.corretor_id)
            .where(*condicoes)
            # Uma importação fecha várias tentativas na mesma data: o id desempata as páginas.
            .order_by(
                CorrecaoModel.fechada_em.desc(),
                CorrecaoModel.tentativa.desc(),
                CorrecaoModel.id,
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return PagedResult(
            [CorrecaoConcluida(*linha) for linha in linhas.tuples()], page, page_size, total or 0
        )

    async def _uma(self, *filtros) -> Correcao | None:
        modelo = await self.session.scalar(
            select(CorrecaoModel).where(CorrecaoModel.ativo.is_(True), *filtros)
        )
        return self._to_entity(modelo) if modelo is not None else None

    def _to_entity(self, model: CorrecaoModel) -> Correcao:
        correcao = Correcao(
            model.unidade_id,
            model.caso_teste_id,
            model.tentativa,
            model.origem,
            model.falha_em,
            model.aberta_por_importacao_id,
        )
        correcao.id = model.id
        correcao.em_revisao_em = model.em_revisao_em
        correcao.fechada_em = model.fechada_em
        correcao.resultado = ResultadoCorrecao(model.resultado) if model.resultado else None
        correcao.corretor_id = model.corretor_id
        correcao.fechada_por_importacao_id = model.fechada_por_importacao_id
        correcao.ativo = model.ativo
        correcao.created_at = model.created_at
        correcao.updated_at = model.updated_at
        return correcao

    def _to_model(self, entity: Correcao) -> CorrecaoModel:
        return CorrecaoModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            caso_teste_id=entity.caso_teste_id,
            tentativa=entity.tentativa,
            origem=entity.origem.value,
            falha_em=entity.falha_em,
            em_revisao_em=entity.em_revisao_em,
            fechada_em=entity.fechada_em,
            resultado=entity.resultado.value if entity.resultado else None,
            corretor_id=entity.corretor_id,
            aberta_por_importacao_id=entity.aberta_por_importacao_id,
            fechada_por_importacao_id=entity.fechada_por_importacao_id,
            ativo=entity.ativo,
        )
