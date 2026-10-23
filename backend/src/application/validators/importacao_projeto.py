from dataclasses import dataclass
from io import BytesIO
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from src.domain.entities.caso_teste import (
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    SituacaoCasoTeste,
)

CABECALHOS_OBRIGATORIOS = (
    "app",
    "tc id",
    "difficulty",
    "category",
    "tc situation",
    "one ui",
    "assignees",
    "backup",
)


@dataclass(frozen=True)
class ErroImportacaoPlanilha:
    linha: int
    campo: str
    mensagem: str


class PlanilhaProjetoInvalida(ValueError):
    def __init__(self, erros: tuple[ErroImportacaoPlanilha, ...]) -> None:
        self.erros = erros
        super().__init__("A planilha possui dados inválidos.")


@dataclass(frozen=True)
class LinhaCasoTesteImportada:
    linha: int
    tc_id: str
    category: CategoriaCasoTeste
    difficulty: DificuldadeCasoTeste
    situation: SituacaoCasoTeste
    responsavel: str
    backup: str


@dataclass(frozen=True)
class PlanilhaProjetoValidada:
    app: str
    one_ui: str
    casos: tuple[LinhaCasoTesteImportada, ...]


def validar_planilha_projeto(conteudo: bytes) -> PlanilhaProjetoValidada:
    try:
        workbook = load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
        planilha = workbook.active
    except (BadZipFile, InvalidFileException, OSError, ValueError) as erro:
        raise PlanilhaProjetoInvalida(
            (ErroImportacaoPlanilha(1, "arquivo", "O arquivo não é uma planilha Excel válida."),)
        ) from erro

    linhas = planilha.iter_rows(values_only=True)
    cabecalho = next(linhas, None)
    if cabecalho is None:
        workbook.close()
        raise PlanilhaProjetoInvalida(
            (ErroImportacaoPlanilha(1, "cabecalho", "A planilha está vazia."),)
        )

    mapa_cabecalhos: dict[str, int] = {}
    erros: list[ErroImportacaoPlanilha] = []
    for indice, valor in enumerate(cabecalho):
        if valor is None:
            continue
        nome = _normalizar_cabecalho(valor)
        if nome in mapa_cabecalhos:
            erros.append(ErroImportacaoPlanilha(1, nome, "O cabeçalho está duplicado."))
        mapa_cabecalhos[nome] = indice
    for nome in CABECALHOS_OBRIGATORIOS:
        if nome not in mapa_cabecalhos:
            erros.append(ErroImportacaoPlanilha(1, nome, "Coluna obrigatória não encontrada."))
    if erros:
        workbook.close()
        raise PlanilhaProjetoInvalida(tuple(erros))

    valores_app: list[str] = []
    valores_one_ui: list[str] = []
    casos: list[LinhaCasoTesteImportada] = []
    tc_ids_vistos: set[str] = set()
    for numero_linha, valores in enumerate(linhas, start=2):
        if not any(_texto(valor) for valor in valores):
            continue
        campos = {
            nome: _texto(valores[indice] if indice < len(valores) else None)
            for nome, indice in mapa_cabecalhos.items()
        }
        if campos["app"] and not valores_app:
            valores_app.append(campos["app"])
        if campos["one ui"] and not valores_one_ui:
            valores_one_ui.append(campos["one ui"])

        tc_id = campos["tc id"]
        category = _categoria(campos["category"])
        difficulty = _dificuldade(campos["difficulty"])
        situation = _situacao(campos["tc situation"])
        responsavel = campos["assignees"]
        backup = campos["backup"]
        if not tc_id:
            erros.append(ErroImportacaoPlanilha(numero_linha, "tc id", "TC ID é obrigatório."))
        elif tc_id in tc_ids_vistos:
            erros.append(
                ErroImportacaoPlanilha(numero_linha, "tc id", "TC ID duplicado na planilha.")
            )
        else:
            tc_ids_vistos.add(tc_id)
        if category is None:
            erros.append(ErroImportacaoPlanilha(numero_linha, "category", "Use A, B ou C."))
        if difficulty is None:
            erros.append(
                ErroImportacaoPlanilha(numero_linha, "difficulty", "Use Low, Medium ou High.")
            )
        if situation is None:
            erros.append(
                ErroImportacaoPlanilha(
                    numero_linha,
                    "tc situation",
                    "Use To-Do, InProgress, InReview, Pass ou Fail.",
                )
            )
        if not responsavel:
            erros.append(
                ErroImportacaoPlanilha(numero_linha, "assignees", "Responsável é obrigatório.")
            )
        if not backup:
            erros.append(ErroImportacaoPlanilha(numero_linha, "backup", "Backup é obrigatório."))
        if (
            tc_id
            and category is not None
            and difficulty is not None
            and situation is not None
            and responsavel
            and backup
        ):
            casos.append(
                LinhaCasoTesteImportada(
                    numero_linha,
                    tc_id,
                    category,
                    difficulty,
                    situation,
                    responsavel,
                    backup,
                )
            )

    workbook.close()
    if not valores_app:
        erros.append(ErroImportacaoPlanilha(1, "app", "Informe o App em pelo menos uma linha."))
    if not valores_one_ui:
        erros.append(
            ErroImportacaoPlanilha(1, "one ui", "Informe a versão One UI em pelo menos uma linha.")
        )
    if not casos:
        erros.append(
            ErroImportacaoPlanilha(
                1, "tc id", "A planilha precisa conter ao menos um Test Case válido."
            )
        )
    if erros:
        raise PlanilhaProjetoInvalida(tuple(erros))
    return PlanilhaProjetoValidada(valores_app[0], valores_one_ui[0], tuple(casos))


def _normalizar_cabecalho(valor: object) -> str:
    return " ".join(str(valor).strip().casefold().replace("_", " ").split())


def _texto(valor: object) -> str:
    if valor is None:
        return ""
    return str(valor).strip()


def _categoria(valor: str) -> CategoriaCasoTeste | None:
    try:
        return CategoriaCasoTeste(valor.upper())
    except ValueError:
        return None


def _dificuldade(valor: str) -> DificuldadeCasoTeste | None:
    opcoes = {item.value.casefold(): item for item in DificuldadeCasoTeste}
    return opcoes.get(valor.casefold())


def _situacao(valor: str) -> SituacaoCasoTeste | None:
    if not valor:
        return SituacaoCasoTeste.TO_DO
    opcoes = {item.value.casefold(): item for item in SituacaoCasoTeste}
    return opcoes.get(valor.casefold())
