# 050. Tela de auditoria: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0017, 0018, 0034, 0037, 0042, 0044
- **ADRs novos propostos:** nenhum. A leitura segue o ADR 0044 (só leitura de `auditoria_alteracoes`), a lista
  segue `PagedResult` e filtros explícitos (ADRs 0004 e 0017), e a tela segue o padrão de tabelas.

## Abordagem

O backend ganha um recurso só de leitura, `GET /api/auditoria`, restrito ao administrador da unidade
(`usuario_atual.eh_administrador`, como em `SetorServiceImpl._exigir_admin`). Ele é paginado e filtrado no
servidor.

O repositório monta uma consulta sobre `auditoria_alteracoes`:
- Calcula, para cada linha, o **caso** a que ela se refere. Em `casos_teste` é o `row_id`; em
  `links_pull_request` é o `caso_teste_id` gravado no JSON.
- Faz join com `casos_teste` e `projetos` para trazer TC ID e nome do projeto.
- Calcula a **ação**:
  - `criacao`: `INSERT` em `casos_teste`;
  - `alteracao`: `UPDATE` em `casos_teste`;
  - `pr_incluido`: `INSERT` em `links_pull_request`;
  - `pr_removido`: `UPDATE` que inativa o link.
- Descarta as linhas que só mudaram colunas técnicas (as mesmas que o histórico da 038 esconde) e as
  atualizações de link que não o inativam. Assim, a tela e o histórico do painel mostram o mesmo conjunto.
- Filtra sempre pela unidade (ADR 0013), pelos filtros da RN-05 e ordena por `created_at DESC, id DESC`.

A transformação de cada linha em alterações legíveis reaproveita a da spec 038. Hoje ela vive em
`application/schemas/historico_caso_teste.py`, e o trecho que transforma um registro em itens é extraído para
uma função, `alteracoes_do_registro`, usada pelos dois. Os ids de responsável e Backup viram nomes por uma
única busca por página (`UsuarioRepository.dados_por_usuarios`).

A tela é um módulo novo no frontend, `modules/auditoria`, em HeroUI (ADR 0037), com `DataTable`, filtros no
cabeçalho, `DataTablePagination` e a exportação da spec 035. O detalhe usa os dados da própria linha, porque a
lista já traz todas as alterações do registro, então não há rota de detalhe. Os rótulos de campo e de valor
(Status, Category…) vão para `shared/lib/auditoria.ts`, porque a seção Histórico da 038 (Fase 4) vai usar os
mesmos.

## Modelo de dados

Nenhuma tabela nova. Leitura de `auditoria_alteracoes` (specs 038 e ADR 0044) com join em `casos_teste` e
`projetos`.

Domain (`domain/queries`):
- `FiltrosAuditoria`: `inicio`, `fim` (datetime UTC), `usuario_ids`, `perfil`, `acao`, `tc_id`,
  `projeto_id`, `origem`, `tela`. Todos são opcionais.
- `LinhaAuditoria`: `id`, `registro: RegistroAuditoria` (o da 038), `acao`, `caso_teste_id`, `tc_id`,
  `projeto_id`, `projeto_nome`, `tela`.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/auditoria` | query: `page`, `page_size`, `data_inicio`, `data_fim` (`AAAA-MM-DD`), `fuso_horario`, `usuario_id` (repetível), `perfil`, `acao`, `tc_id`, `projeto_id`, `origem`, `tela` | 200 `PagedResult[RegistroAuditoriaResponse]` | 401; 403 (não é admin); 422 (`data_fim` antes de `data_inicio`, `acao`/`origem` inválidas, fuso inválido) |

```json
{ "items": [{
    "id": 1284, "alterado_em": "2026-10-30T15:42:00Z",
    "usuario_nome": "Ana Souza", "usuario_perfil": "Key Person",
    "acao": "alteracao", "caso_teste_id": "…", "tc_id": "Clock_001",
    "projeto_id": "…", "projeto_nome": "Clock 9.5",
    "alteracoes": [{ "campo": "status", "valor_anterior": "InProgress", "valor_novo": "InReview" }],
    "origem": "api", "tela": "/projetos/…/kanban" }],
  "total": 1284, "page": 1, "page_size": 20 }
