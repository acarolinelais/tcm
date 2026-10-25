# 013. Seed organizacional SVP: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: seed organizacional

- [x] **T01. Criar migration da seed de usuários e estrutura SVP**
  - Arquivos: migration Alembic em `backend/src/infrastructure/data/migrations/versions/`
  - Cobre: CA-01–CA-07
  - Verificação: `cd backend && SDF_TEST_DATABASE_URL=... uv run pytest tests/integration/test_seed_svp.py` → schema isolado criado vazio, migrations aplicadas desde o início e contas, senha, perfis, hierarquia, preservação do admin/permissões e conflitos validados.
- [x] **T02. Configurar a senha inicial nos ambientes de CI**
  - Arquivos: `.github/workflows/ci.yml`
  - Cobre: CA-02, CA-07
  - Verificação: `cd backend && uv run alembic upgrade head` no banco vazio com configuração de CI → migrations aplicadas.
