from pydantic import BaseModel


class ProblemDetailsError(BaseModel):
    campo: str
    mensagem: str
    # Membros de extensão; omitidos quando ausentes.
    codigo: str | None = None
    linha: int | None = None
    coluna: str | None = None
    valor: str | None = None
    parametros: dict[str, object] | None = None


class ProblemDetails(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    errors: list[ProblemDetailsError] | None = None
    total_linhas: int | None = None
