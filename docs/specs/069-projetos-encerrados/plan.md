# 069. Projetos encerrados fora das telas de trabalho: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0006, 0010, 0013, 0015, 0030, 0033, 0037
- **ADRs novos propostos:** nenhum

## Abordagem
Esconder os projetos encerrados é trabalho só do frontend. A navegação do Board (`/api/projetos/navegacao`) já traz o
status de cada projeto, e a Timeline e a General Results já carregam todas as páginas do seletor
(`useProjetosSeletor`) antes de escolher o projeto. Por isso basta filtrar a lista que cada tela já tem, e a API de
listagem não muda. A tela Projects usa a mesma API e continua igual (RN-04).

A trava da conclusão fica no backend. `ProjetoServiceImpl.atualizar_status` conta os Test Cases ativos do projeto
fora de Done e Cancelled e, se a conta passar de zero, recusa a conclusão com 409. O erro segue o ADR 0033: vai um
`codigo` e a quantidade em `parametros`, e o frontend monta o texto no idioma da pessoa. O modo mock (ADR 0030)
ganha a mesma trava.

## Modelo de dados
Nenhuma mudança. Não há migration.

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| PATCH | `/api/projetos/{id}/status` | `{ "status": "Completed" }` | 200 `ProjetoResponse` (sem mudança) | **409 novo** quando há Test Cases pendentes; 403, 404 e 422 como hoje |

O 409 novo:
```json
{
  "title": "Conflito.", "status": 409,
  "detail": "2 Test Cases ainda não estão em Done.",
  "errors": [{ "campo": "status", "mensagem": "2 Test Cases ainda não estão em Done.",
               "codigo": "projeto_com_casos_pendentes", "parametros": { "quantidade": 2 } }]
}
```

## Backend: arquivos
- `domain/common/exceptions.py`: `ConflictException` aceita, além do `campo`, um `codigo` e `parametros`
  opcionais.
- `api/error_handling/handlers.py`: `handle_conflict` repassa o `codigo` e os `parametros` para o
  `ProblemDetailsError`.
- `domain/entities/interfaces/caso_teste_repository.py` e `infrastructure/repositories/caso_teste_repository.py`:
  `contar_pendentes_de_conclusao(unidade_id, projeto_id) -> int`, que conta os casos com `ativo` verdadeiro e status
  fora de `Done` e `Cancelled`. O filtro de `unidade_id` é o do `RepositoryBaseImpl` (ADR 0013).
- `application/services/projeto_service.py`: recebe o `CasoTesteRepository` no construtor. Em
  `atualizar_status`, quando o status pedido é `Completed`, conta os pendentes antes de gravar e levanta a
  `ConflictException` (RN-05 e RN-06). O `Canceled` não passa pela conta (RN-07).
- `api/dependencies.py`: `get_projeto_service` passa o `CasoTesteRepositoryImpl(session)`.
- Testes que constroem o `ProjetoServiceImpl` (`tests/unit/application/services/test_projeto_service.py` e
  `tests/functional/test_projetos_api.py`) ganham o argumento novo.

## Frontend: arquivos
- `modules/projetos/model/projeto.ts`: `projetoEncerrado(status)`, que sai do `BoardPage.tsx` para ser usado
  pelas telas e pelo mock.
- `shared/ui/filtro-encerrados.tsx` (novo): o `Switch` do HeroUI "Show closed projects", controlado pela tela.
  O estado é um `useState` de cada tela, que começa desligado (RN-03 e CA-06).
- `modules/projetos/pages/BoardPage.tsx`: o filtro ao lado da busca. Com ele desligado, os cards dos times
  mostram só os projetos abertos. A ida direta para o Kanban (dev ou um time só) usa o último projeto se ele estiver
  aberto, senão o primeiro aberto. Sem nenhum aberto, mostra o estado vazio com o filtro, e com o filtro ligado vai
  para o último projeto ou o primeiro da lista (CA-03).
- `modules/projetos/pages/BoardKanbanPage.tsx`: o filtro ao lado do seletor de projeto. Desligado, o seletor só
  oferece os projetos abertos. É o caminho de quem cai direto no Kanban e quer consultar um encerrado. O projeto da
  página abre mesmo encerrado (RN-08 e CA-13).
- `modules/timeline/pages/TimelinePage.tsx` e `modules/projetos/pages/ResultadosGeraisPage.tsx`: o filtro no
  cabeçalho. O seletor (ou as abas) mostra só os abertos. O `?projeto=` procura o projeto na lista completa, então
  um link para um encerrado continua abrindo (RN-08). Sem `?projeto=`, abre o primeiro aberto.
- `modules/projetos/pages/ProjetosPage.tsx`: no `onError` da troca de status, o 409 com `codigo`
  `projeto_com_casos_pendentes` vira o toast `projectCompleteBlocked` com a quantidade. Os outros erros continuam
  com o toast genérico.
- `core/i18n/resources.ts`: `showClosedProjects`, `projectCompleteBlocked` (com plural) e o estado vazio do Board
  sem projeto aberto, em EN, PT e KO.
- `core/mock/database.ts`: `atualizarStatus` aplica a mesma trava e devolve o mesmo 409.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade (front) | `BoardPage.test.tsx`: card do time sem o projeto Completed |
| CA-02 | Unidade (front) | `BoardPage.test.tsx`: filtro ligado mostra os dois |
| CA-03 | Unidade (front) | `BoardPage.test.tsx`: último projeto encerrado leva a um aberto; sem aberto, estado vazio com filtro |
| CA-04 | Unidade (front) | `TimelinePage.test.tsx`: Canceled fora do seletor; com filtro, dentro |
| CA-05 | Unidade (front) | `ResultadosGeraisPage.test.tsx`: Completed fora das abas; com filtro, dentro |
| CA-06 | Unidade (front) | `TimelinePage.test.tsx`: filtro desligado ao remontar a tela |
| CA-07 | Unidade (front) | `ProjetosPage.test.tsx`: Completed listado |
| CA-08 | Unidade + funcional | `test_projeto_service.py`: conclui com zero pendentes; `test_projetos_api.py`: PATCH 200 |
| CA-09 | Integração | `test_caso_teste_repository.py`: projeto sem casos conta zero |
| CA-10 | Unidade + funcional + unidade (front) | serviço levanta o 409 e não grava; PATCH 409 com `codigo` e `quantidade`; `ProjetosPage.test.tsx` mostra o toast com 2 |
| CA-11 | Integração | `test_caso_teste_repository.py`: caso excluído não entra na conta; Cancelled também não |
| CA-12 | Unidade | `test_projeto_service.py`: Canceled não consulta os pendentes |
| CA-13 | Unidade (front) | `BoardKanbanPage.test.tsx`: projeto Completed abre pelo link |
| CA-10 (mock) | Unidade (front) | `database.test.ts`: o mock recusa a conclusão com caso pendente |

## Riscos e decisões pendentes
- Concorrência: um Test Case pode sair de Done entre a conta e o commit da conclusão. O risco é baixo (as duas
  ações são manuais e raras ao mesmo tempo) e não vale um lock. Fica registrado.
- Com o filtro desligado e só projetos encerrados, a Timeline e a General Results caem no estado vazio que já
  existe ("nenhum projeto"). O texto pode precisar dizer que há projetos encerrados escondidos. O ajuste é só de
  texto e entra na task da tela, se precisar.
- O Overview continua mostrando projetos encerrados (fora de escopo na spec).
