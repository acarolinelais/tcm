# 021. Resultados gerais de Form Factor: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0017, 0018, 0022, 0030, 0034
- **ADRs novos propostos:** nenhum

## Abordagem
Adicionar duas consultas globais somente de leitura, uma para o resumo e outra para o histórico, aproveitando as entidades atuais de projeto, Test Case, execução SDF e resultado por modelo. O serviço deriva os IDs de time autorizados (setores gerenciados pelo Gerente ou times associados ao KP) e o repositório aplica esse escopo diretamente nas consultas SQL, antes de filtros, contagem e paginação; não carrega uma lista de projetos na memória para delimitar o acesso nem compõe respostas chamando uma vez a API para cada projeto. As respostas incluem a união estável dos modelos e responsáveis disponíveis no escopo e os modelos associados a cada projeto, permitindo apresentar `N/A` para modelo não aplicável e `—` para modelo aplicável sem resultado. No frontend, a nova tela reutiliza os padrões de semana, filtros, tabelas e paginação, acrescenta o acesso na navegação de Gerente e KP e não oferece ações de escrita.

## Modelo de dados
Não há novas entidades nem migration. As consultas usam os vínculos existentes de projeto-modelo e os dados de Test Case, execução e resultado.

| DTO de consulta | Campo | Tipo | Regras |
|---|---|---|---|
| Modelo global | `id`, `nome` | UUID, string | União dos modelos associados a projetos no escopo autorizado; ordenação estável por nome e ID. |
| Linha global de resumo | `projeto_id`, `projeto_nome` | UUID, string | Identifica o projeto e suporta navegação ao detalhe. |
| Linha global de resumo | `caso_teste_id`, `tc_id`, `responsavel_id` | UUID, string, UUID | Uma linha por Test Case. |
| Linha global de resumo | `modelos_ids` | lista de UUID | Modelos associados ao projeto da linha; usado para distinguir `N/A` de `—`. |
| Linha global de resumo | `sdf_id`, `data_reportada`, `resultados` | string opcional, datetime opcional, mapa modelo→string | Metadados da rodada mais recente no escopo temporal da consulta e resultado mais recente por modelo aplicável. |
| Linha global de resultado | `execucao_id`, `projeto_id`, `projeto_nome`, `caso_teste_id`, `tc_id`, `responsavel_id` | UUID, UUID, string, UUID, string, UUID | Uma linha por execução registrada, com identificadores do projeto e do Test Case. |
| Linha global de resultado | `modelos_ids`, `sdf_id`, `data_reportada`, `origem`, `resultados` | lista de UUID, string opcional, datetime, `SDF\|MANUAL`, mapa modelo→string | Modelos associados ao projeto da linha e resultados daquela execução. |

Os DTOs paginados carregam `items`, `modelos` (a união calculada para o escopo inteiro, não só para a página), `responsaveis` (opções do filtro limitadas ao mesmo escopo) e os campos padrão de `PagedResult` (`page`, `page_size`, `total_count`, `total_pages`).

## Contrato da API
Os dois endpoints aceitam filtros explícitos, aplicados por AND no servidor após validar autorização e escopo. `page_size` aceita 1–100; o frontend inicia com `DEFAULT_TABLE_PAGE_SIZE` (20).

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| `GET` | `/api/form-factor/general` | Query: `page`, `page_size`, `semana`, `projeto_id`, `responsavel_id`, `tc_id`, `sdf_id`, `modelo_dispositivo_id`, `resultado` | Resumo paginado, uma linha por TC, modelos globais e modelos aplicáveis por linha | 403 sem papel/permissão; 422 para filtro inválido; projeto fora do escopo não é revelado |
| `GET` | `/api/form-factor/general/results` | Query do resumo mais `origem` (`SDF\|MANUAL`) | Histórico paginado, uma linha por execução | 403 sem papel/permissão; 422 para filtro inválido; projeto fora do escopo não é revelado |

O acesso exige `form_factor.consultar` e perfil `GERENTE` ou `KP`. O Gerente é limitado aos times dos setores gerenciados; o KP, aos próprios times. O filtro `projeto_id` nunca amplia esse conjunto. A consulta não cria rotas de importação ou gravação.

