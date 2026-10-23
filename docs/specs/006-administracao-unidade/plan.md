# 006. Administração da unidade: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0017, 0018, 0019, 0020, 0021, 0022
- **ADRs novos propostos:** nenhum

## Abordagem

Adicionar uma associação tenant-scoped muitos-para-muitos entre setores e gerentes, além do perfil
de sistema `GERENTE` em cada unidade. A permissão efetiva vem do perfil e o escopo vem das associações
ativas a setores; o estado atual é resolvido pelo backend em cada requisição, sem usar `Time.gerente_id`
como autorização. O campo permanece como responsável principal/informativo. O admin ganha um grupo
expansível no sidebar, com páginas próprias para usuários, setores e times. Gerente e KP abrem a
mesma página de times, mas recebem resultados e ações limitados aos seus escopos. A interface
reutiliza a tabela, paginação, filtros, diálogos de confirmação e toasts compartilhados já usados na
gestão de usuários.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `SetorGerente` | `id`, `unidade_id`, `setor_id`, `usuario_id`, `ativo`, timestamps | UUID, UUID, UUID, UUID, bool, datetime | Associação por unidade; par setor/usuário único; desassociar/inativar mantém histórico |
| `Perfil` | `codigo=GERENTE` | string estável | Seed por unidade, somente leitura; permissões `times.consultar`, `times.criar`, `times.gerenciar`; atribuível |
| `Setor` | `ativo` | bool existente | Inativação bloqueada se existir time ativo; ao inativar, desativa associações ativas |
| `Time` | `gerente_id` | UUID opcional existente | Responsável principal; não participa do cálculo de autorização |
| `TimeMembro` | `papel` | enum/string existente | `KP` define escopo de KP na página de times; não vira perfil de conta |

`SetorGerente` recebe tabela e modelo ORM próprios. Os repositórios sempre filtram por `unidade_id`,
e services validam que setor e usuário pertencem à mesma unidade, que setor e usuário estão ativos e
que o perfil do usuário é `GERENTE`. A relação é persistida com `ativo`; uma nova associação para o
mesmo par reativa o registro existente, sem duplicá-lo. Reativar o setor não reativa os vínculos.

A migration cria `GERENTE` para cada unidade existente com as três permissões de times. O fluxo de
provisionamento de unidades, quando existir, também deverá criar os três perfis de sistema
(`ADMIN_UNIDADE`, `USUARIO_PADRAO`, `GERENTE`) com as permissões correspondentes. Mudanças de perfil
ou associação gerente-setor incrementam `auth_version` do usuário afetado e invalidam suas sessões,
conforme spec 003/ADR 0020.

## Contrato da API

| Verbo | Rota | Request/query | Sucesso | Erros principais |
|---|---|---|---|---|
| GET | `/api/setores` | `page`, `page_size`, `busca`, `ativo` | Setores paginados da unidade; gerente só recebe setores associados | 401, 403, 422 |
| POST | `/api/setores` | `{ nome }` | 201 `SetorResponse` | 401, 403, 409, 422 |
| PATCH | `/api/setores/{id}` | `{ nome? , ativo? }` | 200 `SetorResponse` | 401, 403, 404, 409, 422 |
| GET | `/api/setores/{id}/gerentes` | — | Associações ativas e inativas do setor | 401, 403, 404 |
| POST | `/api/setores/{id}/gerentes` | `{ usuario_id }` | 201 associação ativa | 401, 403, 404, 409, 422 |
| DELETE | `/api/setores/{id}/gerentes/{usuario_id}` | — | 204, associação inativada | 401, 403, 404 |
| POST | `/api/usuarios` | `{ nome, email, perfil_id? }` | 201; perfil padrão se omitido | 401, 403, 404, 409, 422 |
| GET | `/api/times` | filtros e paginação atuais | Admin: unidade; gerente: setores ativos; KP: vínculos KP; membro: escopo já permitido | 401, 403, 422 |
| GET | `/api/times/usuarios-disponiveis` | — | Usuários ativos da unidade para gestão de membros, apenas admin/gerente | 401, 403 |
| GET | `/api/times/{id}/membros` | — | Membros ativos do time no escopo de admin, gerente associado ou KP | 401, 403, 404 |
| POST | `/api/times` | `{ nome, setor_id }` para gerente; admin também pode informar `gerente_id` de gerente ativo associado ao setor | 201 `TimeResponse` | 401, 403, 404, 422 |
| PATCH | `/api/times/{id}/inativar` | — | Inativa time; somente admin | 401, 403, 404 |
| PATCH | `/api/times/{id}/ativar` | — | Reativa time se setor estiver ativo; somente admin | 401, 403, 404, 409 |
| POST | `/api/times/{id}/membros` | `{ usuario_id, papel }` | 201 vínculo | 401, 403, 404, 409, 422 |
| PATCH | `/api/times/{id}/membros/{usuario_id}` | `{ papel }` | 200 vínculo atualizado | 401, 403, 404, 422 |
| DELETE | `/api/times/{id}/membros/{usuario_id}` | — | 204, vínculo inativado | 401, 403, 404 |

