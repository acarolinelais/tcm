from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from src.application.schemas.caso_teste import timestamp_utc
from src.domain.queries.auditoria import CAMPOS_OCULTOS
from src.domain.queries.registro_auditoria import RegistroAuditoria

CAMPOS_DE_USUARIO = frozenset({"responsavel_id", "backup_id", "dev_fix_id"})


class AlteracaoCasoTesteResponse(BaseModel):
    campo: str
    valor_anterior: str | None
    valor_novo: str | None
    usuario_nome: str | None
    usuario_perfil: str | None
    origem: str
    alterado_em: datetime


class HistoricoCasoTesteResponse(BaseModel):
    itens: list[AlteracaoCasoTesteResponse]


def ids_de_usuarios(registros: Sequence[RegistroAuditoria]) -> set[UUID]:
    """Responsável, Backup e Dev Fix ficam gravados como id; a resposta mostra o nome."""
    ids: set[UUID] = set()
    for registro in registros:
        for campo in CAMPOS_DE_USUARIO.intersection(registro.changed_fields):
            for valores in (registro.old_values, registro.new_values):
                if valores and valores.get(campo):
                    ids.add(UUID(valores[campo]))
    return ids


def to_historico_response(
    registros: Sequence[RegistroAuditoria], nomes: Mapping[UUID, str]
) -> HistoricoCasoTesteResponse:
    return HistoricoCasoTesteResponse(
        itens=[item for registro in registros for item in alteracoes_response(registro, nomes)]
    )


def alteracoes_response(
    registro: RegistroAuditoria, nomes: Mapping[UUID, str]
) -> list[AlteracaoCasoTesteResponse]:
    """Os itens de um registro no formato do histórico (038), também usado pela timeline (054)."""
    return [
        AlteracaoCasoTesteResponse(
            campo=campo,
            valor_anterior=anterior,
            valor_novo=novo,
            usuario_nome=registro.usuario_nome,
            usuario_perfil=registro.usuario_perfil,
            origem=registro.origem,
            alterado_em=timestamp_utc(registro.created_at),
        )
        for campo, anterior, novo in alteracoes_do_registro(registro, nomes)
    ]


def alteracoes_do_registro(
    registro: RegistroAuditoria, nomes: Mapping[UUID, str]
) -> list[tuple[str, str | None, str | None]]:
    """(campo, antes, depois) legíveis de um registro, no histórico (038) e na auditoria (052)."""
    antes, depois = registro.old_values or {}, registro.new_values or {}
    # O mesmo recorte está em SQL no `_acao` de `AuditoriaRepositoryImpl`: mudou aqui, mude lá.
    # Só a inclusão e a remoção (inativação) de um link contam. Não há exclusão física de casos
    # nem de links, então linhas DELETE não aparecem.
    if registro.table_name == "links_pull_request":
        if registro.operation == "INSERT":
            return [("pull_request", None, depois.get("url"))]
        if "ativo" in registro.changed_fields and depois.get("ativo") is False:
            return [("pull_request", antes.get("url"), None)]
        return []
    if registro.operation == "INSERT":
        return [("criacao", None, None)]
    return [
        (campo, _texto(campo, antes.get(campo), nomes), _texto(campo, depois.get(campo), nomes))
        for campo in registro.changed_fields
        if campo not in CAMPOS_OCULTOS
    ]


def _texto(campo: str, valor: Any, nomes: Mapping[UUID, str]) -> str | None:
    if valor is None:
        return None
    if campo in CAMPOS_DE_USUARIO:
        return nomes.get(UUID(valor))
    return str(valor)
