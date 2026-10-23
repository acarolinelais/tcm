# 004. Listagem filtrável de usuários: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0004, 0006, 0008, 0009, 0013, 0017, 0018, 0022
- **ADRs novos propostos:** nenhum

## Abordagem

Adicionar filtros opcionais ao endpoint paginado de usuários e aplicá-los no repositório junto com as
condições de unidade e visibilidade por time. Nome e e-mail usam busca parcial sem distinção de caixa;
status e perfil usam igualdade. Todo usuário possui perfil, então não há filtro de usuários sem
perfil. O frontend envia os filtros selecionados como query params e reinicia a página quando um filtro muda. Os componentes
compartilhados de tabela fornecem o estilo dos cabeçalhos e das linhas, o menu de filtro e a navegação
de página, mantendo a rolagem no contêiner da tabela.

## Modelo de dados

`perfil_id` é obrigatório. A migração cria perfis de sistema por unidade, atribui perfil a todas as
contas existentes e remove o estado legado `admin_unidade`.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/usuarios` | Query: `page` (>=1), `page_size` (1–100), `nome`, `email`, `ativo`, `perfil_id` | `PagedResult<UsuarioResponse>` filtrado dentro do escopo autorizado | 401 não autenticado; 422 para parâmetros inválidos |

Os filtros são opcionais e combináveis. `nome` e `email` são buscas parciais. `ativo` aceita booleano.
`perfil_id` aceita UUID. A listagem sempre retorna usuários com perfil associado.

## Backend: arquivos

- `backend/src/api/routers/usuarios.py` — expõe e valida os query params.
- `backend/src/application/services/interfaces/usuario_service.py` e
  `backend/src/application/services/usuario_service.py` — propaga filtros sem alterar o fluxo sem
  filtros.
- `backend/src/domain/entities/interfaces/usuario_repository.py` e
  `backend/src/infrastructure/repositories/usuario_repository.py` — compõe filtros com unidade,
  escopo visível, contagem e paginação.

## Frontend: arquivos

- `frontend/src/shared/ui/table.tsx` — padrões compartilhados de tabela e paginação.
- `frontend/src/shared/ui/table-column-filter.tsx` — dropdown acessível para filtros por coluna.
- `frontend/src/modules/usuarios/api/usuario.api.ts` e `hooks/useUsuarios.ts` — envia filtros e os
  inclui na chave de cache.
- `frontend/src/modules/usuarios/pages/UsuariosPage.tsx` e
  `components/UsuariosTable.tsx` — estado dos filtros, seleção de perfil/status e colunas filtráveis.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-02 | Repositório/integração | Buscar usuário por trecho de nome e e-mail sem distinção de caixa |
| CA-03, CA-04 | Repositório/integração | Combinar filtros e verificar contagem e itens paginados |
| CA-05 | Integração | Confirmar que filtros não revelam usuários fora do escopo |
| CA-07 | Funcional | Enviar UUID, página e tamanho inválidos e validar 422 |
| CA-08, CA-09 | Componente | Verificar filtros de cabeçalho, reset de página e controles de paginação |

## Riscos e decisões pendentes

- A resposta de perfil continua sujeita às permissões existentes; a UI só apresenta filtro de perfil a
  quem pode consultar perfis.
- A busca parcial depende do suporte `ILIKE` do banco PostgreSQL, já adotado pelo projeto.
