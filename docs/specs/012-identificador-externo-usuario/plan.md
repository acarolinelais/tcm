# 012. Identificador externo de usuário: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0024, 0030, 0033
- **ADRs novos propostos:** nenhum

## Abordagem

Adicionar `user_id` opcional à entidade de usuário, aos contratos de criação/edição/consulta e ao
formulário compartilhado de usuários. O domínio remove espaços externos e converte valores vazios em
nulo, preservando a capitalização informada. A persistência garante unicidade sem diferenciar
maiúsculas e minúsculas dentro da unidade. Na importação de projetos, o índice em memória de
correspondências passa a incluir nome, e-mail e `user_id`; a resolução continua considerando os
usuários da unidade e exige uma única pessoa correspondente que também seja membro ativo do time.
O modo mock deve espelhar persistência, normalização, validação e resolução do backend.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `Usuario` | `user_id` | `str \| None` | Texto livre; opcional; espaços externos removidos; vazio vira nulo; unicidade por unidade sem diferenciar maiúsculas/minúsculas |

A migration adiciona `usuarios.user_id` anulável, sem preencher contas existentes, e um índice único
parcial por `unidade_id` e `lower(user_id)` para valores não nulos. O nome exibido mantém a capitalização
original após a remoção de espaços externos.

## Contrato da API

As rotas existentes de usuários mantêm verbos e caminhos. O campo `user_id` passa a ser aceito no
request de criação e atualização e é incluído nas respostas de usuário. Campo ausente ou nulo limpa o
valor na atualização, seguindo o comportamento de substituição integral do `PUT` existente.

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/usuarios` | `{ nome, email, user_id? }` | 201 com usuário e `Location` | 401, 403, 409 duplicidade na unidade, 422 validação |
| PUT | `/api/usuarios/{id}` | `{ nome, email, user_id? }` | 200 com usuário atualizado | 401, 403, 404, 409 duplicidade na unidade, 422 validação |
| GET | `/api/usuarios`, `/api/usuarios/{id}` e respostas de gestão | — | Resposta inclui `user_id` (nulo quando ausente) | Erros atuais |
| POST | `/api/projetos/importar` | Arquivo atual, com valores de nome, e-mail ou `user_id` em responsável/backup | 201 projeto e resumo dos casos | Erros atuais; ambiguidade e pessoa fora do time como erros estruturados 422 |

## Backend: arquivos

- `backend/src/domain/entities/usuario.py` — constante de tamanho, propriedade `user_id`, normalização e atualização do campo.
- `backend/src/domain/entities/interfaces/usuario_repository.py` — consulta de unicidade por `user_id`, unidade e ID ignorado.
- `backend/src/infrastructure/data/models/usuario_model.py`, migration Alembic e `infrastructure/repositories/usuario_repository.py` — coluna anulável, índice único parcial e mapeamento.
- `backend/src/application/schemas/usuario.py` — campo opcional em criação/edição e campo nullable em resposta.
- `backend/src/application/services/usuario_service.py` — validação de duplicidade no escopo da unidade antes do commit.
- `backend/src/application/services/importacao_projeto_service.py` — inclui identificador no índice de candidatos e mantém a resolução de membro/time e erros estruturados.
- `backend/tests/unit` — entidade, service de usuários e importação; `integration` — unicidade e mapeamento; `functional` — contratos e erros de API.

## Frontend: arquivos

- `frontend/src/modules/usuarios/model/usuario.ts`, `api/usuario.api.ts` e `components/UsuarioForm.tsx` — tipo, validação e campo opcional no formulário compartilhado de criação/edição.
- `frontend/src/modules/usuarios/components/UsuarioForm.test.tsx` e `api/usuario.api.test.ts` — envio, edição, limpeza do campo e tratamento de duplicidade.
- `frontend/src/core/mock/database.ts` — migração dos dados persistidos para usuários sem `userId`, criação/edição e resolução da planilha por nome/e-mail/identificador.
- `frontend/src/core/mock/database.test.ts` e `frontend/src/modules/projetos/utils/planilha-projeto.test.ts` (ou testes equivalentes existentes) — compatibilidade de dados antigos e atribuições por `userId`.
- `frontend/src/core/i18n/resources.ts` — rótulo, ajuda e erro de duplicidade nos idiomas suportados.
- `frontend/e2e/usuarios.spec.ts` e `frontend/e2e/projetos-importacao.spec.ts` — criação/edição e importação com atribuições pelo identificador.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01–CA-03, CA-12 | Unitário + funcional + Vitest | Salvar/retornar o identificador, aceitar nulo, remover espaços externos e validar o limite; UI envia e reabre o valor |
| CA-04–CA-05 | Unitário + integração + funcional | `user_id` repetido na unidade gera conflito; repetido em unidade diferente é permitido |
| CA-06–CA-08 | Unitário + Vitest + e2e | Resolver atribuições por nome, e-mail e `user_id` no backend, mock e importação pelo navegador |
| CA-09–CA-10 | Unitário + funcional | Correspondência ambígua ou pessoa fora do time retorna erro estruturado sem persistência parcial |
| CA-11 | Integração + e2e | Importar arquivo válido com responsável/backup identificados por combinações dos três campos |

## Riscos e decisões pendentes

- Uma planilha pode conter um valor que coincide com o nome de uma pessoa e o `user_id` de outra; pela
  regra aprovada, esse valor deve ser tratado como ambíguo, sem precedência entre campos.
- A constraint de unicidade deve ser criada com índice parcial para permitir múltiplos valores nulos e
  com comparação `lower(user_id)` para respeitar a regra de unicidade sem alterar a forma exibida.
- O `PUT` atualiza o conjunto de campos do usuário; clientes antigos que omitem `user_id` podem limpar
  o valor. A atualização do frontend, API e mocks precisa ser entregue no mesmo ciclo.
- Nenhuma decisão técnica nova exige ADR; o índice funcional e o mapeamento manual seguem os ADRs
  existentes.
