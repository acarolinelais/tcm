class NotFoundException(Exception):
    """Levantada quando uma entidade solicitada não existe."""


class ConflictException(Exception):
    """Levantada quando uma operação viola uma regra de unicidade ou de estado."""


class ForbiddenException(Exception):
    """Levantada quando a pessoa autenticada não tem permissão para a ação."""


class CredenciaisInvalidasException(Exception):
    """Levantada quando o login falha ou o token de acesso é ausente, inválido ou expirado."""
