from typing import Protocol

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.setor import Setor


class SetorRepository(RepositoryBase[Setor], Protocol):
    pass
