# 002. Multi-tenancy e autenticação: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0010, 0013, 0014, 0015
- **ADRs novos propostos:** nenhum

## Abordagem
Backend em Clean Architecture (ADR 0003): quatro entidades novas (`Unidade`, `Setor`, `Time`,
`TimeMembro`) e extensão da entidade `Usuario` existente (ganha `unidade_id`, `admin_unidade`,
`senha_hash`). Login por e-mail/senha emite um JWT (ADR 0014); uma dependency do FastAPI decodifica o
token e injeta a identidade autenticada em todo endpoint protegido. Autorização (ADR 0015) vive nos
services, nunca no router. O isolamento por tenant (ADR 0013) muda o `RepositoryBase` genérico: toda
leitura por id ou paginada agora exige um `unidade_id`, e isso **também passa a valer pros endpoints de
`Usuario` já existentes** — eles deixam de ser públicos e passam a enxergar só a própria unidade.

**Três decisões de implementação que tomei e quero confirmar com você:**
1. O claim `papel` do JWT (ADR 0014) carrega só se a pessoa é `admin_unidade` (é a única coisa fixa por
   pessoa). Gerente e KP são **por time**, não por pessoa — uma mesma pessoa pode ser gerente de um time
   e dev comum de outro, então não cabem num claim único do token. Toda checagem de gerente/KP é feita
   no banco, a cada ação, nunca lida do token.
2. CA-10 (acessar setor/time de outra unidade) retorna **404**, não 403 — o filtro por `unidade_id` no
   repositório já faz o recurso "não existir" pra quem é de outra unidade; isso evita confirmar que o
   recurso existe em outra unidade.
3. O bootstrap da Unidade Manaus (CA-11) é uma **migration de dados** (Alembic), não um script separado
   — assim continua valendo o ADR 0012 (migrations aplicadas automaticamente no startup): subir a API já
   deixa a unidade e a administradora prontas, sem passo manual.

## Modelo de dados
| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| Unidade | id | UUID | chave primária; **não** tem `unidade_id` (é o tenant) |
| Unidade | nome | string(150) | obrigatório |
| Setor | id, unidade_id | UUID | `unidade_id` obrigatório, FK |
| Setor | nome | string(150) | obrigatório |
| Time | id, unidade_id, setor_id | UUID | FKs obrigatórias |
| Time | nome | string(150) | obrigatório |
| Time | gerente_id | UUID \| null | FK para `Usuario`; define quem é gerente do time |
| TimeMembro | id, unidade_id, time_id, usuario_id | UUID | FKs obrigatórias; único por `(time_id, usuario_id)` |
| TimeMembro | papel | enum(`dev`, `kp`) | padrão `dev` |
| Usuario (extensão) | unidade_id | UUID | **novo**, obrigatório, FK — toda pessoa pertence a 1 unidade |
| Usuario (extensão) | admin_unidade | bool | **novo**, padrão `false` |
| Usuario (extensão) | senha_hash | string \| null | **novo**; hash Argon2, nunca texto puro |

