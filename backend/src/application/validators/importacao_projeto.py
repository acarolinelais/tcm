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

# Cabeçalho normalizado → nome exibido nas mensagens quando a coluna não existe na planilha.
CABECALHOS_OBRIGATORIOS = {
    "app": "App",
    "tc id": "TC ID",
    "difficulty": "Difficulty",
    "category": "Category",
    "tc situation": "TC Situation",
    "one ui": "One UI",
    "assignees": "Assignees",
    "backup": "Backup",
}

# Valor normalizado → opção, montado uma vez para não refazer a cada linha.
_OPCOES = {
    enum: {item.value.casefold(): item for item in enum}
    for enum in (CategoriaCasoTeste, DificuldadeCasoTeste, SituacaoCasoTeste)
}


@dataclass(frozen=True)
class ErroImportacaoPlanilha:
    linha: int | None
    campo: str
    mensagem: str
    # Membros estruturados do ADR 0033; o relatório SDF ainda não os preenche.
    codigo: str | None = None
    coluna: str | None = None
    valor: str | None = None
    parametros: dict[str, object] | None = None


@dataclass(frozen=True)
class PessoasDaLinha:
    linha: int
    responsavel: str
    backup: str


class PlanilhaProjetoInvalida(ValueError):
    def __init__(
        self,
        erros: tuple[ErroImportacaoPlanilha, ...],
        total_linhas: int | None = None,
        pessoas: tuple[PessoasDaLinha, ...] = (),
        colunas: dict[str, str] | None = None,
    ) -> None:
        self.erros = erros
        self.total_linhas = total_linhas
        # Responsável e backup de cada linha lida, para o service validá-los mesmo com outros
        # problemas na planilha e devolver tudo de uma vez (ADR 0033).
        self.pessoas = pessoas
        self.colunas = colunas or {}
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
    total_linhas: int
    # Cabeçalho normalizado → texto como está na planilha, para as mensagens do service.
    colunas: dict[str, str]


def _erro_geral(
    codigo: str, mensagem: str, campo: str = "planilha", coluna: str | None = None
) -> ErroImportacaoPlanilha:
    return ErroImportacaoPlanilha(None, campo, mensagem, codigo, coluna)


