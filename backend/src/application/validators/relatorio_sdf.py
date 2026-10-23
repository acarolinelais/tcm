from dataclasses import dataclass
from datetime import date, datetime
from io import BytesIO
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from src.application.validators.importacao_projeto import (
    ErroImportacaoPlanilha,
    _normalizar_cabecalho,
    _texto,
)


@dataclass(frozen=True)
class LinhaRelatorioSdf:
    linha: int
    tc_id: str
    sdf_id: str
    data_reportada: datetime
    one_ui: str
    resultados: dict[str, str]


@dataclass(frozen=True)
class RelatorioSdfValidado:
    linhas: tuple[LinhaRelatorioSdf, ...]


class RelatorioSdfInvalido(ValueError):
    def __init__(self, erros: tuple[ErroImportacaoPlanilha, ...]) -> None:
        self.erros = erros
        super().__init__("O relatório SDF possui dados inválidos.")


def validar_relatorio_sdf(conteudo: bytes) -> RelatorioSdfValidado:
    try:
        workbook = load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
        planilha = workbook.active
    except (BadZipFile, InvalidFileException, OSError, ValueError) as erro:
        raise RelatorioSdfInvalido(
            (ErroImportacaoPlanilha(1, "arquivo", "O arquivo não é uma planilha Excel válida."),)
        ) from erro

    linhas = planilha.iter_rows(values_only=True)
    cabecalho = next(linhas, None)
    if cabecalho is None:
        workbook.close()
        raise RelatorioSdfInvalido(
            (ErroImportacaoPlanilha(1, "cabecalho", "A planilha está vazia."),)
        )
    aliases = {
        "test id": "tc id",
        "test case id": "tc id",
        "tc id": "tc id",
        "sdf id": "sdf id",
        "date": "date",
        "data": "date",
        "oneui": "one ui",
        "one ui": "one ui",
    }
    mapa_normalizado: dict[str, int] = {}
    erros: list[ErroImportacaoPlanilha] = []
    for indice, valor in enumerate(cabecalho):
        nome = _normalizar_cabecalho(valor) if valor is not None else ""
        if not nome:
            erros.append(ErroImportacaoPlanilha(1, "cabecalho", "Há uma coluna sem nome."))
            continue
        nome = aliases.get(nome, nome)
        if nome in mapa_normalizado:
            erros.append(ErroImportacaoPlanilha(1, nome, "O cabeçalho está duplicado."))
            continue
        mapa_normalizado[nome] = indice

    erros.extend(
        ErroImportacaoPlanilha(1, campo, "Coluna obrigatória não encontrada.")
        for campo in ("tc id", "sdf id", "date", "one ui")
        if campo not in mapa_normalizado
    )
    campos_fixos = {"tc id", "sdf id", "date", "one ui"}
    colunas_modelos = {
        nome: indice for nome, indice in mapa_normalizado.items() if nome not in campos_fixos
    }
    if not colunas_modelos:
        erros.append(ErroImportacaoPlanilha(1, "modelos", "Informe ao menos uma coluna de modelo."))
    if erros:
        workbook.close()
        raise RelatorioSdfInvalido(tuple(erros))

    registros = []
    for numero, valores in enumerate(linhas, start=2):
        if not any(_texto(valor) for valor in valores):
            continue
        campos = {
            nome: valores[indice] if indice < len(valores) else None
            for nome, indice in mapa_normalizado.items()
        }
        tc_id = _texto(campos["tc id"])
        sdf_id = _texto(campos["sdf id"])
        one_ui = _texto(campos["one ui"])
        data_reportada = _converter_data(campos["date"])
        resultados = {
            modelo: _texto(valores[indice] if indice < len(valores) else None)
            for modelo, indice in colunas_modelos.items()
        }
        if not tc_id:
            erros.append(ErroImportacaoPlanilha(numero, "tc id", "TC ID é obrigatório."))
        if not sdf_id:
            erros.append(ErroImportacaoPlanilha(numero, "sdf id", "SDF ID é obrigatório."))
        if not one_ui:
            erros.append(ErroImportacaoPlanilha(numero, "one ui", "One UI é obrigatório."))
        if data_reportada is None:
            erros.append(ErroImportacaoPlanilha(numero, "date", "Informe uma data válida."))
        for modelo, resultado in resultados.items():
            if not resultado:
                erros.append(
                    ErroImportacaoPlanilha(numero, modelo, "Resultado do modelo é obrigatório.")
                )
        if tc_id and sdf_id and one_ui and data_reportada and all(resultados.values()):
            registros.append(
                LinhaRelatorioSdf(numero, tc_id, sdf_id, data_reportada, one_ui, resultados)
            )
    workbook.close()
    if not registros:
        erros.append(
            ErroImportacaoPlanilha(1, "tc id", "O relatório precisa conter execuções válidas.")
        )
    if erros:
        raise RelatorioSdfInvalido(tuple(erros))
    return RelatorioSdfValidado(tuple(registros))


def _converter_data(valor: object) -> datetime | None:
    if isinstance(valor, datetime):
        return valor
    if isinstance(valor, date):
        return datetime.combine(valor, datetime.min.time())
    texto = _texto(valor)
    for formato in ("%Y-%m-%d", "%m/%d/%Y", "%b %d, %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(texto, formato)
        except ValueError:
            continue
    return None
