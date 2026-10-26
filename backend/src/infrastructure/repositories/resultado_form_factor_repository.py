from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on

from src.domain.common.paged_result import PagedResult
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.queries.form_factor_linha import (
    FormFactorExecucaoLinha,
    FormFactorExecucaoLinhaGlobal,
    FormFactorLinha,
    FormFactorLinhaGlobal,
    FormFactorModeloGlobal,
    FormFactorResponsavelGlobal,
)
from src.infrastructure.data.models.caso_teste_model import CasoTesteModel
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.projeto_modelo_model import ProjetoModeloModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.rodada_form_factor_model import RodadaFormFactorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ResultadoFormFactorRepositoryImpl(
    RepositoryBaseImpl[ResultadoFormFactor, ResultadoFormFactorModel]
):
    model = ResultadoFormFactorModel

    async def listar_responsaveis_form_factor_global(
        self, unidade_id: UUID, time_ids: tuple[UUID, ...] | None, projeto_id: UUID | None = None
    ) -> tuple[FormFactorResponsavelGlobal, ...]:
        if time_ids == ():
            return ()
        linhas = (
            await self.session.execute(
                select(UsuarioModel.id, UsuarioModel.user_id, UsuarioModel.nome)
                .join(CasoTesteModel, CasoTesteModel.responsavel_id == UsuarioModel.id)
                .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
                .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
                .where(
                    UsuarioModel.unidade_id == unidade_id,
                    CasoTesteModel.unidade_id == unidade_id,
                    CasoTesteModel.ativo.is_(True),
                    ProjetoModel.unidade_id == unidade_id,
                    ProjetoModel.ativo.is_(True),
                    TimeModel.unidade_id == unidade_id,
                    TimeModel.ativo.is_(True),
                    TimeModel.id.in_(time_ids) if time_ids is not None else True,
                    ProjetoModel.id == projeto_id if projeto_id is not None else True,
                )
                .distinct()
                .order_by(UsuarioModel.user_id, UsuarioModel.nome, UsuarioModel.id)
            )
        ).all()
        return tuple(
            FormFactorResponsavelGlobal(id=row.id, identificador=row.user_id or row.nome)
            for row in linhas
        )

    async def listar_modelos_form_factor_global(
        self, unidade_id: UUID, time_ids: tuple[UUID, ...] | None, projeto_id: UUID | None = None
    ) -> tuple[FormFactorModeloGlobal, ...]:
        if time_ids == ():
            return ()
        linhas = (
            await self.session.execute(
                select(ModeloDispositivoModel.id, ModeloDispositivoModel.nome)
                .join(
                    ProjetoModeloModel,
                    ProjetoModeloModel.modelo_dispositivo_id == ModeloDispositivoModel.id,
                )
                .join(ProjetoModel, ProjetoModel.id == ProjetoModeloModel.projeto_id)
                .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
                .where(
                    ProjetoModeloModel.unidade_id == unidade_id,
                    ProjetoModeloModel.ativo.is_(True),
                    ModeloDispositivoModel.unidade_id == unidade_id,
                    ModeloDispositivoModel.ativo.is_(True),
                    ProjetoModel.unidade_id == unidade_id,
                    ProjetoModel.ativo.is_(True),
                    TimeModel.unidade_id == unidade_id,
                    TimeModel.ativo.is_(True),
                    TimeModel.id.in_(time_ids) if time_ids is not None else True,
                    ProjetoModel.id == projeto_id if projeto_id is not None else True,
                )
                .distinct()
                .order_by(ModeloDispositivoModel.nome, ModeloDispositivoModel.id)
            )
        ).all()
        return tuple(FormFactorModeloGlobal(id=row.id, nome=row.nome) for row in linhas)

    def _global_execucao_valida(self, unidade_id: UUID):
        return or_(
            and_(ExecucaoSdfModel.origem == "MANUAL", ExecucaoSdfModel.importacao_sdf_id.is_(None)),
            and_(
                ExecucaoSdfModel.origem == "SDF",
                ImportacaoSdfModel.id == ExecucaoSdfModel.importacao_sdf_id,
                ImportacaoSdfModel.unidade_id == unidade_id,
                ImportacaoSdfModel.projeto_id == CasoTesteModel.projeto_id,
                ImportacaoSdfModel.ativo.is_(True),
            ),
        )

    def _global_filtros_caso(
        self,
        unidade_id,
        time_ids,
        inicio,
        fim,
        projeto_id,
        responsavel_id,
        tc_id,
        sdf_id,
        modelo_dispositivo_id,
        resultado,
    ):
        filtros = [
            CasoTesteModel.unidade_id == unidade_id,
            *([ProjetoModel.time_id.in_(time_ids)] if time_ids is not None else []),
            CasoTesteModel.ativo.is_(True),
            ProjetoModel.unidade_id == unidade_id,
            ProjetoModel.ativo.is_(True),
            TimeModel.unidade_id == unidade_id,
            TimeModel.ativo.is_(True),
        ]
        if projeto_id is not None:
            filtros.append(CasoTesteModel.projeto_id == projeto_id)
        if responsavel_id is not None:
            filtros.append(CasoTesteModel.responsavel_id == responsavel_id)
        if tc_id:
            filtros.append(CasoTesteModel.tc_id.ilike(f"%{tc_id.strip()}%"))
        if inicio is not None or fim is not None or sdf_id or modelo_dispositivo_id or resultado:
            subquery = (
                select(ResultadoFormFactorModel.id)
                .join(
                    ExecucaoSdfModel,
                    ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id,
                )
                .join(
                    ProjetoModeloModel,
                    and_(
                        ProjetoModeloModel.projeto_id == CasoTesteModel.projeto_id,
                        ProjetoModeloModel.modelo_dispositivo_id
                        == ResultadoFormFactorModel.modelo_dispositivo_id,
                    ),
                )
                .outerjoin(
                    ImportacaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id
                )
                .where(
                    ResultadoFormFactorModel.unidade_id == unidade_id,
                    ResultadoFormFactorModel.ativo.is_(True),
                    ExecucaoSdfModel.unidade_id == unidade_id,
                    ExecucaoSdfModel.ativo.is_(True),
                    ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id,
                    ProjetoModeloModel.unidade_id == unidade_id,
                    ProjetoModeloModel.ativo.is_(True),
                    self._global_execucao_valida(unidade_id),
                )
            )
            if inicio is not None:
                subquery = subquery.where(ExecucaoSdfModel.data_reportada >= inicio)
            if fim is not None:
                subquery = subquery.where(ExecucaoSdfModel.data_reportada < fim)
            if sdf_id:
                subquery = subquery.where(ExecucaoSdfModel.sdf_id.ilike(f"%{sdf_id.strip()}%"))
            if modelo_dispositivo_id is not None:
                subquery = subquery.where(
                    ResultadoFormFactorModel.modelo_dispositivo_id == modelo_dispositivo_id
                )
            if resultado:
                subquery = subquery.where(
                    func.lower(ResultadoFormFactorModel.resultado) == resultado.casefold()
                )
            filtros.append(subquery.exists())
        return filtros

    async def listar_form_factor_global(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...] | None,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        projeto_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> PagedResult[FormFactorLinhaGlobal]:
        if time_ids == ():
            return PagedResult([], page, page_size, 0)
        filtros = self._global_filtros_caso(
            unidade_id,
            time_ids,
            inicio,
            fim,
            projeto_id,
            responsavel_id,
            tc_id,
            sdf_id,
            modelo_dispositivo_id,
            resultado,
        )
        base = (
            select(CasoTesteModel.id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
            .where(*filtros)
        )
        total = (
            await self.session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()
        casos = (
            await self.session.execute(
                select(
                    CasoTesteModel.id,
                    CasoTesteModel.projeto_id,
                    ProjetoModel.app,
                    ProjetoModel.one_ui,
                    CasoTesteModel.tc_id,
                    CasoTesteModel.responsavel_id,
                )
                .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
                .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
                .where(*filtros)
                .order_by(
                    ProjetoModel.app, ProjetoModel.one_ui, CasoTesteModel.tc_id, CasoTesteModel.id
                )
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
        if not casos:
            return PagedResult([], page, page_size, total)
        caso_ids = [row.id for row in casos]
        projeto_por_caso = {row.id: row.projeto_id for row in casos}
        modelos_por_projeto: dict[UUID, list[UUID]] = {}
        assoc = (
            await self.session.execute(
                select(ProjetoModeloModel.projeto_id, ProjetoModeloModel.modelo_dispositivo_id)
                .join(
                    ModeloDispositivoModel,
                    ModeloDispositivoModel.id == ProjetoModeloModel.modelo_dispositivo_id,
                )
                .where(
                    ProjetoModeloModel.unidade_id == unidade_id,
                    ProjetoModeloModel.projeto_id.in_(set(projeto_por_caso.values())),
                    ProjetoModeloModel.ativo.is_(True),
                    ModeloDispositivoModel.unidade_id == unidade_id,
                    ModeloDispositivoModel.ativo.is_(True),
                )
            )
        ).all()
        for p_id, m_id in assoc:
            modelos_por_projeto.setdefault(p_id, []).append(m_id)

        celulas_stmt = (
            select(
                ExecucaoSdfModel.caso_teste_id,
                ResultadoFormFactorModel.modelo_dispositivo_id,
                ResultadoFormFactorModel.resultado,
                ExecucaoSdfModel.sdf_id,
                ExecucaoSdfModel.data_reportada,
                func.coalesce(ImportacaoSdfModel.created_at, ExecucaoSdfModel.created_at),
            )
            .join(ExecucaoSdfModel, ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id)
            .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
            .join(
                ProjetoModeloModel,
                and_(
                    ProjetoModeloModel.projeto_id == CasoTesteModel.projeto_id,
                    ProjetoModeloModel.modelo_dispositivo_id
                    == ResultadoFormFactorModel.modelo_dispositivo_id,
                ),
            )
            .outerjoin(
                ImportacaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id
            )
            .where(
                ExecucaoSdfModel.caso_teste_id.in_(caso_ids),
                ResultadoFormFactorModel.unidade_id == unidade_id,
                ResultadoFormFactorModel.ativo.is_(True),
                ExecucaoSdfModel.unidade_id == unidade_id,
                ExecucaoSdfModel.ativo.is_(True),
                CasoTesteModel.ativo.is_(True),
                ProjetoModel.ativo.is_(True),
                TimeModel.ativo.is_(True),
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.ativo.is_(True),
                self._global_execucao_valida(unidade_id),
            )
        )
        if inicio is not None:
            celulas_stmt = celulas_stmt.where(ExecucaoSdfModel.data_reportada >= inicio)
        if fim is not None:
            celulas_stmt = celulas_stmt.where(ExecucaoSdfModel.data_reportada < fim)
        celulas = (
            await self.session.execute(
                celulas_stmt.ext(
                    distinct_on(
                        ExecucaoSdfModel.caso_teste_id,
                        ResultadoFormFactorModel.modelo_dispositivo_id,
                    )
                ).order_by(
                    ExecucaoSdfModel.caso_teste_id,
                    ResultadoFormFactorModel.modelo_dispositivo_id,
                    ExecucaoSdfModel.data_reportada.desc(),
                    func.coalesce(
                        ImportacaoSdfModel.created_at, ExecucaoSdfModel.created_at
                    ).desc(),
                    ExecucaoSdfModel.id.desc(),
                )
            )
        ).all()
        resultado_por_caso: dict[UUID, dict[UUID, str]] = {}
        data_por_caso: dict[UUID, tuple[tuple[datetime, datetime], datetime, str | None]] = {}
        for c_id, m_id, valor, sdf, data, importada in celulas:
            resultado_por_caso.setdefault(c_id, {})[m_id] = valor
            chave = (data, importada)
            if c_id not in data_por_caso or chave > data_por_caso[c_id][0]:
                data_por_caso[c_id] = (chave, data, sdf)
        items = [
            FormFactorLinhaGlobal(
                projeto_id=row.projeto_id,
                projeto_nome=f"{row.app} {row.one_ui}",
                caso_teste_id=row.id,
                tc_id=row.tc_id,
                responsavel_id=row.responsavel_id,
                modelos_ids=tuple(modelos_por_projeto.get(row.projeto_id, ())),
                sdf_id=mais_recente[2] if (mais_recente := data_por_caso.get(row.id)) else None,
                data_reportada=mais_recente[1] if mais_recente else None,
                resultados=resultado_por_caso.get(row.id, {}),
            )
            for row in casos
        ]
        return PagedResult(items, page, page_size, total)

    async def listar_execucoes_form_factor_global(
        self,
        unidade_id: UUID,
        time_ids: tuple[UUID, ...] | None,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        projeto_id: UUID | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> PagedResult[FormFactorExecucaoLinhaGlobal]:
        if time_ids == ():
            return PagedResult([], page, page_size, 0)
        filtros = [
            ExecucaoSdfModel.unidade_id == unidade_id,
            ExecucaoSdfModel.ativo.is_(True),
            CasoTesteModel.unidade_id == unidade_id,
            *([ProjetoModel.time_id.in_(time_ids)] if time_ids is not None else []),
            CasoTesteModel.ativo.is_(True),
            ProjetoModel.unidade_id == unidade_id,
            ProjetoModel.ativo.is_(True),
            TimeModel.unidade_id == unidade_id,
            TimeModel.ativo.is_(True),
            self._global_execucao_valida(unidade_id),
        ]
        if projeto_id is not None:
            filtros.append(CasoTesteModel.projeto_id == projeto_id)
        if responsavel_id is not None:
            filtros.append(CasoTesteModel.responsavel_id == responsavel_id)
        if tc_id:
            filtros.append(CasoTesteModel.tc_id.ilike(f"%{tc_id.strip()}%"))
        if sdf_id:
            filtros.append(ExecucaoSdfModel.sdf_id.ilike(f"%{sdf_id.strip()}%"))
        if inicio is not None:
            filtros.append(ExecucaoSdfModel.data_reportada >= inicio)
        if fim is not None:
            filtros.append(ExecucaoSdfModel.data_reportada < fim)
        if origem:
            filtros.append(ExecucaoSdfModel.origem == origem)
        resultados_existentes = (
            select(ResultadoFormFactorModel.id)
            .join(
                ProjetoModeloModel,
                and_(
                    ProjetoModeloModel.projeto_id == CasoTesteModel.projeto_id,
                    ProjetoModeloModel.modelo_dispositivo_id
                    == ResultadoFormFactorModel.modelo_dispositivo_id,
                ),
            )
            .where(
                ResultadoFormFactorModel.unidade_id == unidade_id,
                ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id,
                ResultadoFormFactorModel.ativo.is_(True),
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.ativo.is_(True),
            )
        )
        filtros.append(resultados_existentes.exists())
        if modelo_dispositivo_id is not None:
            filtros.append(
                resultados_existentes.where(
                    ResultadoFormFactorModel.modelo_dispositivo_id == modelo_dispositivo_id
                ).exists()
            )
        if resultado:
            filtros.append(
                resultados_existentes.where(
                    func.lower(ResultadoFormFactorModel.resultado) == resultado.casefold()
                ).exists()
            )
        base = (
            select(ExecucaoSdfModel.id)
            .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
            .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
            .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
            .outerjoin(
                ImportacaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id
            )
            .where(*filtros)
        )
        total = (
            await self.session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()
        execucoes = (
            await self.session.execute(
                select(
                    ExecucaoSdfModel.id,
                    ExecucaoSdfModel.caso_teste_id,
                    CasoTesteModel.projeto_id,
                    ProjetoModel.app,
                    ProjetoModel.one_ui,
                    CasoTesteModel.tc_id,
                    CasoTesteModel.responsavel_id,
                    ExecucaoSdfModel.sdf_id,
                    ExecucaoSdfModel.data_reportada,
                    ExecucaoSdfModel.origem,
                    ExecucaoSdfModel.rodada_id,
                    ExecucaoSdfModel.resultados_registrados,
                )
                .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
                .join(ProjetoModel, ProjetoModel.id == CasoTesteModel.projeto_id)
                .join(TimeModel, TimeModel.id == ProjetoModel.time_id)
                .outerjoin(
                    ImportacaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id
                )
                .where(*filtros)
                .order_by(
                    ExecucaoSdfModel.data_reportada.desc(),
                    ExecucaoSdfModel.created_at.desc(),
                    ExecucaoSdfModel.id,
                )
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
        if not execucoes:
            return PagedResult([], page, page_size, total)
        execucao_ids = [row.id for row in execucoes]
        projeto_ids_pagina = {row.projeto_id for row in execucoes}
        associacoes = (
            await self.session.execute(
                select(ProjetoModeloModel.projeto_id, ProjetoModeloModel.modelo_dispositivo_id)
                .join(
                    ModeloDispositivoModel,
                    ModeloDispositivoModel.id == ProjetoModeloModel.modelo_dispositivo_id,
                )
                .where(
                    ProjetoModeloModel.unidade_id == unidade_id,
                    ProjetoModeloModel.projeto_id.in_(projeto_ids_pagina),
                    ProjetoModeloModel.ativo.is_(True),
                    ModeloDispositivoModel.unidade_id == unidade_id,
                    ModeloDispositivoModel.ativo.is_(True),
                )
            )
        ).all()
        modelos_por_projeto: dict[UUID, list[UUID]] = {}
        for p_id, m_id in associacoes:
            modelos_por_projeto.setdefault(p_id, []).append(m_id)
        celulas = (
            await self.session.execute(
                select(
                    ResultadoFormFactorModel.execucao_sdf_id,
                    ResultadoFormFactorModel.modelo_dispositivo_id,
                    ResultadoFormFactorModel.resultado,
                )
                .join(
                    ExecucaoSdfModel,
                    ExecucaoSdfModel.id == ResultadoFormFactorModel.execucao_sdf_id,
                )
                .join(CasoTesteModel, CasoTesteModel.id == ExecucaoSdfModel.caso_teste_id)
                .where(
                    ResultadoFormFactorModel.unidade_id == unidade_id,
                    ResultadoFormFactorModel.execucao_sdf_id.in_(execucao_ids),
                    ResultadoFormFactorModel.ativo.is_(True),
                )
                .join(
                    ProjetoModeloModel,
                    and_(
                        ProjetoModeloModel.projeto_id == CasoTesteModel.projeto_id,
                        ProjetoModeloModel.modelo_dispositivo_id
                        == ResultadoFormFactorModel.modelo_dispositivo_id,
                        ProjetoModeloModel.unidade_id == unidade_id,
                        ProjetoModeloModel.ativo.is_(True),
                    ),
                )
            )
        ).all()
        resultados_por_execucao = {}
        for exec_id, model_id, valor in celulas:
            resultados_por_execucao.setdefault(exec_id, {})[model_id] = valor
        items = [
            FormFactorExecucaoLinhaGlobal(
                execucao_id=row.id,
                projeto_id=row.projeto_id,
                projeto_nome=f"{row.app} {row.one_ui}",
                caso_teste_id=row.caso_teste_id,
                tc_id=row.tc_id,
                responsavel_id=row.responsavel_id,
                modelos_ids=tuple(modelos_por_projeto.get(row.projeto_id, ())),
                sdf_id=row.sdf_id,
                data_reportada=row.data_reportada,
                origem=row.origem,
                resultados=resultados_por_execucao.get(row.id, {}),
                rodada_id=row.rodada_id,
                resultados_registrados=row.resultados_registrados,
            )
            for row in execucoes
        ]
        return PagedResult(items, page, page_size, total)

    async def listar_por_execucao(
        self, unidade_id: UUID, execucao_sdf_id: UUID
    ) -> tuple[ResultadoFormFactor, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ResultadoFormFactorModel)
                    .where(
                        ResultadoFormFactorModel.unidade_id == unidade_id,
                        ResultadoFormFactorModel.execucao_sdf_id == execucao_sdf_id,
                    )
                    .order_by(ResultadoFormFactorModel.modelo_dispositivo_id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    async def listar_form_factor_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
    ) -> PagedResult[FormFactorLinha]:
        # Resultados que contam: do projeto, em modelo vinculado e, se houver, na semana.
        resultados_validos = (
            select(ResultadoFormFactorModel.id)
            .join(ExecucaoSdfModel, ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id)
            .outerjoin(
                ImportacaoSdfModel,
                ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id,
            )
            .join(
                ProjetoModeloModel,
                (ProjetoModeloModel.projeto_id == projeto_id)
                & (
                    ProjetoModeloModel.modelo_dispositivo_id
                    == ResultadoFormFactorModel.modelo_dispositivo_id
                ),
            )
            .where(
                ResultadoFormFactorModel.unidade_id == unidade_id,
                ExecucaoSdfModel.unidade_id == unidade_id,
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.ativo.is_(True),
                ResultadoFormFactorModel.ativo.is_(True),
                ExecucaoSdfModel.ativo.is_(True),
                or_(
                    and_(
                        ExecucaoSdfModel.origem == "MANUAL",
                        ExecucaoSdfModel.importacao_sdf_id.is_(None),
                    ),
                    and_(
                        ExecucaoSdfModel.origem == "SDF",
                        ImportacaoSdfModel.id == ExecucaoSdfModel.importacao_sdf_id,
                        ImportacaoSdfModel.unidade_id == unidade_id,
                        ImportacaoSdfModel.projeto_id == projeto_id,
                        ImportacaoSdfModel.ativo.is_(True),
                    ),
                ),
            )
        )
        if inicio is not None:
            resultados_validos = resultados_validos.where(ExecucaoSdfModel.data_reportada >= inicio)
        if fim is not None:
            resultados_validos = resultados_validos.where(ExecucaoSdfModel.data_reportada < fim)

        filtros_caso = [
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
            CasoTesteModel.ativo.is_(True),
            CasoTesteModel.status == "InValidation",
        ]
        if responsavel_id is not None:
            filtros_caso.append(CasoTesteModel.responsavel_id == responsavel_id)
        if tc_id:
            filtros_caso.append(CasoTesteModel.tc_id.ilike(f"%{tc_id.strip()}%"))
        if sdf_id or modelo_dispositivo_id is not None or resultado:
            filtros_resultado = [
                ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id,
            ]
            if sdf_id:
                filtros_resultado.append(ExecucaoSdfModel.sdf_id.ilike(f"%{sdf_id.strip()}%"))
            if modelo_dispositivo_id is not None:
                filtros_resultado.append(
                    ResultadoFormFactorModel.modelo_dispositivo_id == modelo_dispositivo_id
                )
            if resultado:
                filtros_resultado.append(
                    func.lower(ResultadoFormFactorModel.resultado) == resultado.casefold()
                )
            filtros_caso.append(resultados_validos.where(*filtros_resultado).exists())
        if inicio is not None or fim is not None:
            filtros_caso.append(
                resultados_validos.where(
                    ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id
                ).exists()
            )

        total = (
            await self.session.execute(
                select(func.count()).select_from(CasoTesteModel).where(*filtros_caso)
            )
        ).scalar_one()
        casos = (
            await self.session.execute(
                select(
                    CasoTesteModel.id,
                    CasoTesteModel.tc_id,
                    CasoTesteModel.responsavel_id,
                    CasoTesteModel.backup_id,
                )
                .where(*filtros_caso)
                .order_by(CasoTesteModel.tc_id, CasoTesteModel.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
        if not casos:
            return PagedResult([], page, page_size, total)
        casos_ids = [caso_id for caso_id, _, _, _ in casos]
        # Por caso: (rodada pendente, SDF ID informado nela) da rodada mais recente.
        rodadas_pendentes = {
            caso_id: (rodada_id, sdf_id_rodada)
            for caso_id, rodada_id, sdf_id_rodada in (
                await self.session.execute(
                    select(
                        ExecucaoSdfModel.caso_teste_id,
                        ExecucaoSdfModel.rodada_id,
                        ExecucaoSdfModel.sdf_id,
                    )
                    .join(
                        RodadaFormFactorModel,
                        RodadaFormFactorModel.id == ExecucaoSdfModel.rodada_id,
                    )
                    .where(
                        ExecucaoSdfModel.unidade_id == unidade_id,
                        ExecucaoSdfModel.caso_teste_id.in_(casos_ids),
                        ExecucaoSdfModel.ativo.is_(True),
                        ExecucaoSdfModel.resultados_registrados.is_(False),
                        RodadaFormFactorModel.unidade_id == unidade_id,
                        RodadaFormFactorModel.projeto_id == projeto_id,
                        RodadaFormFactorModel.ativo.is_(True),
                    )
                    .ext(distinct_on(ExecucaoSdfModel.caso_teste_id))
                    .order_by(
                        ExecucaoSdfModel.caso_teste_id,
                        RodadaFormFactorModel.created_at.desc(),
                        RodadaFormFactorModel.id,
                    )
                )
            ).all()
        }

        # Resultado mais recente de cada par (caso, modelo); empate vence a importação mais recente,
        # e os ids fecham a ordem para a escolha não variar entre consultas.
        celulas = await self.session.execute(
            resultados_validos.with_only_columns(
                ExecucaoSdfModel.caso_teste_id,
                ResultadoFormFactorModel.modelo_dispositivo_id,
                ResultadoFormFactorModel.resultado,
                ExecucaoSdfModel.sdf_id,
                ExecucaoSdfModel.data_reportada,
                func.coalesce(ImportacaoSdfModel.created_at, ExecucaoSdfModel.created_at),
            )
            .where(ExecucaoSdfModel.caso_teste_id.in_(casos_ids))
            .ext(
                distinct_on(
                    ExecucaoSdfModel.caso_teste_id, ResultadoFormFactorModel.modelo_dispositivo_id
                )
            )
            .order_by(
                ExecucaoSdfModel.caso_teste_id,
                ResultadoFormFactorModel.modelo_dispositivo_id,
                ExecucaoSdfModel.data_reportada.desc(),
                func.coalesce(ImportacaoSdfModel.created_at, ExecucaoSdfModel.created_at).desc(),
                ExecucaoSdfModel.id,
                ResultadoFormFactorModel.id,
            )
        )
        resultados: dict[UUID, dict[UUID, str]] = {}
        # Por caso: ((data reportada, data da importação), SDF ID) da célula mais recente.
        mais_recente: dict[UUID, tuple[tuple[datetime, datetime], str]] = {}
        for caso_id, modelo_id, valor, sdf_id, data_reportada, importado_em in celulas.all():
            resultados.setdefault(caso_id, {})[modelo_id] = valor
            chave = (data_reportada, importado_em)
            if caso_id not in mais_recente or chave > mais_recente[caso_id][0]:
                mais_recente[caso_id] = (chave, sdf_id)

        items = []
        for caso_id, tc_id, responsavel_id_caso, backup_id in casos:
            recente = mais_recente.get(caso_id)
            rodada_id, sdf_id_rodada = rodadas_pendentes.get(caso_id, (None, None))
            items.append(
                FormFactorLinha(
                    caso_teste_id=caso_id,
                    tc_id=tc_id,
                    responsavel_id=responsavel_id_caso,
                    # A rodada em andamento mostra o SDF ID informado ao criá-la.
                    sdf_id=sdf_id_rodada or (recente[1] if recente else None),
                    data_reportada=recente[0][0] if recente else None,
                    resultados=resultados.get(caso_id, {}),
                    backup_id=backup_id,
                    rodada_pendente_id=rodada_id,
                )
            )
        return PagedResult(items, page, page_size, total)

    async def listar_execucoes_form_factor_por_projeto(
        self,
        unidade_id: UUID,
        projeto_id: UUID,
        page: int,
        page_size: int,
        inicio: datetime | None = None,
        fim: datetime | None = None,
        responsavel_id: UUID | None = None,
        tc_id: str | None = None,
        sdf_id: str | None = None,
        modelo_dispositivo_id: UUID | None = None,
        resultado: str | None = None,
        origem: str | None = None,
    ) -> PagedResult[FormFactorExecucaoLinha]:
        importacao_valida = and_(
            ExecucaoSdfModel.origem == "SDF",
            ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id,
            ImportacaoSdfModel.unidade_id == unidade_id,
            ImportacaoSdfModel.projeto_id == projeto_id,
            ImportacaoSdfModel.ativo.is_(True),
        )
        manual_valida = and_(
            ExecucaoSdfModel.origem == "MANUAL",
            ExecucaoSdfModel.importacao_sdf_id.is_(None),
        )

        def existe_resultado(*condicoes_adicionais):
            return (
                select(ResultadoFormFactorModel.id)
                .join(
                    ProjetoModeloModel,
                    and_(
                        ProjetoModeloModel.projeto_id == projeto_id,
                        ProjetoModeloModel.modelo_dispositivo_id
                        == ResultadoFormFactorModel.modelo_dispositivo_id,
                    ),
                )
                .where(
                    ResultadoFormFactorModel.unidade_id == unidade_id,
                    ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id,
                    ResultadoFormFactorModel.ativo.is_(True),
                    ProjetoModeloModel.unidade_id == unidade_id,
                    ProjetoModeloModel.ativo.is_(True),
                    *condicoes_adicionais,
                )
                .exists()
            )

        tem_resultado_no_projeto = existe_resultado()
        filtros = [
            ExecucaoSdfModel.unidade_id == unidade_id,
            ExecucaoSdfModel.ativo.is_(True),
            CasoTesteModel.unidade_id == unidade_id,
            CasoTesteModel.projeto_id == projeto_id,
            CasoTesteModel.ativo.is_(True),
            or_(importacao_valida, manual_valida),
            or_(ExecucaoSdfModel.rodada_id.is_not(None), tem_resultado_no_projeto),
        ]
        if inicio is not None:
            filtros.append(ExecucaoSdfModel.data_reportada >= inicio)
        if fim is not None:
            filtros.append(ExecucaoSdfModel.data_reportada < fim)
        if responsavel_id is not None:
            filtros.append(CasoTesteModel.responsavel_id == responsavel_id)
        if tc_id:
            filtros.append(CasoTesteModel.tc_id.ilike(f"%{tc_id.strip()}%"))
        if sdf_id:
            filtros.append(ExecucaoSdfModel.sdf_id.ilike(f"%{sdf_id.strip()}%"))
        if origem:
            filtros.append(ExecucaoSdfModel.origem == origem)
        if modelo_dispositivo_id is not None or resultado:
            condicoes = []
            if modelo_dispositivo_id is not None:
                condicoes.append(
                    ResultadoFormFactorModel.modelo_dispositivo_id == modelo_dispositivo_id
                )
            if resultado:
                condicoes.append(
                    func.lower(ResultadoFormFactorModel.resultado) == resultado.casefold()
                )
            filtros.append(existe_resultado(*condicoes))

        total = (
            await self.session.execute(
                select(func.count())
                .select_from(ExecucaoSdfModel)
                .join(CasoTesteModel, ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id)
                .outerjoin(
                    ImportacaoSdfModel,
                    ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id,
                )
                .where(*filtros)
            )
        ).scalar_one()
        execucoes = (
            await self.session.execute(
                select(
                    ExecucaoSdfModel.id,
                    ExecucaoSdfModel.caso_teste_id,
                    CasoTesteModel.tc_id,
                    CasoTesteModel.responsavel_id,
                    ExecucaoSdfModel.sdf_id,
                    ExecucaoSdfModel.data_reportada,
                    ExecucaoSdfModel.origem,
                    ExecucaoSdfModel.rodada_id,
                    ExecucaoSdfModel.resultados_registrados,
                )
                .select_from(ExecucaoSdfModel)
                .join(CasoTesteModel, ExecucaoSdfModel.caso_teste_id == CasoTesteModel.id)
                .outerjoin(
                    ImportacaoSdfModel,
                    ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id,
                )
                .where(*filtros)
                .order_by(
                    ExecucaoSdfModel.data_reportada.desc(),
                    ExecucaoSdfModel.created_at.desc(),
                    ExecucaoSdfModel.id,
                )
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).all()
        if not execucoes:
            return PagedResult([], page, page_size, total)

        execucoes_ids = [execucao.id for execucao in execucoes]
        celulas = await self.session.execute(
            select(
                ResultadoFormFactorModel.execucao_sdf_id,
                ResultadoFormFactorModel.modelo_dispositivo_id,
                ResultadoFormFactorModel.resultado,
            )
            .join(
                ProjetoModeloModel,
                and_(
                    ProjetoModeloModel.projeto_id == projeto_id,
                    ProjetoModeloModel.modelo_dispositivo_id
                    == ResultadoFormFactorModel.modelo_dispositivo_id,
                ),
            )
            .where(
                ResultadoFormFactorModel.unidade_id == unidade_id,
                ResultadoFormFactorModel.execucao_sdf_id.in_(execucoes_ids),
                ResultadoFormFactorModel.ativo.is_(True),
                ProjetoModeloModel.unidade_id == unidade_id,
                ProjetoModeloModel.ativo.is_(True),
            )
        )
        resultados: dict[UUID, dict[UUID, str]] = {}
        for execucao_id, modelo_id, valor in celulas.all():
            resultados.setdefault(execucao_id, {})[modelo_id] = valor

        items = [
            FormFactorExecucaoLinha(
                execucao_id=execucao.id,
                caso_teste_id=execucao.caso_teste_id,
                tc_id=execucao.tc_id,
                responsavel_id=execucao.responsavel_id,
                sdf_id=execucao.sdf_id,
                data_reportada=execucao.data_reportada,
                origem=execucao.origem,
                resultados=resultados.get(execucao.id, {}),
                rodada_id=execucao.rodada_id,
                resultados_registrados=execucao.resultados_registrados,
            )
            for execucao in execucoes
        ]
        return PagedResult(items, page, page_size, total)

    def _to_entity(self, model: ResultadoFormFactorModel) -> ResultadoFormFactor:
        resultado = ResultadoFormFactor(
            model.unidade_id,
            model.execucao_sdf_id,
            model.modelo_dispositivo_id,
            model.resultado,
        )
        resultado.id = model.id
        resultado.ativo = model.ativo
        resultado.created_at = model.created_at
        resultado.updated_at = model.updated_at
        return resultado

    def _to_model(self, entity: ResultadoFormFactor) -> ResultadoFormFactorModel:
        return ResultadoFormFactorModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            execucao_sdf_id=entity.execucao_sdf_id,
            modelo_dispositivo_id=entity.modelo_dispositivo_id,
            resultado=entity.resultado,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
