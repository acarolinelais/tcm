import unicodedata
from uuid import UUID

from src.application.schemas.importacao_projeto import (
    ImportarProjetoPlanilhaRequest,
    ImportarProjetoPlanilhaResponse,
)
from src.application.schemas.projeto import to_response
from src.application.services.projeto_service import ProjetoServiceImpl
from src.application.validators.importacao_projeto import validar_planilha_projeto
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
from src.domain.entities.time import Time
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

        planilha = validar_planilha_projeto(conteudo)
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

        usuarios = await self._usuario_repo.listar_ativos_da_unidade(usuario_atual.unidade_id)
        por_identificador: dict[str, dict[UUID, Usuario]] = {}
        for usuario in usuarios:
            por_identificador.setdefault(_normalizar_nome(usuario.nome), {})[usuario.id] = usuario
            por_identificador.setdefault(_normalizar_email(usuario.email), {})[usuario.id] = usuario

        atribuicoes = []
        for linha in planilha.casos:
            responsaveis = _usuarios_correspondentes(por_identificador, linha.responsavel)
            backups = _usuarios_correspondentes(por_identificador, linha.backup)
            if len(responsaveis) != 1:
                raise ConflictException(
                    f"Linha {linha.linha}: responsável '{linha.responsavel}' não foi encontrado "
                    "unicamente na unidade."
                )
            if len(backups) != 1:
                raise ConflictException(
                    f"Linha {linha.linha}: backup '{linha.backup}' não foi encontrado "
                    "unicamente na unidade."
                )
            responsavel, backup = responsaveis[0], backups[0]
            if responsavel.id == backup.id:
                raise ConflictException(
                    f"Linha {linha.linha}: responsável principal e backup devem ser "
                    "pessoas distintas."
                )
            await self._garantir_membro(time, responsavel.id, linha.linha, "responsável")
            await self._garantir_membro(time, backup.id, linha.linha, "backup")
            atribuicoes.append((linha, responsavel.id, backup.id))

        projeto = Projeto(usuario_atual.unidade_id, time.id, planilha.app, planilha.one_ui)
        casos = []
        for linha, responsavel_id, backup_id in atribuicoes:
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

    async def _garantir_membro(self, time: Time, usuario_id, linha: int, papel: str) -> None:
        membro = await self._membro_repo.obter_por_time_e_usuario(
            time.unidade_id, time.id, usuario_id
        )
        if membro is None or not membro.ativo:
            raise ConflictException(f"Linha {linha}: {papel} precisa ser membro ativo do time.")


def _normalizar_nome(valor: str) -> str:
    normalizado = unicodedata.normalize("NFC", valor)
    return " ".join(normalizado.split()).casefold()


def _normalizar_email(valor: str) -> str:
    normalizado = unicodedata.normalize("NFC", valor)
    return "".join(normalizado.split()).casefold()


def _usuarios_correspondentes(
    por_identificador: dict[str, dict[UUID, Usuario]], identificador: str
) -> tuple[Usuario, ...]:
    encontrados = {
        **por_identificador.get(_normalizar_nome(identificador), {}),
        **por_identificador.get(_normalizar_email(identificador), {}),
    }
    return tuple(encontrados.values())