## Backend: arquivos
- `backend/src/api/routers/form_factor_geral.py` e `api/main.py`: rotas globais de Resumo e Results.
- `backend/src/application/services/interfaces/form_factor_service.py` e `application/services/form_factor_service.py`: contratos dos casos de consulta, validação explícita de papel/permissão e derivação do escopo.
- `backend/src/application/schemas/form_factor.py` (ou schema global dedicado): respostas paginadas com projeto, união de modelos e `modelos_ids` por linha.
- `backend/src/domain/entities/interfaces/resultado_form_factor_repository.py` e `domain/queries/`: consultas tipadas de resumo e histórico global.
- `backend/src/infrastructure/repositories/resultado_form_factor_repository.py`: joins e filtros por unidade, setor/time, projeto, associação de modelo, semana, responsável, TC, SDF, origem e resultado; ordenação determinística e paginação no banco.
- `backend/src/api/dependencies.py`: composição do service, reaproveitando as dependências atuais.
- Testes unitários de service/queries, testes de integração do repositório e testes funcionais das rotas e permissões.

## Frontend: arquivos
- `frontend/src/modules/projetos/model/projeto.ts`, `api/projetos.api.ts` e `hooks/useProjetos.ts`: DTOs, filtros, funções de consulta e cache separados para Resumo e Results.
- `frontend/src/modules/projetos/ResultadosGeraisPage.tsx` e componentes de tabela global: seleção Resumo/Ver todos, semana, filtros, estados e navegação para o detalhe do projeto.
- `frontend/src/modules/projetos/routes.tsx`, `frontend/src/core/layout/Sidebar.tsx` e ícones: rota e item de navegação visíveis somente para Gerente/KP com permissão.
- `frontend/src/core/i18n/resources.ts`: rótulos e mensagens PT-BR/EN/KO.
- `frontend/src/core/mock/database.ts`: consultas globais equivalentes ao contrato real e respeitando os escopos de Gerente/KP.
- Testes de API/hook, página, tabelas, sidebar e modo mock.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-09 | Frontend/funcional | `ResultadosGeraisPage.test.tsx`, `Sidebar.test.tsx` e teste de autorização das rotas; Gerente/KP veem a tela, outros papéis não. |
| CA-01, CA-03, CA-04, CA-05 | Integração | `test_listar_form_factor_global_resumo`: escopo temporal, última rodada por modelo e TCs sem resultado. |
| CA-02, CA-08 | Frontend/integração | `FormFactorGlobalTabela.test.tsx`: união de colunas estável, `N/A` versus `—` e rolagem horizontal. |
| CA-06 | Integração | `test_listar_form_factor_global_execucoes`: todas as rodadas, projeto, origem, data e resultados. |
| CA-07, CA-10 | Unitário/funcional | filtros combinados e vazio filtrado reiniciam a página e permitem limpar filtros. |
| CA-11 | Funcional/segurança | usuário fora da unidade/setor/time não recebe projetos nem resultados, inclusive usando `projeto_id` no filtro. |
| CA-01..11 | Mock | `database.test.ts`: mesmos contratos e regras de escopo com projetos de modelos diferentes. |

## Riscos e decisões pendentes
- A união de modelos pode produzir uma tabela larga; a rolagem horizontal será mantida dentro da tabela, com cabeçalho fixo e projeto identificando cada linha.
- A consulta de Resumo inclui Test Cases sem resultado apenas sem filtro temporal; essa regra preserva o comportamento da tela de projeto.
- O `N/A` depende da associação modelo-projeto retornada por linha. Não inferir aplicabilidade pela ausência de uma chave em `resultados`.
- As respostas e contagens devem ser derivadas somente depois do filtro de unidade e escopo. Isso é requisito de segurança, não otimização opcional.
- A lista de modelos deve ser calculada para o escopo autorizado (e filtro de projeto, quando presente), nunca só para os itens da página, para manter cabeçalhos estáveis durante paginação.
