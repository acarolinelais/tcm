# 020. Histórico e lançamento de resultados Form Factor: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0010, 0013, 0020, 0030, 0034
- **ADRs novos propostos:** nenhum

## Abordagem
Reaproveitar o modelo persistido de importação, execução SDF e resultados por modelo; acrescentar uma origem explícita para distinguir rodadas manuais e importadas, se a entidade atual não puder representar isso com segurança. Separar a consulta em dois contratos: matriz resumida atualizada e histórico paginado por execução. Criar uma operação transacional para registrar uma rodada manual e seus resultados PASS/FAIL para vários modelos. No frontend, expor as visões Resumo e Results, adicionar filtros adequados a cada tabela e ajustar o contêiner para uma única rolagem vertical. O modo mock deve acompanhar a mesma semântica e preservar histórico.

## Modelo de dados
| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| ExecucaoSdf | origem | enum/string | `SDF` ou `MANUAL`; valor padrão `SDF` para registros existentes |
| ExecucaoSdf | sdf_id | string nullable | Necessário para execução importada; ausente em rodada manual |
| ExecucaoSdf | data_reportada | datetime | Data importada do relatório ou preenchida automaticamente no registro manual |
| ResultadoFormFactor | resultado | string | Para origem manual aceitar somente `PASS` ou `FAIL`; importação preserva o texto recebido. Uma rodada manual exige ao menos um resultado e pode incluir apenas parte dos modelos associados ao projeto. |

Antes de criar migration, confirmar se `sdf_id` e `data_reportada` aceitam os valores necessários à rodada manual. A gravação de uma execução e seus resultados deve ocorrer em uma transação. A rodada manual pode incluir um subconjunto não vazio dos modelos do projeto (decisão confirmada pelo usuário em 2026-10-25).

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| `GET` | `/api/projetos/{projeto_id}/form-factor` | paginação e filtros da visão Resumo | Matriz com último resultado por TC/modelo | 403/404, validação |
| `GET` | `/api/projetos/{projeto_id}/form-factor/results` | paginação e filtros do histórico | Rodadas paginadas, com resultados por modelo e origem | 403/404, validação |
| `POST` | `/api/projetos/{projeto_id}/form-factor/results` | `caso_teste_id`, data opcional, resultados `{modelo_id: PASS\|FAIL}` | Rodada criada com seus resultados | 403/404/422; sem persistência parcial |

Results apresenta uma linha por rodada e uma coluna por modelo, como a matriz de resumo. Reutilizar `semana` e `responsavel_id`; adicionar TC, SDF ID e filtros por resultado nas colunas de modelo conforme aplicável.

## Backend: arquivos
- `domain/entities/execucao_sdf.py` e `infrastructure/data/models/execucao_sdf_model.py`: representar origem e campos opcionais da execução manual.
- Migration Alembic para origem/default e nulabilidade necessária, preservando registros existentes como SDF.
- `domain/entities/interfaces/execucao_sdf_repository.py` e `resultado_form_factor_repository.py`: criação transacional e consultas de histórico.
- `application/schemas/form_factor.py`, `application/services/form_factor_service.py` e interfaces: schemas, listagem histórica e criação manual com autorização.
- `api/routers/projetos.py` e `api/dependencies.py`: rotas e injeção de dependências.
- Testes unitários de domínio, services e repositórios; teste funcional de autorização, validação e atomicidade.

## Frontend: arquivos
- `frontend/src/modules/projetos/model/projeto.ts` e `api/projetos.api.ts`: tipos, filtros, listagem de Results e criação manual.
- `hooks/useProjetos.ts` (ou hooks dedicados): consultas e mutation com invalidação de Resumo e Results.
- `ProjetoDetalhePage.tsx` e componentes novos para Resumo, Results e formulário de rodada manual.
- `FormFactorTabela.tsx`: preservar o resumo por TC/modelo e corrigir filtros/rolagem.
- `shared/ui/table-column-filter.tsx`: permitir limite de tamanho e busca para listas longas sem quebrar os usos existentes.
- `core/mock/database.ts`: armazenar a origem, criar rodada manual e listar histórico com filtros/paginação.
- Recursos de tradução PT/EN/KO e testes associados.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-02, CA-05 | Unitário backend | `test_resultado_form_factor_repository.py`: último resultado por par TC/modelo |
| CA-03, CA-06 | Unitário backend | consulta paginada de execuções, filtros e resultados por modelo |
| CA-04, CA-09, CA-10, CA-11 | Service/funcional | criar rodada multi-modelo, rejeitar acesso inválido e garantir atomicidade |
| CA-01..08 | Frontend | `FormFactorTabela.test.tsx`, `FormFactorResultadosTabela.test.tsx`, filtro compartilhado e `ProjetoDetalhePage.test.tsx` |
| CA-04..06 | Mock | `database.test.ts`: rodada manual aparece no histórico e atualiza a matriz sem apagar rodadas anteriores |

## Riscos e decisões pendentes
- A consulta resumida atual inclui TCs sem resultado quando não há filtro temporal; preservar essa regra para a aba Resumo.
- A implementação exige migration compatível com importações antigas, especialmente ao tornar `sdf_id` opcional para rodadas manuais.
