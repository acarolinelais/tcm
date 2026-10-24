import os
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.domain.entities.caso_teste import (
    CasoTeste,
    CategoriaCasoTeste,
    DificuldadeCasoTeste,
)
from src.infrastructure.data.models.perfil_model import PerfilModel
from src.infrastructure.data.models.projeto_model import ProjetoModel
from src.infrastructure.data.models.setor_model import SetorModel
from src.infrastructure.data.models.time_model import TimeModel
from src.infrastructure.data.models.unidade_model import UnidadeModel
from src.infrastructure.data.models.usuario_model import UsuarioModel  # noqa: F401
from src.infrastructure.repositories.caso_teste_repository import CasoTesteRepositoryImpl

pytestmark = pytest.mark.skipif(
    not os.environ.get("SDF_TEST_DATABASE_URL"),
    reason="Defina SDF_TEST_DATABASE_URL para executar a integração com Postgres.",
)


@pytest.mark.asyncio
async def test_caso_persiste_com_responsaveis_e_tc_id_e_unico_no_projeto():
    engine = create_async_engine(os.environ["SDF_TEST_DATABASE_URL"])
    unidade_id, setor_id, time_id, projeto_id, perfil_id = (uuid4() for _ in range(5))
    responsavel_id, backup_id = uuid4(), uuid4()
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(UnidadeModel(id=unidade_id, nome=f"Casos {unidade_id}"))
            await session.flush()
            session.add_all(
                [
                    PerfilModel(
                        id=perfil_id,
                        unidade_id=unidade_id,
                        nome=f"Perfil {perfil_id}",
                    ),
                    SetorModel(id=setor_id, unidade_id=unidade_id, nome="Mobile"),
                ]
            )
            await session.flush()
            session.add(
                TimeModel(
                    id=time_id,
                    unidade_id=unidade_id,
                    setor_id=setor_id,
                    nome="Time Clock",
                )
            )
            await session.flush()
            session.add(
                ProjetoModel(
                    id=projeto_id,
                    unidade_id=unidade_id,
                    time_id=time_id,
                    app="Clock",
                    one_ui="9.5",
                )
            )
            session.add_all(
                [
                    UsuarioModel(
                        id=responsavel_id,
                        unidade_id=unidade_id,
                        nome="Principal",
                        email=f"principal-{responsavel_id}@example.com",
                        perfil_id=perfil_id,
                    ),
                    UsuarioModel(
                        id=backup_id,
                        unidade_id=unidade_id,
                        nome="Backup",
                        email=f"backup-{backup_id}@example.com",
                        perfil_id=perfil_id,
                    ),
                ]
            )
            await session.flush()

            repository = CasoTesteRepositoryImpl(session)
            caso = CasoTeste(
                unidade_id,
                projeto_id,
                "Clock_001",
                CategoriaCasoTeste.A,
                DificuldadeCasoTeste.LOW,
                responsavel_id,
                backup_id,
            )
            await repository.adicionar(caso)
            await session.flush()

            pagina = await repository.listar_por_projeto(unidade_id, projeto_id, 1, 10)
            assert pagina.total_count == 1
            assert pagina.items[0].tc_id == "Clock_001"
            assert pagina.items[0].responsavel_id == responsavel_id
            assert pagina.items[0].backup_id == backup_id
            pagina_filtrada = await repository.listar_por_projeto(
                unidade_id, projeto_id, 1, 10, responsavel_id
            )
            assert pagina_filtrada.total_count == 1
            assert pagina_filtrada.items[0].responsavel_id == responsavel_id
            sem_resultados = await repository.listar_por_projeto(
                unidade_id, projeto_id, 1, 10, uuid4()
            )
            assert sem_resultados.items == []
            assert sem_resultados.total_count == 0
            assert await repository.existe_tc_id(unidade_id, projeto_id, "Clock_001")
            assert not await repository.existe_tc_id(uuid4(), projeto_id, "Clock_001")

            duplicado = CasoTeste(
                unidade_id,
                projeto_id,
                "Clock_001",
                CategoriaCasoTeste.B,
                DificuldadeCasoTeste.MEDIUM,
                responsavel_id,
                backup_id,
            )
            await repository.adicionar(duplicado)
            with pytest.raises(IntegrityError):
                await session.flush()
            await session.rollback()
    finally:
        await engine.dispose()
