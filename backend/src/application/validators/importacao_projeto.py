import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import BytesIO
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
    NivelAutomacaoCasoTeste,
    SituacaoCasoTeste,
)
from src.domain.entities.projeto import Projeto

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

# Textos do caso (spec 028), opcionais: cabeçalho normalizado → (exibido, campo, limite).
TEXTOS_CASO_TESTE = {
    "title(english)": ("Title(English)", "title", CasoTeste.TITLE_MAX_LENGTH),
    "test precondition(english)": (
        "Test Precondition(English)",
        "precondition",
        CasoTeste.TEXTO_MAX_LENGTH,
    ),
    "test procedure(english)": ("Test Procedure(English)", "procedure", CasoTeste.TEXTO_MAX_LENGTH),
    "expected result(english)": (
        "Expected Result(English)",
        "expected_result",
        CasoTeste.TEXTO_MAX_LENGTH,
    ),
}

# Colunas que podem faltar na planilha: ausente equivale a célula vazia, sem erro.
CABECALHOS_OPCIONAIS = {
    "automation level": "Automation Level",
    "planned date": "Planned date",
    **{nome: exibido for nome, (exibido, _, _) in TEXTOS_CASO_TESTE.items()},
}

# Quanto do texto longo volta no `valor` do erro: o bastante para achar a célula sem repetir 10 mil
# caracteres no 422. A prévia (planilha-projeto.ts) trunca igual.
TRECHO_TEXTO_LONGO = 40

# Inteiro puro ou com casa decimal zerada ("2", "2.0"), como o Excel entrega o número. É a mesma
# regra do navegador (planilha-projeto.ts): a prévia e a importação não podem divergir. [0-9] e não
# \d porque, em str, \d casa dígitos de outros alfabetos ("２") que o JavaScript recusa.
_NIVEL_AUTOMACAO = re.compile(r"[0-9]+(\.0+)?")

# Planned date em texto (spec 075): dia/mês/ano, como a tabela mostra. A célula de data do Excel
# chega como datetime e não passa por aqui.
_DATA_TEXTO = re.compile(r"([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})")

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
    automation_level: NivelAutomacaoCasoTeste | None = None
    title: str | None = None
    precondition: str | None = None
    procedure: str | None = None
    expected_result: str | None = None


@dataclass(frozen=True)
class PlanilhaProjetoValidada:
    app: str
    one_ui: str
    casos: tuple[LinhaCasoTesteImportada, ...]
    total_linhas: int
    # Cabeçalho normalizado → texto como está na planilha, para as mensagens do service.
    colunas: dict[str, str]
    # Spec 075: a data planejada do projeto, a mesma em todas as linhas preenchidas.
    data_planejada: date | None = None


def _erro_geral(
    codigo: str, mensagem: str, campo: str = "planilha", coluna: str | None = None
) -> ErroImportacaoPlanilha:
    return ErroImportacaoPlanilha(None, campo, mensagem, codigo, coluna)


def validar_planilha_projeto(conteudo: bytes, hoje: date | None = None) -> PlanilhaProjetoValidada:
    """`hoje`: o dia de quem importa, para o intervalo da Planned date (spec 071, RN-09)."""
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
    colunas: dict[str, str] = {**CABECALHOS_OBRIGATORIOS, **CABECALHOS_OPCIONAIS}
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

    def nivel_automacao(numero, valor):
        if not valor:
            return None
        if _NIVEL_AUTOMACAO.fullmatch(valor):
            try:
                return NivelAutomacaoCasoTeste(int(valor.split(".")[0]))
            except ValueError:
                pass
        esperados = [str(nivel.value) for nivel in NivelAutomacaoCasoTeste]
        erros.append(
            erro_linha(
                numero,
                "automation level",
                "valor_invalido",
                f"Use {', '.join(esperados)}.",
                valor,
                esperados=esperados,
            )
        )
        return None

    def texto(numero, nome, maximo):
        valor = campos.get(nome, "")
        # Conta code points, como o banco; o navegador conta igual com [...texto].length.
        if len(valor) > maximo:
            erros.append(
                erro_linha(
                    numero,
                    nome,
                    "texto_muito_longo",
                    f"{colunas[nome]} deve ter no máximo {maximo} caracteres.",
                    valor[:TRECHO_TEXTO_LONGO] + "…",
                    maximo=maximo,
                )
            )
            return None
        return valor or None

    limite = hoje + timedelta(days=Projeto.DATA_PLANEJADA_MAX_DIAS) if hoje else None

    def data_planejada(numero, valor):
        if not _texto(valor):
            return None
        data = _ler_data(valor)
        if data is None:
            erros.append(
                erro_linha(
                    numero,
                    "planned date",
                    "data_planejada_invalida",
                    "Use uma data no formato dd/mm/aaaa.",
                    _texto(valor),
                )
            )
            return None
        if hoje and limite and not hoje <= data <= limite:
            erros.append(
                erro_linha(
                    numero,
                    "planned date",
                    "data_planejada_fora_do_intervalo",
                    "A data planejada deve estar entre hoje e daqui a dois anos.",
                    data.strftime("%d/%m/%Y"),
                )
            )
            return None
        return data

    planejada: tuple[int, date] | None = None  # (primeira linha, data)
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
        automation_level = nivel_automacao(numero_linha, campos.get("automation level", ""))
        if "planned date" in mapa_cabecalhos:
            indice = mapa_cabecalhos["planned date"]
            data = data_planejada(numero_linha, valores[indice] if indice < len(valores) else None)
            if data is not None and planejada is None:
                planejada = (numero_linha, data)
            elif data is not None and data != planejada[1]:
                erros.append(
                    erro_linha(
                        numero_linha,
                        "planned date",
                        "data_planejada_divergente",
                        "A Planned date é do projeto: use a mesma data em todas as linhas.",
                        data.strftime("%d/%m/%Y"),
                        primeira_linha=planejada[0],
                    )
                )
        textos = {
            campo: texto(numero_linha, nome, maximo)
            for nome, (_, campo, maximo) in TEXTOS_CASO_TESTE.items()
        }
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
                    numero_linha,
                    tc_id,
                    category,
                    difficulty,
                    situation,
                    responsavel,
                    backup,
                    automation_level,
                    **textos,
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
        valores_app[0],
        valores_one_ui[0],
        tuple(casos),
        total_linhas,
        colunas,
        planejada[1] if planejada else None,
    )


def _normalizar_cabecalho(valor: object) -> str:
    normalizado = " ".join(str(valor).strip().casefold().replace("_", " ").split())
    # "Title (English)" e "Title(English)" são a mesma coluna: espaço junto de parêntese não conta.
    return re.sub(r"\s*([()])\s*", r"\1", normalizado)


def _ler_data(valor: object) -> date | None:
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    encontrada = _DATA_TEXTO.fullmatch(_texto(valor))
    if encontrada is None:
        return None
    dia, mes, ano = (int(parte) for parte in encontrada.groups())
    try:
        return date(ano, mes, dia)
    except ValueError:
        return None


def _texto(valor: object) -> str:
    if valor is None:
        return ""
    return str(valor).strip()
