FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY alembic.ini ./
COPY src ./src

EXPOSE 8000
CMD [".venv/bin/uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
