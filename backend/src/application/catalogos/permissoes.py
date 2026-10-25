"""Metadados de apresentação para permissões persistidas.

Os códigos das permissões usam o namespace do controller responsável. Este
registro mantém os rótulos e a ordenação sem duplicar a taxonomia no frontend.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ModuloPermissoes:
    codigo: str
    nome: str
    ordem: int
    permissoes: tuple[str, ...]


MODULOS_PERMISSOES = (
    ModuloPermissoes("usuarios", "Usuários", 1, ("consultar", "perfil.consultar", "gerenciar")),
    ModuloPermissoes("perfis", "Perfis", 2, ("gerenciar",)),
    ModuloPermissoes("setores", "Setores", 3, ("consultar", "gerenciar")),
    ModuloPermissoes("times", "Times", 4, ("consultar", "criar", "gerenciar")),
    ModuloPermissoes("projetos", "Projetos", 5, ("consultar", "gerenciar")),
    ModuloPermissoes("test_cases", "Test Cases", 6, ("consultar", "gerenciar")),
    ModuloPermissoes("form_factor", "Form Factor", 7, ("consultar", "importar")),
    ModuloPermissoes("modelos_dispositivo", "Modelos de dispositivo", 8, ("gerenciar",)),
)

_POR_CODIGO = {modulo.codigo: modulo for modulo in MODULOS_PERMISSOES}


def metadados_permissao(codigo: str) -> tuple[ModuloPermissoes, int]:
    """Retorna módulo e posição; falha explicitamente para código não registrado."""
    modulo_codigo, separador, acao = codigo.partition(".")
    modulo = _POR_CODIGO.get(modulo_codigo)
    if not separador or modulo is None:
        raise ValueError(f"Permissão '{codigo}' não pertence a um controller registrado.")
    try:
        ordem = modulo.permissoes.index(acao) + 1
    except ValueError as exc:
        raise ValueError(f"Permissão '{codigo}' não está registrada no catálogo.") from exc
    return modulo, ordem
