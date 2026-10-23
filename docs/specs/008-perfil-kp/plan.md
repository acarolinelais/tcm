# 008. Perfil de conta KP: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0005, 0006, 0009, 0015, 0018, 0020, 0021, 0026, 0031
- **ADRs novos propostos:** nenhum

## Abordagem

Provisionar um perfil de sistema por unidade com código estável `KP`, com permissões ajustáveis por
administrador autorizado conforme ADR 0031, e atribuível pelo administrador na unidade ou pelo gerente para contas sob sua responsabilidade. Nesta entrega, o perfil herda as
permissões de `USUARIO_PADRAO`; permissões de atividades e tarefas serão adicionadas nas specs
desses módulos, quando os recursos e códigos de autorização forem definidos. Até lá, a existência do
perfil não libera operações de tarefa que não estejam implementadas. A autorização futura combinará as permissões da conta com a participação ativa no time alvo. Uma conta
com perfil KP exerce essa capacidade em todos os times de que é membro; o vínculo limita o escopo sem
manter uma segunda role KP/DEV. Mudanças de perfil continuam invalidando sessões via `auth_version`;
participações são consultadas no backend, sem confiar em seleção de time enviada pelo frontend.

O gerente pode escolher `KP` ou `USUARIO_PADRAO` ao criar contas e fazer essa troca nas contas sob sua
responsabilidade; outros perfis continuam indisponíveis para ele.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `Perfil` | `codigo=KP` | string estável | Um modelo de perfil de sistema por unidade, reutilizável por várias contas; identidade protegida e permissões ajustáveis por administrador |
| `PerfilPermissao` | permissões de `USUARIO_PADRAO` | associação existente | Herda permissões padrão nesta entrega; permissões de tarefas são acrescentadas pelas specs dos módulos |
| `Usuario` | `perfil_id` | UUID existente | Admin pode atribuir perfil na unidade; gerente pode atribuir KP/padrão sob responsabilidade; mudança incrementa `auth_version` |
| `TimeMembro` | `time_id`, `usuario_id`, `ativo` | associação existente | A participação ativa limita o escopo; não armazena papel KP/DEV |

