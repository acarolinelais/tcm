from urllib.parse import urlsplit
from uuid import UUID

from src.domain.common.entidade_tenant import EntidadeTenant


class LinkPullRequest(EntidadeTenant):
    """Link de PR de um Test Case (spec 030). Não é editável: remove e adiciona de novo."""

    URL_MAX_LENGTH = 2000
    DOMINIO = "github.sec.samsung.net"

    def __init__(
        self,
        unidade_id: UUID,
        caso_teste_id: UUID,
        url: str,
        created_by: UUID,
        *,
        validar_url: bool = True,
    ) -> None:
        super().__init__(unidade_id)
        self.caso_teste_id = caso_teste_id
        # Na reidratação a URL não é revalidada: uma regra nova não esconde o histórico gravado.
        self.url = self.normalizar_url(url) if validar_url else url
        self.created_by = created_by

    @classmethod
    def normalizar_url(cls, url: str) -> str:
        """Tira os espaços das pontas e valida a URL (RN-02); devolve o texto sem outra mudança."""
        normalizada = url.strip()
        if not normalizada:
            raise ValueError("O link do PR é obrigatório.")
        if len(normalizada) > cls.URL_MAX_LENGTH:
            raise ValueError(f"O link do PR deve ter no máximo {cls.URL_MAX_LENGTH} caracteres.")
        try:
            partes = urlsplit(normalizada)
        except ValueError as erro:
            raise ValueError("Informe um link https válido.") from erro
        if any(c.isspace() for c in normalizada) or partes.scheme != "https" or not partes.netloc:
            raise ValueError("Informe um link https válido.")
        # O endereço inteiro tem de ser o domínio: recusa porta, usuário/senha e subdomínio.
        if partes.netloc.lower() != cls.DOMINIO:
            raise ValueError(f"Só são aceitos links do {cls.DOMINIO}.")
        return normalizada