```

- `acao`: `criacao`, `alteracao`, `pr_incluido` ou `pr_removido`.
- `origem`: `api` ou `form_factor`.
- O período usa `intervalo_dia` e `fuso_horario_valido` (`application/validators/semana.py`). O dia final
  entra inteiro.
- `tc_id` e `tela` filtram por "contém", sem diferenciar maiúsculas.
- `perfil` compara com o nome gravado no momento.

## Backend: arquivos

Seguindo a skill `python-crud` (só leitura, sem UoW):
- `domain/queries/auditoria.py` (novo): `FiltrosAuditoria`, `LinhaAuditoria` e os enums `AcaoAuditoria` e
  `OrigemAuditoria`.
- `domain/entities/interfaces/auditoria_repository.py` (novo): `listar(unidade_id, filtros, page, page_size)
  -> PagedResult[LinhaAuditoria]`.
- `infrastructure/repositories/auditoria_repository.py` (novo): a consulta com `text()` e a contagem.
- `application/schemas/historico_caso_teste.py` (alterado): extrai `alteracoes_do_registro`.
- `application/schemas/auditoria.py` (novo): `RegistroAuditoriaResponse`, `AlteracaoResponse` e o mapeamento.
- `application/services/auditoria_service.py` e a interface (novos): `listar`, que exige admin, valida o
  período, busca os nomes da página e mapeia.
- `api/routers/auditoria.py` (novo) e o registro no `main.py`; `api/dependencies.py` com
  `get_auditoria_service`.

## Frontend: arquivos

Seguindo `react-crud` e `table-rules`:
- `modules/auditoria/` (novo):
  - `api/auditoria.api.ts`, com o ramo do modo mock (spec 010);
  - `model/auditoria.ts`;
  - `hooks/useAuditoria.ts`, com página, tamanho e filtros na `queryKey`;
  - `pages/AuditoriaPage.tsx`, com a guarda de admin como em `SetoresPage`;
  - `components/DetalheAuditoriaDrawer.tsx`;
  - `routes.tsx`, com a rota `admin/auditoria`, e `index.ts`.
- `core/router.tsx` (alterado): registra as rotas do módulo.
- `core/layout/Sidebar.tsx` (alterado): item Auditoria em `itensAdmin`, só para o admin.
- `shared/lib/auditoria.ts` (novo): rótulo de cada campo e tradução dos valores (Status, Category,
  Difficulty, Situation, Automation Level).
- `core/mock/database.ts` (alterado): registros de auditoria de exemplo para o modo mock.
- `core/i18n/resources.ts` (alterado): os textos nos três idiomas.
- Filtros de opção:
  - usuários: a listagem de usuários da unidade (módulo `usuarios`);
  - perfis: a listagem de perfis;
  - projetos: a listagem de projetos;
  - ação e origem: listas fixas;
  - período: `DataTableFilter type="date"` para início e fim.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional | `test_auditoria_api.py`: admin recebe 200 com `PagedResult` |
| CA-01 | Frontend | `AuditoriaPage.test.tsx`: renderiza as linhas; `Sidebar.test.tsx`: o item aparece para o admin |
| CA-02 | Integração | `test_auditoria_repository.py`: filtro por usuários e período (com fuso) devolve só os registros esperados |
| CA-03 | Unidade | `test_auditoria_service.py`: registro com dois campos vira duas alterações; os nomes vêm resolvidos |
| CA-03 | Frontend | resumo com "+1" e o painel com as duas alterações |
| CA-04 | Integração | filtro `origem=form_factor` |
| CA-05 | Integração | 45 registros, páginas de 20, a 3ª com 5 |
| CA-06 | Frontend | exportar todos chama a listagem com os mesmos filtros (`buscarTodasAsPaginas`) |
| CA-07 | Unidade e funcional | gerente, KP e dev recebem `ForbiddenException`/403; `Sidebar.test.tsx`: o item não aparece; a página mostra "sem permissão" |
| CA-08 | Integração | registros de outra unidade nunca aparecem, com ou sem filtros |
| CA-09 | Frontend | vazio com filtro mostra "Nenhum registro encontrado" e "Limpar filtros" |
| CA-10 | Unidade e funcional | `data_fim` antes de `data_inicio` dá `InvalidInputException`/422; no front, o filtro não é aplicado |
| todos | E2E | `auditoria.spec.ts` (API simulada por `page.route`): admin abre a tela, filtra, abre o detalhe |

## Riscos e decisões pendentes

- **Desempenho:** a consulta usa `ix_auditoria_alteracoes_unidade (unidade_id, created_at)` para a ordem e o
  período. Os filtros por texto (`tc_id`, `tela`) fazem `ILIKE` sobre o resultado da unidade, o que é aceitável
  no volume atual. Se a tabela crescer muito, entram um índice trigram e o particionamento do ADR 0044.
- **Contagem total:** cada página faz um `COUNT(*)` com os mesmos filtros, como as outras listagens.
- **Registros antigos:** os registros gravados antes da migration `e038b1c2d3e4` não têm nome, perfil nem tela
  e aparecem com "—". Isso só acontece em ambientes de desenvolvimento.
- **Duplicação com a 038:** o mapeamento fica num ponto só (`alteracoes_do_registro`) e os rótulos em
  `shared/lib/auditoria.ts`, para a tela e o painel não divergirem.
