from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.api.error_handling.problem_details import ProblemDetails, ProblemDetailsError
from src.domain.common.exceptions import ConflictException, NotFoundException

MEDIA_TYPE = "application/problem+json"


def _response(problem: ProblemDetails) -> JSONResponse:
    return JSONResponse(
        status_code=problem.status,
        content=problem.model_dump(exclude_none=True),
        media_type=MEDIA_TYPE,
    )


async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        ProblemDetailsError(campo=".".join(str(p) for p in e["loc"]), mensagem=e["msg"])
        for e in exc.errors()
    ]
    problem = ProblemDetails(
        title="Dados inválidos.", status=status.HTTP_422_UNPROCESSABLE_ENTITY, errors=errors
    )
    return _response(problem)


async def handle_not_found(request: Request, exc: NotFoundException) -> JSONResponse:
    problem = ProblemDetails(
        title="Recurso não encontrado.", status=status.HTTP_404_NOT_FOUND, detail=str(exc)
    )
    return _response(problem)


async def handle_conflict(request: Request, exc: ConflictException) -> JSONResponse:
    problem = ProblemDetails(title="Conflito.", status=status.HTTP_409_CONFLICT, detail=str(exc))
    return _response(problem)


async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    problem = ProblemDetails(title="Erro interno.", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return _response(problem)


def registrar_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(NotFoundException, handle_not_found)
    app.add_exception_handler(ConflictException, handle_conflict)
    app.add_exception_handler(Exception, handle_unexpected)
