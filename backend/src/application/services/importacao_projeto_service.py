import unicodedata
from uuid import UUID

from src.application.schemas.importacao_projeto import (
    ImportarProjetoPlanilhaRequest,
    ImportarProjetoPlanilhaResponse,
)
from src.application.schemas.projeto import to_response
from src.application.services.projeto_service import ProjetoServiceImpl
from src.application.validators.importacao_projeto import (
    ErroImportacaoPlanilha,
    PessoasDaLinha,
    PlanilhaProjetoInvalida,
    validar_planilha_projeto,
)
from src.domain.common.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.domain.common.usuario_autenticado import UsuarioAutenticado
from src.domain.entities.caso_teste import CasoTeste
from src.domain.entities.interfaces.caso_teste_repository import CasoTesteRepository
from src.domain.entities.interfaces.modelo_dispositivo_repository import (
    ModeloDispositivoRepository,
)
from src.domain.entities.interfaces.projeto_modelo_repository import ProjetoModeloRepository
from src.domain.entities.interfaces.projeto_repository import ProjetoRepository
from src.domain.entities.interfaces.time_membro_repository import TimeMembroRepository
from src.domain.entities.interfaces.time_repository import TimeRepository
from src.domain.entities.interfaces.unit_of_work import UnitOfWork
from src.domain.entities.interfaces.usuario_repository import UsuarioRepository
from src.domain.entities.projeto import Projeto
from src.domain.entities.projeto_modelo import ProjetoModelo
from src.domain.entities.usuario import Usuario


