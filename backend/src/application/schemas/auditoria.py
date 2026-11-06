from collections.abc import Mapping
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.application.schemas.caso_teste import timestamp_utc
from src.application.schemas.historico_caso_teste import alteracoes_do_registro
from src.domain.queries.auditoria import AcaoAuditoria, LinhaAuditoria


class AlteracaoResponse(BaseModel):
    campo: str
    valor_anterior: str | None
    valor_novo: str | None


class RegistroAuditoriaResponse(BaseModel):
    id: int
    alterado_em: datetime
    usuario_nome: str | None
    usuario_perfil: str | None
    acao: AcaoAuditoria
    caso_teste_id: UUID
    tc_id: str
    projeto_id: UUID
    projeto_nome: str
    alteracoes: list[AlteracaoResponse]
    origem: str
    tela: str | None


def to_registro_auditoria_response(
    linha: LinhaAuditoria, nomes: Mapping[UUID, str]
) -> RegistroAuditoriaResponse:
    registro = linha.registro
    return RegistroAuditoriaResponse(
        id=linha.id,
        alterado_em=timestamp_utc(registro.created_at),
        usuario_nome=registro.usuario_nome,
        usuario_perfil=registro.usuario_perfil,
        acao=linha.acao,
        caso_teste_id=linha.caso_teste_id,
        tc_id=linha.tc_id,
        projeto_id=linha.projeto_id,
        projeto_nome=linha.projeto_nome,
        alteracoes=[
            AlteracaoResponse(campo=campo, valor_anterior=anterior, valor_novo=novo)
            for campo, anterior, novo in alteracoes_do_registro(registro, nomes)
        ],
        origem=registro.origem,
        tela=linha.tela,
    )