`EntidadeTenant` (nova base em `domain/common/`, estende `EntityBase`) carrega `unidade_id`; `Setor`,
`Time`, `TimeMembro` e `Usuario` passam a estender `EntidadeTenant` em vez de `EntityBase` direto.
`Unidade` continua estendendo `EntityBase` puro.

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/auth/login` | `LoginRequest(email, senha)` | 200 `TokenResponse(access_token, token_type)` | 401 |
| POST | `/api/setores` | `CriarSetorRequest(nome)` | 201 `SetorResponse` | 401, 403, 422 |
| GET | `/api/setores` | — | 200 `PagedResult<SetorResponse>` (só da própria unidade) | 401 |
| POST | `/api/times` | `CriarTimeRequest(nome, setor_id, gerente_id)` | 201 `TimeResponse` | 401, 403, 404 (setor de outra unidade), 422 |
| GET | `/api/times` | `?setor_id=` opcional | 200 `PagedResult<TimeResponse>` | 401 |
| POST | `/api/times/{id}/membros` | `AdicionarMembroRequest(usuario_id, papel="dev")` | 201 `TimeMembroResponse` | 401, 403, 404, 409 (já é membro) |
| PATCH | `/api/times/{id}/membros/{usuario_id}` | `AtualizarPapelMembroRequest(papel)` | 200 `TimeMembroResponse` | 401, 403, 404 |
| GET/POST/PUT | `/api/usuarios...` (já existentes, spec 001) | — | — | **passam a exigir token**; listagem/obtenção filtram pela `unidade_id` de quem está autenticado |

Todo endpoint protegido sem token válido → 401 ProblemDetails (nova exceção `CredenciaisInvalidasException`).
Toda ação sem permissão (não-admin criando setor, gerente mexendo em time que não lidera) → 403
ProblemDetails (nova exceção `ForbiddenException`).

## Backend: arquivos
**Domain:**
- `domain/common/entidade_tenant.py` — `EntidadeTenant(EntityBase)`, carrega `unidade_id`
- `domain/common/papel_time.py` — `PapelTime(StrEnum)`: `DEV`, `KP`
- `domain/common/exceptions.py` — **alterar**: `+ ForbiddenException`, `+ CredenciaisInvalidasException`
- `domain/entities/unidade.py`, `domain/entities/setor.py`, `domain/entities/time.py`,
  `domain/entities/time_membro.py` — novas
- `domain/entities/usuario.py` — **alterar**: estende `EntidadeTenant`; construtor ganha `unidade_id`;
  `admin_unidade: bool`; `senha_hash: str | None`; método `definir_senha_hash(hash: str)`
- `domain/entities/interfaces/repository_base.py` — **alterar**: `obter_por_id` e `listar_paginado`
  passam a exigir `unidade_id: UUID` como primeiro parâmetro
- `domain/entities/interfaces/autenticador.py` — `Autenticador(Protocol)`: `autenticar(email, senha) -> UUID | None`
- `domain/entities/interfaces/{unidade,setor,time,time_membro}_repository.py` — novas interfaces
- `domain/entities/interfaces/usuario_repository.py` — **alterar**: `+ obter_por_email(email) -> Usuario | None`

**Infrastructure:**
- `infrastructure/repositories/repository_base.py` — **alterar**: filtra `obter_por_id`/`listar_paginado`
  por `self.model.unidade_id == unidade_id`
- `infrastructure/data/models/{unidade,setor,time,time_membro}_model.py` — novos
- `infrastructure/data/models/usuario_model.py` — **alterar**: `+ unidade_id`, `+ admin_unidade`, `+ senha_hash`
- `infrastructure/repositories/{unidade,setor,time,time_membro}_repository.py` — novos
- `infrastructure/repositories/usuario_repository.py` — **alterar**: `+ obter_por_email`
- `infrastructure/security/senha_hasher.py` — `hash_senha(senha) -> str`, `verificar_senha(senha, hash) -> bool` (Argon2)
- `infrastructure/security/jwt.py` — `criar_token(usuario) -> str`, `decodificar_token(token) -> TokenPayload`
- `infrastructure/security/autenticador_local.py` — `AutenticadorLocal` implementa `Autenticador`
- `infrastructure/data/migrations/versions/xxxx_multitenancy_auth.py` — schema novo + alteração de `usuarios`
- `infrastructure/data/migrations/versions/xxxx_seed_unidade_manaus.py` — cria Unidade Manaus + admin
  bootstrap (senha vinda de `BOOTSTRAP_ADMIN_SENHA`, hash calculado na própria migration)

**Application:**
- `application/schemas/auth.py` — `LoginRequest`, `TokenResponse`
- `application/schemas/setor.py`, `application/schemas/time.py` — requests/responses
- `application/services/interfaces/auth_service.py` + `application/services/auth_service.py`
- `application/services/interfaces/setor_service.py` + `application/services/setor_service.py`
- `application/services/interfaces/time_service.py` + `application/services/time_service.py`
  (times + membros: adicionar/atualizar papel)
- `application/services/usuario_service.py` — **alterar**: `listar`/`obter` passam a receber `unidade_id`

**API:**
- `api/error_handling/handlers.py` — **alterar**: registra `ForbiddenException` → 403, `CredenciaisInvalidasException` → 401
- `api/dependencies.py` — **alterar**: `+ get_usuario_atual` (decodifica Bearer token via `HTTPBearer(auto_error=False)`),
  `+ get_auth_service`, `+ get_setor_service`, `+ get_time_service`
- `api/routers/auth.py`, `api/routers/setores.py`, `api/routers/times.py` — novos
- `api/routers/usuarios.py` — **alterar**: todas as ações ganham `Depends(get_usuario_atual)`
- `api/main.py` — **alterar**: registra os routers novos

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional | `test_login_credenciais_validas_retorna_token` |
| CA-02 (falha) | Unidade + Funcional | `test_autenticar_senha_incorreta_retorna_none` / `test_login_credenciais_invalidas_retorna_401` |
| CA-03 (falha) | Funcional | `test_endpoint_protegido_sem_token_retorna_401` |
| CA-04 | Funcional | `test_criar_setor_como_admin_retorna_201` |
| CA-05 (falha) | Unidade + Funcional | `test_criar_setor_sem_ser_admin_levanta_forbidden` |
| CA-06 | Funcional | `test_criar_time_como_admin_retorna_201` |
| CA-07 | Funcional | `test_adicionar_membro_como_gerente_ou_admin_retorna_201` |
| CA-08 (falha) | Unidade + Funcional | `test_adicionar_membro_time_que_nao_lidera_levanta_forbidden` |
| CA-09 | Funcional | `test_marcar_membro_como_kp_retorna_200` |
| CA-10 (falha) | Integração + Funcional | `test_obter_setor_de_outra_unidade_retorna_404` |
| CA-11 | Integração | `test_migration_cria_unidade_manaus_com_admin` |

## Riscos e decisões pendentes
- Retrofitar os endpoints de `Usuario` (spec 001) pra exigir token e filtrar por unidade é a mudança
  mais arriscada deste plano — qualquer esquecimento deixa um endpoint velho aberto sem tenant/auth.
  Mitigado pelo filtro estar na classe base do repositório, não em cada service.
- Não há endpoints de atualizar/remover `Setor`/`Time`/`TimeMembro` neste plano — nenhum `CA-xx` pede, e
  adicionar agora seria escopo além do combinado na spec. Fica pro backlog quando houver necessidade real.
- `BOOTSTRAP_ADMIN_SENHA` sem valor no `.env` quebra a migration de seed; documentar isso no `.env.example`
  com um valor de desenvolvimento óbvio (ex.: `"mude-esta-senha"`) e avisar que não serve pra produção.
- Testes de integração/funcionais deste bloco dependem de Postgres real (igual à spec 001) — rodam contra
  o Postgres nativo já disponível nesta máquina (ver backlog da spec 001), não Testcontainers.
