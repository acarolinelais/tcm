from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.entities.caso_teste import CasoTeste, StatusCasoTeste
from src.domain.entities.correcao import Correcao, OrigemCorrecao, ResultadoCorrecao
from src.domain.entities.interfaces.correcao_repository import CorrecaoRepository

# O Status em que a tentativa aberta fecha, e com que resultado (spec 076, RN-09).
_FECHAMENTO = {
    StatusCasoTeste.DONE: ResultadoCorrecao.CORRIGIDA,
    StatusCasoTeste.CANCELLED: ResultadoCorrecao.ENCERRADA,
}


@dataclass(frozen=True)
class EstadoDoCaso:
    """O que o registro precisa do caso antes de uma mudança de Status."""

    status: StatusCasoTeste
    tentativa: int
    em_revisao_em: datetime | None
    corretor_id: UUID


class RegistroDeCorrecoes:
    """Único ponto que grava as tentativas de correção (spec 076, RN-08 a RN-10).

    Quem muda o Status de um caso guarda `antes(caso)` e chama `registrar` depois da mudança.
    """

    def __init__(self, repo: CorrecaoRepository) -> None:
        self._repo = repo

    @staticmethod
    def antes(caso: CasoTeste) -> EstadoDoCaso:
        return EstadoDoCaso(
            caso.status,
            caso.tentativa_correcao,
            caso.correcao_em_revisao_em,
            caso.dev_fix_id or caso.responsavel_id,
        )

    async def registrar(
        self,
        caso: CasoTeste,
        antes: EstadoDoCaso,
        quando: datetime,
        importacao_id: UUID | None = None,
    ) -> None:
        """`quando`: a data da execução do SDF que causou a mudança, ou agora se foi manual."""
        if caso.tentativa_correcao > antes.tentativa:
            if antes.tentativa > 0:
                await self._fechar(
                    caso, antes, ResultadoCorrecao.FALHOU_DE_NOVO, quando, importacao_id
                )
            # Uma linha com o mesmo número sobra quando a importação que a abriu é anterior à spec
            # 076 e foi desfeita: ela não sabe de qual importação veio (RN-11).
            sobra = await self._repo.obter_por_tentativa(
                caso.unidade_id, caso.id, caso.tentativa_correcao
            )
            if sobra is not None:
                sobra.inativar()
                await self._repo.atualizar(sobra)
            origem = (
                OrigemCorrecao.REGRESSAO
                if antes.status is StatusCasoTeste.DONE
                else OrigemCorrecao.VALIDACAO
            )
            await self._repo.adicionar(
                Correcao(
                    caso.unidade_id,
                    caso.id,
                    caso.tentativa_correcao,
                    origem,
                    quando,
                    importacao_id,
                )
            )
        elif caso.status is not antes.status and (resultado := _FECHAMENTO.get(caso.status)):
            await self._fechar(caso, antes, resultado, quando, importacao_id)

    async def desfazer(
        self, unidade_id: UUID, importacao_sdf_id: UUID, caso_ids: set[UUID]
    ) -> None:
        """Desfaz o que a importação fez nas tentativas dos casos que voltaram (spec 076, RN-06)."""
        correcoes = [
            correcao
            for correcao in await self._repo.listar_por_importacao(unidade_id, importacao_sdf_id)
            if correcao.caso_teste_id in caso_ids
        ]
        for correcao in correcoes:
            if correcao.aberta_por_importacao_id == importacao_sdf_id:
                correcao.inativar()
            else:
                correcao.reabrir()
            await self._repo.atualizar(correcao)

    async def _fechar(
        self,
        caso: CasoTeste,
        antes: EstadoDoCaso,
        resultado: ResultadoCorrecao,
        quando: datetime,
        importacao_id: UUID | None,
    ) -> None:
        aberta = await self._repo.obter_aberta(caso.unidade_id, caso.id)
        if aberta is None:
            # Fora de correção, ou tentativa fechada antes da spec 076 (RN-11): nada a fechar.
            return
        aberta.fechar(resultado, quando, antes.corretor_id, antes.em_revisao_em, importacao_id)
        await self._repo.atualizar(aberta)
