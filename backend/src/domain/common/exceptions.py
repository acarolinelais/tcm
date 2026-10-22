class NotFoundException(Exception):
    """Levantada quando uma entidade solicitada não existe."""


class ConflictException(Exception):
    """Levantada quando uma operação viola uma regra de unicidade ou de estado."""
