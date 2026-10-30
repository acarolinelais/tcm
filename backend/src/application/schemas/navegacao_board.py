from collections.abc import Iterable
from uuid import UUID

from pydantic import BaseModel

from src.domain.entities.projeto import StatusProjeto
from src.domain.queries.linha_navegacao_board import LinhaNavegacaoBoard


class ProjetoNavegacaoResponse(BaseModel):
    id: UUID
    nome: str
    status: StatusProjeto


class TimeNavegacaoResponse(BaseModel):
    id: UUID
    nome: str
    projetos: list[ProjetoNavegacaoResponse]


class SetorNavegacaoResponse(BaseModel):
    id: UUID
    nome: str
    times: list[TimeNavegacaoResponse]


class NavegacaoBoardResponse(BaseModel):
    setores: list[SetorNavegacaoResponse]


def to_navegacao_response(linhas: Iterable[LinhaNavegacaoBoard]) -> NavegacaoBoardResponse:
    """Monta a árvore mantendo a ordem em que o repositório devolveu as linhas."""
    setores: dict[UUID, SetorNavegacaoResponse] = {}
    times: dict[UUID, TimeNavegacaoResponse] = {}
    for linha in linhas:
        if linha.setor_id not in setores:
            setores[linha.setor_id] = SetorNavegacaoResponse(
                id=linha.setor_id, nome=linha.setor_nome, times=[]
            )
        if linha.time_id not in times:
            times[linha.time_id] = TimeNavegacaoResponse(
                id=linha.time_id, nome=linha.time_nome, projetos=[]
            )
            setores[linha.setor_id].times.append(times[linha.time_id])
        # O outer join traz id, nome e status do projeto nulos juntos.
        if linha.projeto_id is not None:
            times[linha.time_id].projetos.append(
                ProjetoNavegacaoResponse(
                    id=linha.projeto_id, nome=linha.projeto_nome, status=linha.projeto_status
                )
            )
    return NavegacaoBoardResponse(setores=list(setores.values()))
