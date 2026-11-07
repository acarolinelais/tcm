from uuid import UUID

from sqlalchemy import select

from src.domain.entities.importacao_sdf import ImportacaoSdf
from src.domain.queries.ultima_importacao_sdf import UltimaImportacaoSdf
from src.infrastructure.data.models.execucao_sdf_model import ExecucaoSdfModel
from src.infrastructure.data.models.importacao_sdf_model import ImportacaoSdfModel
from src.infrastructure.data.models.modelo_dispositivo_model import ModeloDispositivoModel
from src.infrastructure.data.models.resultado_form_factor_model import ResultadoFormFactorModel
from src.infrastructure.data.models.usuario_model import UsuarioModel
from src.infrastructure.repositories.repository_base import RepositoryBaseImpl


class ImportacaoSdfRepositoryImpl(RepositoryBaseImpl[ImportacaoSdf, ImportacaoSdfModel]):
    model = ImportacaoSdfModel

    async def adicionar(self, entity: ImportacaoSdf) -> None:
        # Sem relacionamento ORM com as execuções, o flush não ordena os INSERTs: sem gravar a
        # importação antes, a execução pode chegar primeiro e quebrar a FK (ver ProjetoRepository).
        self.session.add(self._to_model(entity))
        await self.session.flush()

    async def listar_por_projeto(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> tuple[ImportacaoSdf, ...]:
        modelos = (
            (
                await self.session.execute(
                    select(ImportacaoSdfModel)
                    .where(
                        ImportacaoSdfModel.unidade_id == unidade_id,
                        ImportacaoSdfModel.projeto_id == projeto_id,
                    )
                    .order_by(ImportacaoSdfModel.created_at.desc(), ImportacaoSdfModel.id)
                )
            )
            .scalars()
            .all()
        )
        return tuple(self._to_entity(modelo) for modelo in modelos)

    async def obter_ultima_ativa(
        self, unidade_id: UUID, projeto_id: UUID
    ) -> UltimaImportacaoSdf | None:
        """A importação ativa mais recente do projeto (spec 067, RN-02), com o que o diálogo mostra.

        O relatório tem um SDF ID, um device e uma data só (spec 060): qualquer execução serve.
        """
        ultima = (
            select(ImportacaoSdfModel.id, ImportacaoSdfModel.importado_por)
            .where(
                ImportacaoSdfModel.unidade_id == unidade_id,
                ImportacaoSdfModel.projeto_id == projeto_id,
                ImportacaoSdfModel.ativo.is_(True),
            )
            .order_by(ImportacaoSdfModel.created_at.desc(), ImportacaoSdfModel.id.desc())
            .limit(1)
            .subquery()
        )
        linha = (
            await self.session.execute(
                select(
                    ImportacaoSdfModel.id,
                    ExecucaoSdfModel.sdf_id,
                    ModeloDispositivoModel.nome,
                    ExecucaoSdfModel.data_reportada,
                    UsuarioModel.nome,
                    ImportacaoSdfModel.created_at,
                )
                .join(ultima, ultima.c.id == ImportacaoSdfModel.id)
                .join(ExecucaoSdfModel, ExecucaoSdfModel.importacao_sdf_id == ImportacaoSdfModel.id)
                .join(
                    ResultadoFormFactorModel,
                    ResultadoFormFactorModel.execucao_sdf_id == ExecucaoSdfModel.id,
                )
                .join(
                    ModeloDispositivoModel,
                    ModeloDispositivoModel.id == ResultadoFormFactorModel.modelo_dispositivo_id,
                )
                .join(UsuarioModel, UsuarioModel.id == ultima.c.importado_por)
                .limit(1)
            )
        ).one_or_none()
        return UltimaImportacaoSdf(*linha) if linha is not None else None

    def _to_entity(self, model: ImportacaoSdfModel) -> ImportacaoSdf:
        importacao = ImportacaoSdf(model.unidade_id, model.projeto_id, model.importado_por)
        importacao.id = model.id
        importacao.ativo = model.ativo
        importacao.desfeita_por = model.desfeita_por
        importacao.desfeita_em = model.desfeita_em
        importacao.created_at = model.created_at
        importacao.updated_at = model.updated_at
        return importacao

    def _to_model(self, entity: ImportacaoSdf) -> ImportacaoSdfModel:
        return ImportacaoSdfModel(
            id=entity.id,
            unidade_id=entity.unidade_id,
            projeto_id=entity.projeto_id,
            importado_por=entity.importado_por,
            desfeita_por=entity.desfeita_por,
            desfeita_em=entity.desfeita_em,
            ativo=entity.ativo,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
