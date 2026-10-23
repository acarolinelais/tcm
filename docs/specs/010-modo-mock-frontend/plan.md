# 010. Modo mock do frontend: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0030
- **ADRs novos propostos:** nenhum (ADR 0030 registra a decisão)

## Abordagem
Manter implementações mock próximas ao núcleo do frontend e selecionar entre mock e HTTP nas funções de API
dos módulos existentes. Persistir uma base relacional pequena em `localStorage`, inicializada com unidade,
usuários, perfis, permissões, setores, gerentes, times e membros. Completar a autenticação de demonstração e
manter o Overview com sua resposta estática existente. Documentar configuração, contas de demonstração e
reset do armazenamento local.

## Modelo de dados
| Entidade | Representação | Regras |
|---|---|---|
| Unidade | Objeto `unidade` | Uma unidade Manaus usada pelos dados seed |
| Usuário | `usuarios[]` | Associação com perfil e responsável opcional |
| Perfil | `perfis[]` | Código de sistema ou perfil personalizado e códigos de permissão |
| Permissão | `permissoes[]` | Código agrupado por módulo |
| Setor e gerente | `setores[]`, `gerentesSetor[]` | Associação com estado ativo |
| Time e membro | `times[]`, `membrosTime[]` | Associação com setor, usuário e estado ativo |
| Preferências e sessão | `idiomaPorUsuario`, tokens da sessão | Mantidos no armazenamento local/de sessão do navegador |

## Contrato da API
Sem alteração no contrato HTTP. Os mocks implementam os mesmos tipos de resposta usados pelo frontend.

## Frontend: arquivos
- `frontend/src/core/mock/database.ts` — base inicial, persistência e operações mock.
- `frontend/src/core/auth/` e `frontend/src/modules/*/api/` — seleção mock/HTTP.
- `.env.example`, READMEs e ADR 0030 — configuração e documentação.

## Critérios de aceite → verificações
| CA | Nível | Verificação |
|---|---|---|
| CA-01–CA-04 | Build | `cd frontend && npm run build` verifica compilação; operações usam armazenamento local e configuração por ambiente |

## Riscos e decisões pendentes
- Os mocks não substituem validações e testes de integração do backend.
- O seed é local ao navegador; apagar `sdf.mock.database.v1` restaura o estado inicial.
