from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.api.error_handling.problem_details import ProblemDetails, ProblemDetailsError
from src.application.validators.importacao_projeto import PlanilhaProjetoInvalida
from src.application.validators.relatorio_sdf import RelatorioSdfInvalido
from src.domain.common.exceptions import (
    ConflictException,
    CredenciaisInvalidasException,
    ForbiddenException,
    InvalidInputException,
    NotFoundException,
    ServiceUnavailableException,
)

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
        title="Dados inválidos.", status=status.HTTP_422_UNPROCESSABLE_CONTENT, errors=errors
    )
    return _response(problem)


async def handle_not_found(request: Request, exc: NotFoundException) -> JSONResponse:
    problem = ProblemDetails(
        title="Recurso não encontrado.", status=status.HTTP_404_NOT_FOUND, detail=str(exc)
    )
    return _response(problem)


async def handle_conflict(request: Request, exc: ConflictException) -> JSONResponse:
    errors = (
        [
            ProblemDetailsError(
                campo=exc.campo, mensagem=str(exc), codigo=exc.codigo, parametros=exc.parametros
            )
        ]
        if exc.campo
        else None
    )
    problem = ProblemDetails(
        title="Conflito.", status=status.HTTP_409_CONFLICT, detail=str(exc), errors=errors
    )
    return _response(problem)


async def handle_forbidden(request: Request, exc: ForbiddenException) -> JSONResponse:
    return _response(ProblemDetails(title="Acesso negado.", status=status.HTTP_403_FORBIDDEN))


async def handle_invalid_input(request: Request, exc: InvalidInputException) -> JSONResponse:
    problem = ProblemDetails(
        title="Dados inválidos.", status=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
    )
    return _response(problem)


async def handle_spreadsheet_validation_error(request: Request, exc: Exception) -> JSONResponse:
    errors = [
        ProblemDetailsError(
            campo=f"linha.{erro.linha}.{erro.campo}" if erro.linha else erro.campo,
            mensagem=erro.mensagem,
            # Só os erros com código (ADR 0033) levam os membros de extensão.
            **(
                {
                    "codigo": erro.codigo,
                    "linha": erro.linha,
                    "coluna": erro.coluna,
                    "valor": erro.valor,
                    "parametros": erro.parametros,
                }
                if erro.codigo
                else {}
            ),
        )
        for erro in exc.erros
    ]
    problem = ProblemDetails(
        title="Planilha inválida.",
        status=status.HTTP_422_UNPROCESSABLE_CONTENT,
        errors=errors,
        total_linhas=getattr(exc, "total_linhas", None),
    )
    return _response(problem)


async def handle_service_unavailable(
    request: Request, exc: ServiceUnavailableException
) -> JSONResponse:
    return _response(
        ProblemDetails(
            title="Serviço temporariamente indisponível.",
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    )


async def handle_invalid_credentials(
    request: Request, exc: CredenciaisInvalidasException
) -> JSONResponse:
    return _response(ProblemDetails(title="Não autenticado.", status=status.HTTP_401_UNAUTHORIZED))


async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    problem = ProblemDetails(title="Erro interno.", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return _response(problem)


def registrar_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(NotFoundException, handle_not_found)
    app.add_exception_handler(ConflictException, handle_conflict)
    app.add_exception_handler(ForbiddenException, handle_forbidden)
    app.add_exception_handler(InvalidInputException, handle_invalid_input)
    app.add_exception_handler(PlanilhaProjetoInvalida, handle_spreadsheet_validation_error)
    app.add_exception_handler(RelatorioSdfInvalido, handle_spreadsheet_validation_error)
    app.add_exception_handler(ServiceUnavailableException, handle_service_unavailable)
    app.add_exception_handler(CredenciaisInvalidasException, handle_invalid_credentials)
    app.add_exception_handler(Exception, handle_unexpected)
