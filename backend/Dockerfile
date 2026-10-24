# Imagem da API (ADR 0034). Build: docker build -t tcm-backend backend
ARG PYTHON_IMAGE=python:3.13.17-slim-trixie

FROM ghcr.io/astral-sh/uv:0.13.5 AS uv

# Mesma imagem nos dois estágios: o venv aponta para o Python da imagem.
FROM ${PYTHON_IMAGE} AS build
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# Dependências primeiro: a camada só é refeita quando o lock muda.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-project

FROM ${PYTHON_IMAGE}
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
RUN useradd --system --uid 10001 --no-create-home app
COPY --from=build /app/.venv /app/.venv
COPY alembic.ini ./
COPY src ./src
USER app
EXPOSE 8000
# Sem curl na imagem: o healthcheck usa o próprio Python.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"]
# Uma instância só: as migrations rodam no startup (ADR 0012).
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
