from collections.abc import Callable, Sequence
from dataclasses import dataclass
from math import ceil


@dataclass(frozen=True)
class PagedResult[T]:
    items: Sequence[T]
    page: int
    page_size: int
    total_count: int

    @property
    def total_pages(self) -> int:
        return 0 if self.page_size == 0 else ceil(self.total_count / self.page_size)

    def map[R](self, fn: Callable[[T], R]) -> "PagedResult[R]":
        return PagedResult([fn(x) for x in self.items], self.page, self.page_size, self.total_count)
