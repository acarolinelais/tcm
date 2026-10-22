from src.domain.common.paged_result import PagedResult


def test_total_pages_arredonda_para_cima():
    resultado = PagedResult(items=[1, 2, 3], page=1, page_size=2, total_count=5)

    assert resultado.total_pages == 3


def test_total_pages_com_page_size_zero_retorna_zero():
    resultado = PagedResult(items=[], page=1, page_size=0, total_count=10)

    assert resultado.total_pages == 0


def test_map_transforma_items_mantendo_paginacao():
    resultado = PagedResult(items=[1, 2, 3], page=2, page_size=3, total_count=9)

    mapeado = resultado.map(lambda x: x * 10)

    assert mapeado.items == [10, 20, 30]
    assert mapeado.page == 2
    assert mapeado.page_size == 3
    assert mapeado.total_count == 9
