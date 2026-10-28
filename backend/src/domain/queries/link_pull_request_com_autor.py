from dataclasses import dataclass

from src.domain.entities.link_pull_request import LinkPullRequest


@dataclass(frozen=True)
class LinkPullRequestComAutor:
    link: LinkPullRequest
    autor_nome: str
