import re
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import PureWindowsPath
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from src.application.validators.importacao_projeto import (
    ErroImportacaoPlanilha,
    _normalizar_cabecalho,
    _texto,
)
from src.domain.entities.resultado_form_factor import ResultadoFormFactor
from src.domain.entities.rodada_form_factor import RodadaFormFactor


class RelatorioSdfInvalido(ValueError):
    def __init__(self, erros: tuple[ErroImportacaoPlanilha, ...]) -> None:
        self.erros = erros
        super().__init__("O relatório SDF possui dados inválidos.")


# Formato novo do SDF (spec 060): um device por arquivo, SDF ID no nome, device e data no cabeçalho.
LINHA_CABECALHO_RESULTADOS = 7
SCRIPTS_DE_PREPARACAO = frozenset({"hq_precondition.py", "setup.py"})
# O relatório tem 9 colunas. Sem limite, uma célula perdida na coluna XFD faz cada linha vir com
# 16 mil células e a leitura trava o worker.
MAX_COLUNAS = 30
# O mesmo vale para as linhas: uma célula perdida na linha 1.048.576 faria ler um milhão de linhas
# vazias. A leitura para depois de tantas linhas vazias seguidas.
MAX_LINHAS_VAZIAS_SEGUIDAS = 200
_ONE_UI = re.compile(r"oneui(\d+)", re.IGNORECASE)
_COLUNAS_OBRIGATORIAS = {
    "script name": "Script Name",
    "state": "State",
    "test file path": "Test File Path",
}
# Description pode faltar: a descrição é opcional (RN-07).
_COLUNAS_RESULTADOS = {**_COLUNAS_OBRIGATORIAS, "description": "Description"}


@dataclass(frozen=True)
class LinhaResultadoSdf:
    linha: int
    tc_id: str
    resultado: str
    descricao: str | None
    one_ui: str


@dataclass(frozen=True)
class RelatorioSdfLido:
    """O que deu para ler do arquivo e os problemas dele; os do projeto vêm depois."""

    sdf_id: str | None
    device: str
    data_execucao: datetime | None
    linhas: tuple[LinhaResultadoSdf, ...]
    erros: tuple[ErroImportacaoPlanilha, ...]


def sdf_id_do_nome(nome_arquivo: str | None) -> str | None:
    """`123456-789012_0_Test_1_Detail.xlsx` dá `123456-789012`; sem nada antes do "_", nulo."""
    nome = PureWindowsPath(nome_arquivo or "").name
    if "_" not in nome:
        return None
    return nome.split("_", 1)[0].strip() or None


# O SDF exporta ano/mês/dia, com ou sem hora; mês/dia/ano com hora de 12 horas é o formato dos
# relatórios antigos. Começar pelo ano impede que um formato seja lido como o outro.
_FORMATOS_DATA_F4 = (
    "%Y/%m/%d %I:%M:%S %p",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%d",
    "%m/%d/%Y %I:%M:%S %p",
)


def converter_data_f4(valor: object) -> datetime | None:
    """Start Time da F4, com espaços e quebra de linha a mais."""
    if isinstance(valor, datetime):
        return valor
    texto = " ".join(_texto(valor).split())
    for formato in _FORMATOS_DATA_F4:
        try:
            return datetime.strptime(texto, formato)
        except ValueError:
            continue
    return None


def one_ui_do_caminho(caminho: object) -> str | None:
    """Dígitos depois de "OneUI", sem ponto: `95` é 9.5, `10` é 10 e `105` é 10.5 (RN-08)."""
    # Só no nome do arquivo: uma pasta "OneUI8/" no caminho não conta.
    encontrado = _ONE_UI.search(PureWindowsPath(_texto(caminho)).name)
    if not encontrado:
        return None
    digitos = encontrado.group(1)
    tamanho = 2 if digitos.startswith("1") and len(digitos) > 1 else 1
    principal, menor = digitos[:tamanho], digitos[tamanho:]
    return f"{principal}.{menor}" if menor else principal


def tc_id_do_script(script: object) -> str:
    texto = _texto(script)
    return texto[:-3] if texto.casefold().endswith(".py") else texto


def _ler_linhas(linhas) -> list[tuple]:
    """As linhas até a última preenchida, parando depois de muitas vazias seguidas."""
    lidas: list[tuple] = []
    vazias = 0
    for linha in linhas:
        vazias = 0 if any(_texto(valor) for valor in linha) else vazias + 1
        if vazias > MAX_LINHAS_VAZIAS_SEGUIDAS:
            break
        lidas.append(linha)
    return lidas


def _celula(linhas: list[tuple], linha: int, coluna: int) -> object:
    """Valor pela posição do Excel (linha e coluna a partir de 1); fora da planilha, nulo."""
    if linha > len(linhas) or coluna > len(linhas[linha - 1]):
        return None
    return linhas[linha - 1][coluna - 1]


def _erro(linha, campo, mensagem, codigo, coluna=None, valor=None, parametros=None):
    return ErroImportacaoPlanilha(linha, campo, mensagem, codigo, coluna, valor or None, parametros)


