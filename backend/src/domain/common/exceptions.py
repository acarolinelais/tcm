class NotFoundException(Exception):
    """Levantada quando uma entidade solicitada não existe."""


class ConflictException(Exception):
    """Levantada quando uma operação viola uma regra de unicidade ou de estado."""

    def __init__(
        self,
        mensagem: str,
        campo: str | None = None,
        codigo: str | None = None,
        parametros: dict[str, object] | None = None,
    ) -> None:
        super().__init__(mensagem)
        # Campo do request que causou o conflito, para a tela mostrar o erro nele.
        self.campo = campo
        self.codigo = codigo
        self.parametros = parametros


class ForbiddenException(Exception):
    """Levantada quando a pessoa autenticada não tem permissão para a ação."""


class InvalidInputException(ValueError):
    """Levantada quando uma entrada é sintaticamente válida, mas viola uma regra de formato."""


class ServiceUnavailableException(Exception):
    """Levantada quando uma configuração impede temporariamente uma operação."""


class CredenciaisInvalidasException(Exception):
    """Levantada quando o login falha ou o token de acesso é ausente, inválido ou expirado."""