Listagens aceitam somente filtros explícitos, documentados e aplicados junto ao escopo de autorização
(ADR 0017). Filtro nenhum pode ampliar o conjunto visível do usuário. Admin tem acesso total apenas à
própria unidade. Gerentes não conseguem informar outro setor para ampliar seu escopo; KP não consegue
consultar times em que não possui associação KP.

## Backend: arquivos e responsabilidades

- `domain/entities/setor_gerente.py` e interface de repositório correspondente — entidade e contrato
  da associação gerente-setor, sem dependência de ORM.
- `infrastructure/data/models/setor_gerente_model.py`, `models/__init__.py` e nova migration — tabela,
  constraints e seed do perfil `GERENTE` em unidades existentes.
- `repositories/setor_gerente_repository.py` — leitura paginada e escopada por unidade, ativação,
  desativação e busca de setores gerenciados.
- `domain/entities/setor.py`, interfaces, `application/schemas/setor.py`, `setor_service.py` e
  `api/routers/setores.py` — atualizar setor, ativar/inativar, bloquear inativação com times ativos,
  listar filtros e administrar associações de gerentes.
- `application/services/auth_service.py`, `domain/common/usuario_autenticado.py` e dependências —
  carregar escopos atuais de setor e não confiar em claim antiga para autorização.
- `time_service.py`, repositórios e schemas de times — gerir por setor ativo, delimitar consultas de
  gerente/KP; ao admin permitir definir como principal somente gerente ativo associado ao setor; e
  adicionar remoção/inativação de membro.
- `usuario.py`, `usuario_service.py`, schemas e router — aceitar `perfil_id` opcional na criação,
  validar perfil da unidade e impedir atribuição do perfil `ADMIN_UNIDADE` pela criação comum.
- Testes unitários/funcionais — isolamento tenant, perfil seedado, escopo, revogação imediata, setor
  com times ativos, fluxos de usuário e membership.

## Frontend: arquivos e responsabilidades

- `core/layout/Sidebar.tsx` — grupo expansível Administração para admin; link Times para gerente/KP
  somente quando houver escopo ativo e permissões pertinentes.
- `core/router.tsx` e `core/layout/AppLayout.tsx` — rotas/guards de usuário, setor e time; a API
  continua responsável pela autorização final.
- `modules/usuarios/` — incluir seleção de perfil no cadastro e ação separada para associar setores
  ao usuário gerente; reutilizar formulários e padrão de lista existentes.
- `modules/setores/` — módulo novo com tabela padrão, busca/filtros, criar/editar/inativar setor e
  fluxo de associação/desassociação de gerentes.
- `modules/times/` — módulo novo com lista compartilhada e escopo entregue pela API; criação de time,
  seleção do setor autorizável e gestão de membros/papéis para perfis com permissão. A seleção de
  membros usa o endpoint restrito `usuarios-disponiveis`, sem aceitar UUID digitado como fluxo normal.
- `shared/ui/table.tsx`, `confirm-dialog.tsx` e `shared/lib/toast.ts` — reutilizar sem duplicar
  regras de tabela, confirmar inativação/desassociação e apresentar mensagens de sucesso/erro.
- API clients, hooks e modelos em cada módulo — tipos alinhados a `PagedResult`, filtros explícitos e
  mutations invalidando queries pertinentes.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01 a CA-02, CA-20 | API/E2E | Admin vê páginas e grupo; usuário sem admin recebe 403 e não vê o grupo |
| CA-03, CA-04, CA-14 a CA-16 | Funcional/UI | CRUD de setor; bloqueio com time ativo; vínculos desativados e exigência de nova associação após reativação |
| CA-05, CA-18 | Funcional/UI | Perfil `GERENTE` selecionável; usuário comum/inativo não pode ser associado como gerente |
| CA-06 a CA-08, CA-13, CA-19 | Unitário/funcional | Criação e gestão por setor; sem associação, após remoção, ou fora da unidade retorna 403/404 sem vazamento |
| CA-09 | Unitário/funcional | Gerente adiciona/remove membros e altera papel apenas em setor associado; KP somente em seus times |
| CA-10 | Funcional | Mudanças de acesso invalidam sessão conforme mecanismo existente |
| CA-11, CA-17 | API/componente/E2E | Escopos e permissões governam a área Times, menu e ações |
| CA-12 | API/componente | Admin consulta todos os recursos da unidade com paginação |

## Riscos e decisões

- A regra antiga deriva escopo de gerente por `Time.gerente_id`; toda autorização, query de listagem e
  agregação de `times_gerenciados` precisa ser auditada para evitar manter uma autorização paralela.
- Uma associação inativa deve ser reativada ao associar novamente o mesmo usuário ao setor, evitando
  conflito com a chave única e preservando histórico.
- A migration de `GERENTE` deve incluir todas as unidades existentes; qualquer provisionamento futuro
  de unidade deve criar o mesmo perfil para manter comportamento consistente.
- A consulta de KP precisa distinguir `TimeMembro.papel == KP` de DEV, sem mudar o papel de membros
  em outros times do mesmo usuário.
- Inativação do setor com time ativo retorna `409 Conflict`, identificando o motivo sem expor dados
  de outra unidade. A remoção/desassociação não apaga registros históricos.