class ImportacaoProjetoServiceImpl:
    def __init__(
        self,
        projeto_repo: ProjetoRepository,
        caso_repo: CasoTesteRepository,
        time_repo: TimeRepository,
        membro_repo: TimeMembroRepository,
        usuario_repo: UsuarioRepository,
        modelo_repo: ModeloDispositivoRepository,
        projeto_modelo_repo: ProjetoModeloRepository,
        uow: UnitOfWork,
    ) -> None:
        self._projeto_repo = projeto_repo
        self._caso_repo = caso_repo
        self._time_repo = time_repo
        self._membro_repo = membro_repo
        self._usuario_repo = usuario_repo
        self._modelo_repo = modelo_repo
        self._projeto_modelo_repo = projeto_modelo_repo
        self._uow = uow

    async def importar(
        self,
        usuario_atual: UsuarioAutenticado,
        request: ImportarProjetoPlanilhaRequest,
        conteudo: bytes,
    ) -> ImportarProjetoPlanilhaResponse:
        if not usuario_atual.eh_administrador and (
            usuario_atual.perfil_codigo not in {"GERENTE", "KP"}
            or not usuario_atual.pode("projetos.gerenciar")
        ):
            raise ForbiddenException("Você não tem permissão para importar projetos.")

        time = await self._time_repo.obter_por_id(usuario_atual.unidade_id, request.time_id)
        if time is None:
            raise NotFoundException("Time não encontrado.")
        if not time.ativo:
            raise ConflictException("Não é possível criar um projeto em um time inativo.")
        ProjetoServiceImpl._validar_escopo_time(usuario_atual, time.id, time.setor_id)

        modelo_ids = tuple(dict.fromkeys(request.modelos_ids))
        if len(modelo_ids) != len(request.modelos_ids):
            raise ConflictException("A lista contém modelos de dispositivo duplicados.")
        modelos = await self._modelo_repo.listar_por_ids(usuario_atual.unidade_id, modelo_ids)
        if len(modelos) != len(modelo_ids):
            raise ConflictException("Todos os modelos devem existir e estar ativos nesta unidade.")

        # Os problemas das células e os de pessoas voltam juntos, numa única resposta (ADR 0033).
        try:
            planilha = validar_planilha_projeto(conteudo)
            erros: list[ErroImportacaoPlanilha] = []
            pessoas = [PessoasDaLinha(c.linha, c.responsavel, c.backup) for c in planilha.casos]
            colunas, total_linhas = planilha.colunas, planilha.total_linhas
        except PlanilhaProjetoInvalida as invalida:
            if not invalida.pessoas:
                raise
            planilha = None
            erros, pessoas = list(invalida.erros), list(invalida.pessoas)
            colunas, total_linhas = invalida.colunas, invalida.total_linhas

        usuarios = await self._usuario_repo.listar_ativos_da_unidade(usuario_atual.unidade_id)
        por_identificador: dict[str, dict[UUID, Usuario]] = {}
        for usuario in usuarios:
            por_identificador.setdefault(_normalizar_nome(usuario.nome), {})[usuario.id] = usuario
            por_identificador.setdefault(_normalizar_email(usuario.email), {})[usuario.id] = usuario
            if usuario.user_id is not None:
                por_identificador.setdefault(_normalizar_user_id(usuario.user_id), {})[
                    usuario.id
                ] = usuario

        membros_ativos = {
            membro.usuario_id
            for membro in await self._membro_repo.listar_por_time(time.unidade_id, time.id)
        }
        atribuicoes: dict[int, tuple[UUID, UUID]] = {}

        def pessoa(numero: int, campo: str, identificador: str) -> Usuario | None:
            if not identificador:
                return None  # A célula vazia já foi reportada pelo validador.
            encontrados = _usuarios_correspondentes(por_identificador, identificador)
            do_time = [usuario for usuario in encontrados if usuario.id in membros_ativos]
            if len(encontrados) == 1 and len(do_time) == 1:
                return do_time[0]
            if not encontrados:
                codigo, mensagem = "pessoa_nao_encontrada", "Pessoa não encontrada na unidade."
            elif len(encontrados) > 1:
                codigo, mensagem = "pessoa_ambigua", "Mais de uma pessoa corresponde a este valor."
            else:
                codigo, mensagem = (
                    "pessoa_fora_do_time",
                    "A pessoa precisa ser membro ativo do time.",
                )
            erros.append(
                ErroImportacaoPlanilha(
                    numero, campo, mensagem, codigo, colunas[campo], identificador
                )
            )
            return None

        for linha in pessoas:
            responsavel = pessoa(linha.linha, "assignees", linha.responsavel)
            backup = pessoa(linha.linha, "backup", linha.backup)
            if responsavel is not None and backup is not None:
                if responsavel.id == backup.id:
                    erros.append(
                        ErroImportacaoPlanilha(
                            linha.linha,
                            "backup",
                            "Responsável principal e backup devem ser pessoas distintas.",
                            "responsavel_igual_backup",
                            colunas["backup"],
                            linha.backup,
                        )
                    )
                else:
                    atribuicoes[linha.linha] = (responsavel.id, backup.id)
        if erros or planilha is None:
            # Gerais primeiro; depois por linha, como a pessoa lê a planilha.
            erros.sort(key=lambda erro: (erro.linha is not None, erro.linha or 0))
            raise PlanilhaProjetoInvalida(tuple(erros), total_linhas)

        projeto = Projeto(usuario_atual.unidade_id, time.id, planilha.app, planilha.one_ui)
        casos = []
        for linha in planilha.casos:
            responsavel_id, backup_id = atribuicoes[linha.linha]
            casos.append(
                CasoTeste(
                    usuario_atual.unidade_id,
                    projeto.id,
                    linha.tc_id,
                    linha.category,
                    linha.difficulty,
                    responsavel_id,
                    backup_id,
                    linha.situation,
                )
            )

        await self._projeto_repo.adicionar(projeto)
        for modelo in modelos:
            await self._projeto_modelo_repo.adicionar(
                ProjetoModelo(usuario_atual.unidade_id, projeto.id, modelo.id)
            )
        for caso in casos:
            await self._caso_repo.adicionar(caso)
        await self._uow.commit()
        projeto_criado = await self._projeto_repo.obter_por_id(projeto.unidade_id, projeto.id)
        return ImportarProjetoPlanilhaResponse(
            projeto=to_response(projeto_criado or projeto), quantidade_casos=len(casos)
        )


def _normalizar_nome(valor: str) -> str:
    normalizado = unicodedata.normalize("NFC", valor)
    return " ".join(normalizado.split()).casefold()


def _normalizar_email(valor: str) -> str:
    normalizado = unicodedata.normalize("NFC", valor)
    return "".join(normalizado.split()).casefold()


def _normalizar_user_id(valor: str) -> str:
    return unicodedata.normalize("NFC", valor).strip().casefold()


def _usuarios_correspondentes(
    por_identificador: dict[str, dict[UUID, Usuario]], identificador: str
) -> tuple[Usuario, ...]:
    encontrados = {
        **por_identificador.get(_normalizar_nome(identificador), {}),
        **por_identificador.get(_normalizar_email(identificador), {}),
        **por_identificador.get(_normalizar_user_id(identificador), {}),
    }
    return tuple(encontrados.values())
