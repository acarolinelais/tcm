# 014. Catálogo de modelos de dispositivo: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0012, 0013, 0015, 0017, 0018, 0022, 0026, 0030, 0031, 0034
- **ADRs novos propostos:** nenhum

## Abordagem

Evolui o `ModeloDispositivo` que já existe (spec 011) em vez de criar outra entidade. A entidade ganha
`descricao`. A resposta da API passa a expor `created_at` e `updated_at`, e o `updated_at` passa a ser
preenchido já na criação. A gestão do catálogo deixa de usar `projetos.gerenciar` e passa a exigir uma
permissão nova, `modelos_dispositivo.gerenciar`, concedida por padrão só ao perfil `KP`. O admin já tem
todas as permissões por `UsuarioAutenticado.pode` (ADR 0018). O seletor de modelos dos projetos ganha
uma rota própria, `/opcoes`, que devolve só os modelos ativos e aceita `projetos.gerenciar`. Assim o
gerente continua associando modelos a projetos sem acessar o catálogo. No frontend, a tela sai do módulo
`projetos` e vira o módulo `modelos-dispositivo`, com item no grupo Administration do sidebar e tabela no padrão
universal.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `ModeloDispositivo` | `id` | UUID | Já existe |
| | `unidade_id` | UUID FK `unidades` | Já existe; filtro de tenant (ADR 0013) |
| | `nome` | `varchar(100)` | Já existe; obrigatório, `strip`, único por unidade (`uq_modelos_dispositivo_unidade_nome`) |
| | `descricao` | `varchar(100)` nullable | **Novo**; `strip`, e texto vazio vira `NULL` |
| | `ativo` | bool | Já existe; default `true` |
| | `created_at` | timestamptz | Já existe |
| | `updated_at` | timestamptz | Passa a ter `server_default=now()`. A migration preenche os nulos com `created_at` |
| `permissoes` | linha `modelos_dispositivo.gerenciar` | seed | **Nova**; vinculada ao perfil `KP` em `perfil_permissoes` |

Migration nova, com `down_revision = "f1a2b3c4d5e6"`. Ela:

1. adiciona a coluna `descricao`;
2. preenche os `updated_at` nulos com `created_at` e define o `server_default`;
3. insere a permissão e a vincula aos perfis com código `KP`;
4. incrementa `auth_version` dos usuários desses perfis, seguindo o padrão da migration `2c3d4e5f6071`.

