from datetime import UTC, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from src.application.schemas.timeline import to_timeline_response
from src.domain.common.cor_avatar import CorAvatar
from src.domain.queries.registro_auditoria import RegistroAuditoria, RegistroTimeline

SAO_PAULO = ZoneInfo("America/Sao_Paulo")
ANA, BIA, CAIO = uuid4(), uuid4(), uuid4()
NOMES = {ANA: "Ana", BIA: "Bia", CAIO: "Caio"}
CLOCK_1, CLOCK_46, CLOCK_50 = uuid4(), uuid4(), uuid4()
# Caso: (TC ID, responsável).
CASOS = {
    CLOCK_1: ("Clock_00001", ANA),
    CLOCK_46: ("Clock_00046", BIA),
    CLOCK_50: ("Clock_00050", CAIO),
}


def _registro(
    caso, quando, autor="KP Kaique", campo="status", antes="InProgress", depois="InReview"
):
    tc_id, responsavel = CASOS[caso]
    return RegistroTimeline(
        registro=RegistroAuditoria(
            table_name="casos_teste",
            operation="UPDATE",
            old_values={campo: antes},
            new_values={campo: depois},
            changed_fields=(campo,),
            usuario_nome=autor,
            usuario_perfil="Key Person" if autor else None,
            origem="api",
            created_at=quando,
        ),
        caso_teste_id=caso,
        tc_id=tc_id,
        title=f"Título {tc_id}",
        responsavel_id=responsavel,
        responsavel_nome=NOMES[responsavel],
        responsavel_cor_avatar=CorAvatar.ROXO,
    )


def _resposta(registros, responsavel_ids=(), caso_ids=()):
    # O repositório entrega do mais recente para o mais antigo.
    ordenados = sorted(registros, key=lambda r: r.registro.created_at, reverse=True)
    return to_timeline_response(ordenados, {}, SAO_PAULO, responsavel_ids, caso_ids)


def test_um_card_por_caso_e_dia_mostra_o_responsavel_e_guarda_quem_fez_cada_mudanca():
    resposta = _resposta(
        [
            _registro(CLOCK_46, datetime(2026, 12, 28, 13, tzinfo=UTC), autor="Bia"),
            _registro(
                CLOCK_46, datetime(2026, 12, 28, 15, tzinfo=UTC), "Kaique", "category", "A", "B"
            ),
        ]
    )

    (card,) = resposta.cards
    assert (card.tc_id, card.responsavel_nome, str(card.dia)) == (
        "Clock_00046",
        "Bia",
        "2026-12-28",
    )
    assert [(a.campo, a.usuario_nome) for a in card.alteracoes] == [
        ("category", "Kaique"),
        ("status", "Bia"),
    ]
    assert card.primeira_em == datetime(2026, 12, 28, 13, tzinfo=UTC)


def test_o_dia_do_card_e_o_do_fuso_de_quem_consulta():
    # 02h30 UTC do dia 29 ainda é 23h30 do dia 28 em São Paulo.
    resposta = _resposta(
        [
            _registro(CLOCK_46, datetime(2026, 12, 29, 2, 30, tzinfo=UTC)),
            _registro(CLOCK_46, datetime(2026, 12, 29, 13, tzinfo=UTC)),
        ]
    )

    assert [str(c.dia) for c in resposta.cards] == ["2026-12-28", "2026-12-29"]


def test_filtra_varios_responsaveis_e_mantem_todos_nas_opcoes():
    dia = datetime(2026, 12, 28, 13, tzinfo=UTC)
    registros = [_registro(CLOCK_1, dia), _registro(CLOCK_46, dia), _registro(CLOCK_50, dia)]

    resposta = _resposta(registros, responsavel_ids={ANA, BIA})

    assert {c.responsavel_nome for c in resposta.cards} == {"Ana", "Bia"}
    assert [p.nome for p in resposta.pessoas] == ["Ana", "Bia", "Caio"]


def test_filtra_varios_casos_e_combina_com_responsavel():
    dia = datetime(2026, 12, 28, 13, tzinfo=UTC)
    registros = [_registro(CLOCK_1, dia), _registro(CLOCK_46, dia), _registro(CLOCK_50, dia)]

    so_casos = _resposta(registros, caso_ids={CLOCK_1, CLOCK_46})
    combinado = _resposta(registros, caso_ids={CLOCK_1, CLOCK_46}, responsavel_ids={BIA})

    assert {c.tc_id for c in so_casos.cards} == {"Clock_00001", "Clock_00046"}
    assert [(c.tc_id, c.responsavel_nome) for c in combinado.cards] == [("Clock_00046", "Bia")]
    assert [c.tc_id for c in combinado.casos] == ["Clock_00001", "Clock_00046", "Clock_00050"]


def test_criacao_pelo_admin_aparece_com_o_responsavel_e_o_admin_como_autor():
    resposta = _resposta(
        [_registro(CLOCK_1, datetime(2026, 12, 28, 13, tzinfo=UTC), autor="Administradora")]
    )

    (card,) = resposta.cards
    assert (card.responsavel_nome, card.alteracoes[0].usuario_nome) == ("Ana", "Administradora")
    assert [p.nome for p in resposta.pessoas] == ["Ana"]


def test_falha_filtro_sem_correspondencia_e_registro_so_com_campo_oculto_nao_geram_card():
    dia = datetime(2026, 12, 28, 13, tzinfo=UTC)
    oculto = _registro(CLOCK_1, dia, campo="updated_at", antes="x", depois="y")

    assert _resposta([oculto]).cards == []
    assert _resposta([_registro(CLOCK_1, dia)], responsavel_ids={uuid4()}).cards == []