def ler_relatorio_sdf(nome_arquivo: str | None, conteudo: bytes) -> RelatorioSdfLido:
    """Lê o relatório novo sem levantar por conteúdo: o service junta estes erros aos do projeto.

    Só um arquivo que não abre como Excel levanta `RelatorioSdfInvalido`.
    """
    try:
        workbook = load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
        linhas = _ler_linhas(workbook.active.iter_rows(values_only=True, max_col=MAX_COLUNAS))
        workbook.close()
    except (BadZipFile, InvalidFileException, OSError, ValueError, KeyError) as erro:
        raise RelatorioSdfInvalido(
            (
                _erro(
                    None,
                    "arquivo",
                    "O arquivo não é uma planilha Excel válida.",
                    "arquivo_invalido",
                ),
            )
        ) from erro

    erros: list[ErroImportacaoPlanilha] = []
    sdf_id = sdf_id_do_nome(nome_arquivo)
    if sdf_id is None:
        erros.append(
            _erro(
                None,
                "arquivo",
                'O nome do arquivo precisa começar pelo SDF ID seguido de "_" '
                "(ex.: 123456-789012_0_Test_1_Detail.xlsx).",
                "sdf_nome_sem_id",
                valor=PureWindowsPath(nome_arquivo or "").name,
            )
        )
    elif len(sdf_id) > RodadaFormFactor.SDF_ID_MAX_LENGTH:
        erros.append(
            _erro(
                None,
                "sdf_id",
                f"O SDF ID passa de {RodadaFormFactor.SDF_ID_MAX_LENGTH} caracteres.",
                "texto_muito_longo",
                coluna="SDF ID",
                parametros={"maximo": RodadaFormFactor.SDF_ID_MAX_LENGTH},
            )
        )
        sdf_id = None

    cabecalho = [
        _normalizar_cabecalho(valor) if valor is not None else ""
        for valor in (
            linhas[LINHA_CABECALHO_RESULTADOS - 1]
            if len(linhas) >= LINHA_CABECALHO_RESULTADOS
            else ()
        )
    ]
    colunas = {nome: cabecalho.index(nome) + 1 for nome in _COLUNAS_RESULTADOS if nome in cabecalho}
    device = _texto(_celula(linhas, 4, 3))
    if not _COLUNAS_OBRIGATORIAS.keys() <= colunas.keys() or not device:
        # Sem a tabela da linha 7 ou sem o device, não é o relatório novo (o antigo cai aqui).
        erros.append(
            _erro(
                None,
                "arquivo",
                "O arquivo não está no formato do relatório do SDF.",
                "sdf_formato_invalido",
            )
        )
        # Sem o formato, o C4 não é um device: nada de "device não associado" além deste erro.
        return RelatorioSdfLido(sdf_id, "", None, (), tuple(erros))

    bruta = _celula(linhas, 4, 6)
    data_execucao = converter_data_f4(bruta)
    if data_execucao is None:
        erros.append(
            _erro(
                None,
                "f4",
                "A célula F4 (Start Time) não tem uma data válida. "
                "Use ano/mês/dia, como 2026/11/11.",
                "sdf_data_invalida",
                coluna="F4",
                valor=" ".join(_texto(bruta).split()),
            )
        )

    resultados: list[LinhaResultadoSdf] = []
    com_problema = False
    for numero in range(LINHA_CABECALHO_RESULTADOS + 1, len(linhas) + 1):
        if not any(_texto(valor) for valor in linhas[numero - 1]):
            continue
        campos = {nome: _texto(_celula(linhas, numero, col)) for nome, col in colunas.items()}
        script, estado = campos["script name"], campos["state"]
        if script.casefold() in SCRIPTS_DE_PREPARACAO:
            continue
        if not script or not estado:
            com_problema = True
            erros.append(
                _erro(
                    numero,
                    "script name" if not script else "state",
                    f"Linha {numero}: Script Name e State são obrigatórios.",
                    "valor_obrigatorio",
                    coluna=_COLUNAS_OBRIGATORIAS["script name" if not script else "state"],
                )
            )
            continue
        caminho = campos["test file path"]
        one_ui = one_ui_do_caminho(caminho)
        if one_ui is None:
            com_problema = True
            erros.append(
                _erro(
                    numero,
                    "test file path",
                    f'Linha {numero}: o Test File Path precisa ter "OneUI" seguido da versão '
                    "(ex.: Keyboard_A_OneUI95.ts).",
                    "sdf_one_ui_invalido",
                    coluna="Test File Path",
                    valor=caminho,
                )
            )
            continue
        descricao = campos.get("description") or None
        longos = [
            (coluna, maximo)
            for coluna, texto, maximo in (
                ("State", estado, ResultadoFormFactor.RESULTADO_MAX_LENGTH),
                ("Description", descricao or "", ResultadoFormFactor.DESCRICAO_MAX_LENGTH),
            )
            if len(texto) > maximo
        ]
        for coluna, maximo in longos:
            erros.append(
                _erro(
                    numero,
                    coluna.casefold(),
                    f"Linha {numero}: {coluna} passa de {maximo} caracteres.",
                    "texto_muito_longo",
                    coluna=coluna,
                    parametros={"maximo": maximo},
                )
            )
        if longos:
            com_problema = True
            continue
        resultados.append(
            LinhaResultadoSdf(numero, tc_id_do_script(script), estado, descricao, one_ui)
        )

    if not resultados and not com_problema:
        erros.append(
            _erro(
                None,
                "arquivo",
                "O relatório não tem resultados de Test Cases.",
                "sdf_sem_resultados",
            )
        )
    return RelatorioSdfLido(sdf_id, device, data_execucao, tuple(resultados), tuple(erros))
