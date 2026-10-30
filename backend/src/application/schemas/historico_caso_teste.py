from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from src.application.schemas.caso_teste import timestamp_utc
from src.domain.queries.registro_auditoria import RegistroAuditoria

# Colunas que mudam sem ser escolha de ninguém: não aparecem no histórico (spec 038).
CAMPOS_OCULTOS = frozenset({"id", "unidade_id", "projeto_id", "ativo", "created_at", "updated_at"})
CAMPOS_DE_USUARIO = frozenset({"responsavel_id", "backup_id"})


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
    """Responsável e Backup ficam gravados como id; a resposta mostra o nome."""
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
    itens: list[AlteracaoCasoTesteResponse] = []
    for registro in registros:
        antes, depois = registro.old_values or {}, registro.new_values or {}
        # Só a inclusão e a remoção (inativação) de um link contam. Não há exclusão física de casos
        # nem de links, então linhas DELETE não aparecem.
        if registro.table_name == "links_pull_request":
            if registro.operation == "INSERT":
                itens.append(_item(registro, "pull_request", None, depois.get("url"), nomes))
            elif "ativo" in registro.changed_fields and depois.get("ativo") is False:
                itens.append(_item(registro, "pull_request", antes.get("url"), None, nomes))
        elif registro.operation == "INSERT":
            itens.append(_item(registro, "criacao", None, None, nomes))
        else:
            itens.extend(
                _item(registro, campo, antes.get(campo), depois.get(campo), nomes)
                for campo in registro.changed_fields
                if campo not in CAMPOS_OCULTOS
            )
    return HistoricoCasoTesteResponse(itens=itens)


def _item(
    registro: RegistroAuditoria, campo: str, anterior: Any, novo: Any, nomes: Mapping[UUID, str]
) -> AlteracaoCasoTesteResponse:
    return AlteracaoCasoTesteResponse(
        campo=campo,
        valor_anterior=_texto(campo, anterior, nomes),
        valor_novo=_texto(campo, novo, nomes),
        usuario_nome=registro.usuario_nome,
        usuario_perfil=registro.usuario_perfil,
        origem=registro.origem,
        alterado_em=timestamp_utc(registro.created_at),
    )


def _texto(campo: str, valor: Any, nomes: Mapping[UUID, str]) -> str | None:
    if valor is None:
        return None
    if campo in CAMPOS_DE_USUARIO:
        return nomes.get(UUID(valor))
    return str(valor)