def validar_planilha_projeto(conteudo: bytes) -> PlanilhaProjetoValidada:
    try:
        workbook = load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
        planilha = workbook.active
    except (BadZipFile, InvalidFileException, OSError, ValueError) as erro:
        raise PlanilhaProjetoInvalida(
            (
                _erro_geral(
                    "arquivo_invalido", "O arquivo não é uma planilha Excel válida.", "arquivo"
                ),
            )
        ) from erro

    linhas = planilha.iter_rows(values_only=True)
    cabecalho = next(linhas, None)
    if cabecalho is None:
        workbook.close()
        raise PlanilhaProjetoInvalida((_erro_geral("planilha_vazia", "A planilha está vazia."),))

    mapa_cabecalhos: dict[str, int] = {}
    colunas: dict[str, str] = dict(CABECALHOS_OBRIGATORIOS)
    erros: list[ErroImportacaoPlanilha] = []
    for indice, valor in enumerate(cabecalho):
        if valor is None:
            continue
        nome = _normalizar_cabecalho(valor)
        if nome in mapa_cabecalhos:
            erros.append(
                _erro_geral(
                    "cabecalho_duplicado", "O cabeçalho está duplicado.", nome, _texto(valor)
                )
            )
        mapa_cabecalhos[nome] = indice
        colunas[nome] = _texto(valor)
    for nome, exibido in CABECALHOS_OBRIGATORIOS.items():
        if nome not in mapa_cabecalhos:
            erros.append(
                _erro_geral(
                    "coluna_obrigatoria_ausente",
                    "Coluna obrigatória não encontrada.",
                    nome,
                    exibido,
                )
            )
    if erros:
        workbook.close()
        raise PlanilhaProjetoInvalida(tuple(erros))

    def erro_linha(numero, nome, codigo, mensagem, valor="", **parametros):
        return ErroImportacaoPlanilha(
            numero, nome, mensagem, codigo, colunas[nome], valor or None, parametros or None
        )

    def opcao(numero, nome, valor, enum):
        if not valor:
            erros.append(
                erro_linha(numero, nome, "valor_obrigatorio", f"{colunas[nome]} é obrigatório.")
            )
            return None
        encontrada = _OPCOES[enum].get(valor.casefold())
        if encontrada is None:
            esperados = [item.value for item in enum]
            erros.append(
                erro_linha(
                    numero,
                    nome,
                    "valor_invalido",
                    f"Use {', '.join(esperados)}.",
                    valor,
                    esperados=esperados,
                )
            )
        return encontrada

    valores_app: list[str] = []
    valores_one_ui: list[str] = []
    casos: list[LinhaCasoTesteImportada] = []
    primeira_linha_por_tc_id: dict[str, int] = {}
    total_linhas = 0
    pessoas: list[PessoasDaLinha] = []
    for numero_linha, valores in enumerate(linhas, start=2):
        if not any(_texto(valor) for valor in valores):
            continue
        total_linhas += 1
        campos = {
            nome: _texto(valores[indice] if indice < len(valores) else None)
            for nome, indice in mapa_cabecalhos.items()
        }
        if campos["app"] and not valores_app:
            valores_app.append(campos["app"])
        if campos["one ui"] and not valores_one_ui:
            valores_one_ui.append(campos["one ui"])

        tc_id = campos["tc id"]
        if not tc_id:
            erros.append(
                erro_linha(numero_linha, "tc id", "valor_obrigatorio", "TC ID é obrigatório.")
            )
        elif tc_id in primeira_linha_por_tc_id:
            erros.append(
                erro_linha(
                    numero_linha,
                    "tc id",
                    "tc_id_duplicado",
                    "TC ID duplicado na planilha.",
                    tc_id,
                    primeira_linha=primeira_linha_por_tc_id[tc_id],
                )
            )
        else:
            primeira_linha_por_tc_id[tc_id] = numero_linha
        category = opcao(numero_linha, "category", campos["category"], CategoriaCasoTeste)
        difficulty = opcao(numero_linha, "difficulty", campos["difficulty"], DificuldadeCasoTeste)
        situation = opcao(numero_linha, "tc situation", campos["tc situation"], SituacaoCasoTeste)
        responsavel = campos["assignees"]
        backup = campos["backup"]
        pessoas.append(PessoasDaLinha(numero_linha, responsavel, backup))
        if not responsavel:
            erros.append(
                erro_linha(
                    numero_linha, "assignees", "valor_obrigatorio", "Responsável é obrigatório."
                )
            )
        if not backup:
            erros.append(
                erro_linha(numero_linha, "backup", "valor_obrigatorio", "Backup é obrigatório.")
            )
        if tc_id and category and difficulty and situation and responsavel and backup:
            casos.append(
                LinhaCasoTesteImportada(
                    numero_linha, tc_id, category, difficulty, situation, responsavel, backup
                )
            )

    workbook.close()
    if not total_linhas:
        erros.append(_erro_geral("sem_casos", "A planilha precisa conter ao menos um Test Case."))
    else:
        if not valores_app:
            erros.append(
                _erro_geral(
                    "app_ausente", "Informe o App em pelo menos uma linha.", "app", colunas["app"]
                )
            )
        if not valores_one_ui:
            erros.append(
                _erro_geral(
                    "one_ui_ausente",
                    "Informe a versão One UI em pelo menos uma linha.",
                    "one ui",
                    colunas["one ui"],
                )
            )
    if erros:
        raise PlanilhaProjetoInvalida(tuple(erros), total_linhas, tuple(pessoas), colunas)
    return PlanilhaProjetoValidada(
        valores_app[0], valores_one_ui[0], tuple(casos), total_linhas, colunas
    )


def _normalizar_cabecalho(valor: object) -> str:
    return " ".join(str(valor).strip().casefold().replace("_", " ").split())


def _texto(valor: object) -> str:
    if valor is None:
        return ""
    return str(valor).strip()