O downgrade desfaz as quatro etapas. O catálogo `MODULOS_PERMISSOES` ganha o módulo
`modelos_dispositivo` ("Modelos de dispositivo", ordem 8, com a ação `gerenciar`). Com isso, a
permissão aparece na tela de perfis.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/modelos-dispositivo` | `page`, `page_size` (≤100, padrão 20), `ativo?`, `busca?` (nome) | 200 `PagedResult<ModeloDispositivoResponse>` | 401, 403 sem `modelos_dispositivo.gerenciar` |
| GET | `/api/modelos-dispositivo/opcoes` | `page`, `page_size` (≤100), `busca?` | 200 `PagedResult<ModeloDispositivoOpcaoResponse>`, só ativos | 401, 403 sem `projetos.gerenciar` nem `modelos_dispositivo.gerenciar` |
| POST | `/api/modelos-dispositivo` | `{ nome, descricao? }` | 201 + `Location` | 401, 403, 409 nome duplicado, 422 |
| PUT, PATCH | `/api/modelos-dispositivo/{id}` | `{ nome?, descricao?, ativo? }` (ao menos um) | 200 `ModeloDispositivoResponse` | 401, 403, 404 inexistente ou de outra unidade, 409, 422 |
| PATCH | `/api/modelos-dispositivo/{id}/ativar` e `/inativar` | — | 200 | 401, 403, 404 |

- `ModeloDispositivoResponse`: `{ id, unidade_id, nome, descricao, ativo, created_at, updated_at }`.
- `ModeloDispositivoOpcaoResponse`: `{ id, nome }`.
- No PUT/PATCH, `descricao: null` ou `""` limpa a descrição. Se a chave não vier, nada muda. Para
  distinguir os dois casos, o schema usa `model_fields_set`.
- O 403 vem antes do 404 e do 409, para não revelar se um modelo existe a quem não tem permissão.
- Sem DELETE, porque a exclusão é lógica (ADR 0004 e ADR 0008).
- Os vínculos com projetos (`listar_por_ids`, só ativos) e o Form Factor não mudam.

## Backend: arquivos

Seguindo a skill `python-crud`:

- `src/domain/entities/modelo_dispositivo.py`: `DESCRICAO_MAX_LENGTH = 100`, campo `descricao` e
  `atualizar_descricao()` com normalização.
- `src/domain/entities/interfaces/modelo_dispositivo_repository.py`: sem mudança de assinatura. O filtro
  `ativo=True` do `/opcoes` usa o `listar_paginado` que já existe.
- `src/application/schemas/modelo_dispositivo.py`: `descricao` em `Criar`/`Atualizar`, as datas no
  `Response`, o novo `ModeloDispositivoOpcaoResponse` e o `to_opcao_response`.
- `src/application/services/interfaces/modelo_dispositivo_service.py` e
  `src/application/services/modelo_dispositivo_service.py`:
  - `listar`, `criar` e `atualizar` passam a exigir `modelos_dispositivo.gerenciar`;
  - novo `listar_opcoes`, que aceita `projetos.gerenciar` ou `modelos_dispositivo.gerenciar` e força
    `ativo=True`.
- `src/application/catalogos/permissoes.py`: novo módulo `modelos_dispositivo`.
- `src/api/routers/modelos_dispositivo.py`: rota `GET /opcoes`.
- `src/infrastructure/data/models/modelo_dispositivo_model.py`: coluna `descricao` e `server_default`
  em `updated_at`.
- `src/infrastructure/repositories/modelo_dispositivo_repository.py`: `descricao` em `_to_entity` e em
  `_to_model`.
- `src/infrastructure/data/migrations/versions/<rev>_catalogo_modelos_dispositivo_kp.py`: a migration
  descrita acima.
- Testes, ajustando os que já existem:
  - `tests/unit/domain/test_modelo_dispositivo.py`
  - `tests/unit/application/services/test_modelo_dispositivo_service.py`
  - `tests/integration/test_modelo_dispositivo_repository.py`
  - `tests/functional/test_modelos_dispositivo_api.py`
  - os testes de perfis/catálogo de permissões que contam os módulos.

## Frontend: arquivos

Seguindo as skills `react-crud` e `table-rules`:

- **Novo** `src/modules/modelos-dispositivo/`:
  - `api/modelos-dispositivo.api.ts`: `listar`, `listarOpcoes`, `criar`, `atualizar` e `definirAtivo`,
    com o branch de mock (ADR 0030);
  - `hooks/useModelosDispositivo.ts`;
  - `schemas/modelo-dispositivo.schema.ts`: zod, com nome de 1 a 100 e descrição de até 100 caracteres;
  - `ModelosDispositivoPage.tsx`: `TableLayout` com as colunas Nome, Descrição, Status, Criado em,
    Atualizado em e Ações. Paginação de 20, filtros de nome e status, estados de carregamento, vazio e
    erro, e drawer de criação/edição com react-hook-form;
  - `routes.tsx`, com a rota `/admin/modelos-dispositivo`, junto das demais telas de Administration;
  - `ModelosDispositivoPage.test.tsx`.
- **Remover** `src/modules/projetos/ModelosDispositivoPage.tsx` e o teste dele. Tirar a rota de
  `projetos/routes.tsx`, o `modelosDispositivoApi` e os hooks de modelos de `projetos`. O botão
  "Modelos" sai de `ProjetosPage.tsx`.
- `src/modules/projetos/ProjetosPage.tsx` e os fluxos de importação: o seletor passa a usar
  `listarOpcoes` do novo módulo. Um módulo pode importar a API pública de outro, conforme a skill
  `react-crud`. Se ela proibir, a chamada vai para `shared/`.
- `src/core/layout/Sidebar.tsx` e `sidebar-icons.tsx`: o item **Device models** com `DeviceIcon`
  (smartphone, no traço dos ícones atuais), dentro do grupo Administration, visível com
  `modelos_dispositivo.gerenciar` ou para admin. O grupo aparece sempre que tiver ao menos um item.
- `src/core/layout/voltar.ts` e o teste dele: a tela deixa de ser filha de `/projetos`.
- `src/app` (registro de rotas do módulo novo) e `src/core/i18n/resources.ts`: chaves em en, pt e ko
  para descrição, datas, filtros e item do sidebar.
- `src/core/mock/database.ts` e o teste dele: `descricao` e as datas no mock, além do `listarOpcoes`.
- `e2e/modelos-dispositivo.spec.ts`: KP cria, edita e inativa um modelo; gerente não vê o item.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + funcional + e2e | `test_criar_modelo_com_descricao_normaliza_texto`, `test_kp_cria_modelo_com_descricao_e_datas`, e2e "KP cria, edita e inativa um modelo…" |
| CA-02 | Unidade + funcional | `test_criar_modelo_sem_descricao_fica_nula`, `test_kp_cria_modelo_so_com_nome` |
| CA-03 | Integração + funcional | `test_descricao_persiste_e_edicao_preserva_created_at`, `test_put_altera_nome_e_descricao` |
| CA-04 | Integração + funcional + e2e | `test_vinculo_modelo_do_projeto_persiste_e_lista_no_tenant` (vínculo segue após inativar), `test_kp_inativa_e_reativa_modelo[inativar]`, e2e (some do seletor) |
| CA-05 | Funcional + unidade | `test_kp_inativa_e_reativa_modelo[ativar]`, `test_gerente_lista_somente_opcoes_ativas` |
| CA-06 | Unidade + funcional | `test_admin_gerencia_modelo_sem_permissao_explicita`, `test_admin_gerencia_modelo` |
| CA-07 | Funcional (falha) | `test_nome_duplicado_com_espacos_retorna_409[post/put]`, `test_renomear_para_nome_duplicado_falha_sem_commit` |
| CA-08 | Unidade + funcional + Vitest (falha) | `test_criar_modelo_com_nome_invalido_levanta_erro`, `test_descricao_acima_do_limite_levanta_erro`, `test_campos_invalidos_retornam_422`, `modelo-dispositivo.test.ts` |
| CA-09 | Unidade + funcional (falha) | `test_gerente_e_dev_nao_acessam_catalogo`, `test_gerente_e_dev_recebem_403_no_catalogo` |
| CA-10 | Integração + funcional (falha) | `test_obter_modelo_de_outra_unidade_retorna_none`, `test_modelo_de_outra_unidade_retorna_404` |
| CA-11 | Funcional + Vitest | `test_gerente_lista_opcoes_ativas`, `ProjetosPage.test.tsx` ("cria projeto manual…") |
| CA-12 | Vitest + e2e | `Sidebar.test.tsx` ("mostra Device models para KP e admin…"), `ModelosDispositivoPage.test.tsx` ("nega acesso ao gerente…"), e2e "gerente não vê Device models…" |
| CA-13 | Vitest | `ModelosDispositivoPage.test.tsx` ("lista os modelos… 20 por página", "filtra por status… e limpa o filtro") |
| CA-14 | Integração | `test_migration_preserva_modelos_e_concede_gestao_somente_ao_kp` |

## Riscos e decisões pendentes

- **"Só KP" vira um padrão, não uma trava.** Pelo ADR 0031, o admin edita as permissões dos perfis
  seedados. Ele poderia dar `modelos_dispositivo.gerenciar` ao gerente pela tela de perfis. O plan
  segue o modelo de permissões que já existe e não trava a permissão no código. Se a regra tiver que
  ser fixa, isso exige um ADR novo.
- **O gerente perde a gestão na migração.** Ele continua com `projetos.gerenciar`, mas deixa de criar e
  editar modelos. Isso é intencional (spec, RN-06).
- O `/opcoes` é paginado com até 100 itens, como o seletor já usa hoje. Uma unidade com mais de 100
  modelos ativos exigiria busca no seletor. Isso fica no backlog.
