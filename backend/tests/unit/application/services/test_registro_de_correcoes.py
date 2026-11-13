from datetime import datetime
from uuid import uuid4

from src.application.services.registro_de_correcoes import RegistroDeCorrecoes
from src.domain.entities.caso_teste import StatusCasoTeste
from src.domain.entities.correcao import Correcao, OrigemCorrecao, ResultadoCorrecao
from tests.unit.domain.test_caso_teste import criar_caso

S = StatusCasoTeste
FALHA = datetime(2026, 11, 10, 18, 10)


class _RepoEmMemoria:
    def __init__(self):
        self.linhas = []

    async def adicionar(self, correcao):
        self.linhas.append(correcao)

    async def atualizar(self, correcao):
        pass

    async def listar_por_importacao(self, unidade_id, importacao_sdf_id):
        return tuple(
            c
            for c in self.linhas
            if importacao_sdf_id in (c.aberta_por_importacao_id, c.fechada_por_importacao_id)
        )

    async def obter_por_tentativa(self, unidade_id, caso_teste_id, tentativa):
        return next(
            (
                c
                for c in self.linhas
                if c.caso_teste_id == caso_teste_id and c.tentativa == tentativa and c.ativo
            ),
            None,
        )

    async def obter_aberta(self, unidade_id, caso_teste_id):
        return next((c for c in self.linhas if c.caso_teste_id == caso_teste_id and c.aberta), None)


def _registro():
    repo = _RepoEmMemoria()
    return RegistroDeCorrecoes(repo), repo


async def _falhar_em_validacao(registro, caso, quando=FALHA, importacao_id=None):
    antes = registro.antes(caso)
    caso.aplicar_resultado_sdf(sem_falha=False, falha_no_relatorio=True)
    await registro.registrar(caso, antes, quando, importacao_id)


async def test_falha_em_validacao_abre_a_tentativa_1():
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    importacao = uuid4()

    await _falhar_em_validacao(registro, caso, importacao_id=importacao)

    [correcao] = repo.linhas
    assert (correcao.tentativa, correcao.origem, correcao.falha_em) == (
        1,
        OrigemCorrecao.VALIDACAO,
        FALHA,
    )
    assert correcao.aberta_por_importacao_id == importacao
    assert correcao.aberta


async def test_passar_em_todos_os_devices_fecha_como_corrigida():
    # CA-07.
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    await _falhar_em_validacao(registro, caso)
    caso.correcao_em_revisao_em = datetime(2026, 11, 12)
    caso.status = S.IN_VALIDATION

    antes = registro.antes(caso)
    caso.aplicar_resultado_sdf(sem_falha=True, falha_no_relatorio=False)
    await registro.registrar(caso, antes, datetime(2026, 11, 14, 18, 0))

    [correcao] = repo.linhas
    assert correcao.resultado is ResultadoCorrecao.CORRIGIDA
    assert correcao.corretor_id == caso.responsavel_id
    assert correcao.em_revisao_em == datetime(2026, 11, 12)
    assert correcao.fechada_em == datetime(2026, 11, 14, 18, 0)


async def test_nova_falha_fecha_como_falhou_de_novo_e_abre_a_seguinte_com_o_mesmo_corretor():
    # CA-08.
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    caso.dev_fix_id = uuid4()
    await _falhar_em_validacao(registro, caso)
    caso.status = S.IN_VALIDATION

    await _falhar_em_validacao(registro, caso, datetime(2026, 11, 13))

    primeira, segunda = repo.linhas
    assert primeira.resultado is ResultadoCorrecao.FALHOU_DE_NOVO
    assert primeira.corretor_id == caso.dev_fix_id
    assert (segunda.tentativa, segunda.aberta) == (2, True)


async def test_regressao_em_done_abre_tentativa_de_origem_regressao():
    registro, repo = _registro()
    caso = criar_caso(S.DONE)

    antes = registro.antes(caso)
    caso.reabrir_por_regressao()
    await registro.registrar(caso, antes, FALHA)

    [correcao] = repo.linhas
    assert (correcao.tentativa, correcao.origem) == (1, OrigemCorrecao.REGRESSAO)


async def test_cancelar_durante_a_correcao_fecha_como_encerrada():
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    await _falhar_em_validacao(registro, caso)

    antes = registro.antes(caso)
    caso.cancelar("Depende de hardware")
    await registro.registrar(caso, antes, datetime(2026, 11, 11))

    assert repo.linhas[0].resultado is ResultadoCorrecao.ENCERRADA


async def test_falha_mudanca_fora_da_correcao_nao_grava_nada():
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)

    antes = registro.antes(caso)
    caso.aplicar_resultado_sdf(sem_falha=True, falha_no_relatorio=False)
    await registro.registrar(caso, antes, FALHA)

    assert repo.linhas == []


async def test_falha_mover_dentro_da_correcao_nao_fecha_a_tentativa():
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    await _falhar_em_validacao(registro, caso)

    antes = registro.antes(caso)
    caso.mudar_status_da_correcao(S.IN_PROGRESS)
    await registro.registrar(caso, antes, datetime(2026, 11, 11))

    assert repo.linhas[0].aberta


async def test_desfazer_inativa_a_que_a_importacao_abriu_e_reabre_a_que_ela_fechou():
    # RN-06: a importação fechou a tentativa 1 (falhou de novo) e abriu a 2.
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    await _falhar_em_validacao(registro, caso)
    caso.status = S.IN_VALIDATION
    importacao = uuid4()
    await _falhar_em_validacao(registro, caso, datetime(2026, 11, 13), importacao)

    await registro.desfazer(caso.unidade_id, importacao, {caso.id})

    primeira, segunda = repo.linhas
    assert primeira.aberta and primeira.ativo
    assert not segunda.ativo


async def test_falha_desfazer_nao_mexe_nas_tentativas_do_caso_que_nao_voltou():
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    importacao = uuid4()
    await _falhar_em_validacao(registro, caso, importacao_id=importacao)

    await registro.desfazer(caso.unidade_id, importacao, set())

    assert repo.linhas[0].ativo


async def test_falha_tentativa_que_sobrou_de_importacao_antiga_desfeita_e_substituida():
    # Backfill sem importação de origem (RN-11): o caso voltou para a tentativa 0, e a linha da 1
    # ficou ativa.
    registro, repo = _registro()
    caso = criar_caso(S.IN_VALIDATION)
    sobra = Correcao(caso.unidade_id, caso.id, 1, OrigemCorrecao.VALIDACAO, FALHA)
    repo.linhas.append(sobra)

    await _falhar_em_validacao(registro, caso, datetime(2026, 11, 13))

    assert not sobra.ativo
    [nova] = [c for c in repo.linhas if c.ativo]
    assert (nova.tentativa, nova.falha_em) == (1, datetime(2026, 11, 13))
