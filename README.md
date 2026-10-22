# sdf-manager

CRUD em **Python (FastAPI) + React**, construído com IA seguindo um fluxo **spec-driven** (SDD).
Documentação em PT-BR. Termos de domínio no código em português; termos técnicos em inglês.

A arquitetura e o fluxo de trabalho vêm de um estudo anterior em .NET + Angular, reaproveitados aqui
e traduzidos de stack. **Feature flags não fazem parte deste projeto.**

## Stack
- **Backend:** FastAPI + SQLAlchemy 2.0 + Alembic + Pydantic v2, em Clean Architecture (ADRs 0003–0008, 0012).
- **Frontend:** React + Vite + TypeScript + shadcn/ui + Tailwind, arquitetura Modular (core/shared/modules),
  TanStack Query, react-hook-form + zod (ADR 0009).
- **Banco:** PostgreSQL via Docker (ADR 0005).

## Como funciona o repositório
1. As decisões técnicas estão em `docs/adr/` e **são lei**.
2. Cada feature nasce de uma spec em `docs/specs/NNN-nome/` (`spec.md` → `plan.md` → `tasks.md`).
3. As skills em `.claude/skills/` são as receitas que a IA segue. Veja o `CLAUDE.md`.

> Esta é a **fundação** do repositório: governança (ADRs, specs, skills) e o esqueleto de pastas.
> O código executável entra pela primeira spec (`001-fundacao`), ainda a escrever.

## Ambiente
- **Pré-requisitos:** Docker (Postgres e testes com Testcontainers), Python 3.13 e Node LTS.
- Subir o banco: `docker compose up -d`.
