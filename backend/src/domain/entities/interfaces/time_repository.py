from typing import Protocol

from src.domain.entities.interfaces.repository_base import RepositoryBase
from src.domain.entities.time import Time


class TimeRepository(RepositoryBase[Time], Protocol):
    pass