As migrations criam KP por unidade e removem o papel legado da associação de time. Contas padrão que
tinham participação KP legada são migradas para o perfil KP, incrementando `auth_version`. A aplicação
ainda não cria unidades em runtime; seed para unidades futuras será definido na spec desse fluxo.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/perfis` | — | Admin/gestor de perfis recebe catálogo da unidade; gerente recebe apenas KP e padrão | 401, 403 |
| POST | `/api/usuarios` | `{ nome, email, perfil_id? }` | Admin escolhe perfil da unidade; gerente escolhe somente KP ou padrão | 401, 403, 404, 409, 422 |
| PATCH | `/api/perfis/usuarios/{usuario_id}` | `{ perfil_id }` | Admin altera perfil na unidade; gerente altera KP/padrão apenas de usuário sob sua responsabilidade | 401, 403, 404, 409 |
| PUT | `/api/perfis/{id}/permissoes` | `{ permissoes }` | Qualquer perfil da unidade atualizado por pessoa com `perfis.gerenciar`; invalida sessões das contas associadas | 401, 403, 404 |

`GET /api/usuarios` inclui o nome e o código do perfil nas linhas já autorizadas para consulta. Para
gerentes, esses dados vêm somente dos usuários no escopo retornado pela listagem; o catálogo de perfis
e permissões continua limitado conforme a regra de atribuição.

A API de membros de times recebe e retorna somente a associação da pessoa; não aceita nem retorna um
papel no time. A remoção de membros continua na rota existente. Os endpoints de tarefas e sua matriz
de permissões pertencem às specs desses módulos.

## Backend: arquivos e responsabilidades

- `backend/src/infrastructure/data/migrations/versions/` — migration idempotente de seed KP para
  cada unidade, com downgrade seguro e remoção do campo legado `papel` de `time_membros`.
- Provisionamento de unidades futuras — não existe nesta versão e será definido na spec que introduzir
  criação de unidades em runtime.
- `backend/src/application/services/usuario_service.py` e
  `backend/src/infrastructure/repositories/usuario_repository.py` — permitir ao gerente escolher KP
  ou padrão ao criar uma conta sob sua responsabilidade e incluir metadados mínimos do perfil nas
  linhas autorizadas da listagem de usuários.
- `backend/src/api/routers/perfis.py` — permitir atribuição por admin em toda unidade e por gerente
  apenas aos seus usuários responsáveis, limitado a KP/padrão; manter isolamento e invalidar sessões.
- `backend/src/application/catalogos/permissoes.py` — nenhuma permissão provisória de tarefas nesta
  entrega; cada spec de módulo adiciona seus códigos e metadados.
- Testes unitários, funcionais e de migration — seed repetido, atribuição permitida/negada, proteção,
  tenant, auth_version e migração de membros KP legados para o perfil da conta.

## Frontend: arquivos e responsabilidades

- `frontend/src/modules/usuarios/components/UsuarioForm.tsx` e
  `frontend/src/modules/usuarios/pages/UsuariosPage.tsx` — exibir KP para admin e gerente; no fluxo
  do gerente, limitar opções a KP e usuário padrão, mostrar o perfil atual como leitura e manter o
  acesso restrito aos responsáveis.
- `frontend/src/modules/usuarios/api/` e hooks existentes — enviar `perfil_id` na edição e
  invalidar listagem/detalhe após salvar.
- `frontend/src/modules/perfis/PerfisPage.tsx` — permitir que a administração ajuste permissões dos
  perfis seedados sem liberar alteração de código, nome ou descrição.
- Catálogos i18n `en`, `pt`, `ko` — traduzir nome de exibição do perfil sem alterar o código
  persistido `KP`.
- Testes de componente — admin seleciona perfis permitidos; gerente seleciona apenas KP/padrão em
  cadastro e edição de conta responsável; administrador ajusta permissões de KP sem mudar sua
  identidade de sistema.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01, CA-03 | Migração/integração | Migration cria um perfil KP reutilizável por unidade, sem duplicação |
| CA-01, CA-02, CA-10 | API/serviço | Admin atribui KP na unidade; gerente atribui KP/padrão apenas em contas sob sua responsabilidade |
| CA-03 | API/componente | Administração ajusta permissões de KP; identidade do perfil segue protegida |
| CA-04, CA-05, CA-06 | Integração futura | As specs dos módulos de atividades/tarefas aplicam as permissões do perfil KP somente nos times com participação ativa |
| CA-06, CA-09 | Unitário/funcional | Remover participação revoga acesso ao time e a listagem KP mostra apenas times com participação ativa |
| CA-08 | Componente/i18n | Nome de exibição aparece em inglês, português e coreano; código permanece KP |
| CA-04 | Integração | Várias contas com perfil KP podem participar do mesmo time e exercer as permissões de KP |

## Dependências e decisões

- Atividades/tarefas ainda não têm catálogo de permissões e endpoints. Esta entrega não cria códigos
  provisórios nem concede ações inexistentes. As specs desses módulos devem adicionar permissões ao
  perfil KP e validar que o vínculo KP ativo no time alvo é obrigatório.
- O perfil KP herda a base de `USUARIO_PADRAO`; não deve receber permissões administrativas
  existentes por conveniência. A atribuição deve ser autorizada no backend por perfil e escopo.
- A edição já atribui perfil pela rota `PATCH /api/perfis/usuarios/{usuario_id}`; o fluxo deve
  continuar respeitando escopo da unidade e invalidando sessões anteriores.
- Perfil KP não concede acesso aos times por si só. Listagem, consulta e operações continuam limitadas
  pelas permissões e associações de time efetivas.
- A unidade só é criada pelas migrations atuais; a criação de unidade em runtime e seu seed ficam para
  uma spec futura.
