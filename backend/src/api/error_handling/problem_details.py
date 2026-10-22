from pydantic import BaseModel


class ProblemDetailsError(BaseModel):
    campo: str
    mensagem: str


class ProblemDetails(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    errors: list[ProblemDetailsError] | None = None
