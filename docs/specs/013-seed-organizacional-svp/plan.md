# 013. Seed organizacional SVP: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0005, 0012, 0013, 0018, 0023
- **ADRs novos propostos:** nenhum

## Abordagem

Adicionar uma migration Alembic depois do head atual para provisionar as contas e a hierarquia na unidade
Manaus. A migration reutiliza os perfis `GERENTE`, `KP` e `USUARIO_PADRAO` já existentes, sem tocar na
conta admin ou nas associações de permissões dos perfis. Ela lê `SENHA_INICIAL_USUARIOS`, guarda somente
o hash Argon2 e marca a troca obrigatória. O setor-gerente é associado por `setor_gerentes`. O time
existente será movido para SVP sem alterar seu gerente atual; Ivan não será adicionado a `time_membros`.
Contas, setor, time e associações com identidade coincidente são reconciliados, preservando membros não
listados e gerentes atuais do setor.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| Usuario | nome, email, user_id, perfil_id, senha_hash | existente | 12 contas; `GERENTE`, `KP` ou `USUARIO_PADRAO`; senha inicial configurada e hash Argon2 |
| Setor | nome | existente | `SVP` na unidade Manaus |
| SetorGerente | setor_id, usuario_id | existente | associação ativa entre SVP e Ivan |
| Time | nome, setor_id, gerente_id | existente | `SDF Automation` associado ao setor SVP; `gerente_id` existente preservado |
| TimeMembro | time_id, usuario_id | existente | 11 contas, excluindo Ivan |

## Contrato da API

Sem alterações.

## Backend: arquivos

- Nova migration em `backend/src/infrastructure/data/migrations/versions/`.
- Testes de integração em `backend/tests/integration/test_seed_svp.py`.
- Ajuste de ambiente do workflow CI para configurar senha inicial de teste, se necessário.

## Frontend: arquivos

Nenhum.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração | Migration completa desde schema vazio; dados, e-mails, `user_id` e perfis das doze contas |
| CA-02 | Integração | Hash verifica contra a senha inicial; flag de troca obrigatória |
| CA-03 | Integração | Vínculos SVP, Ivan como responsável e onze membros sem Ivan |
| CA-04 | Integração | Snapshot de admin e permissões preservado |
| CA-05 | Integração | Reconciliação da Caroline, setor, time e membro legado |
| CA-06 | Integração | E-mail e `user_id` em contas distintas falham sem escrita |
| CA-07 | Integração | Ausência de senha inicial ou perfil requerido falha claramente |

## Riscos e considerações

- O banco local já tem os registros que serão reconciliados. A migration deve abortar quando e-mail e
  `user_id` apontarem para contas distintas e deve permanecer transacional.
- A aplicação aplica migrations no startup; `SENHA_INICIAL_USUARIOS` também precisa estar configurada no
  CI para que o bootstrap de um banco vazio seja reproduzível.
- Como a migration reconcilia contas e vínculos preexistentes, seu downgrade aborta para evitar apagar ou
  restaurar parcialmente dados de pessoas; eventuais correções devem ser feitas por uma nova migration.
