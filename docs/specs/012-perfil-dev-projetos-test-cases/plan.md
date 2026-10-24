# 012. Perfil Dev em Projetos e Test Cases: Plan

- **Spec:** [spec.md](spec.md)
- **Status:** Aprovado
- **Data:** 2026-10-24
- **ADRs aplicados:** 0002, 0003, 0004, 0006, 0008, 0009, 0010, 0013, 0017, 0018, 0022, 0026, 0030, 0031
- **ADR adicional aceito:** 0034, harmonização da documentação de paginação no tratamento do backlog B01.

## Abordagem

Identificar o dev pelo código estável `USUARIO_PADRAO`, cujo nome exibido atualmente é Developer, sem inferir o perfil pelo nome ou pela ausência de permissões de gestão. Acrescentar o filtro opcional `associados_a_mim` às consultas existentes de projetos e Test Cases, resolvendo o usuário pela sessão autenticada. O backend combina a associação como responsável ou backup com o escopo organizacional antes de contar e paginar os resultados. Na entrada `/projetos`, uma página de decisão encaminha o dev ao primeiro projeto associado ou apresenta o estado vazio, enquanto os demais perfis continuam na listagem atual. A tela de detalhe e seu dropdown usam as consultas pessoais para o dev, preservando as regras de edição, o modo mock e a estrutura visual compartilhada.

Esta entrega trata do acesso inicial e da consulta pessoal descritos na spec. O filtro é um recorte de consulta, não uma nova permissão: sua ausência mantém os contratos atuais de consulta a casos do time, e sua presença nunca amplia o escopo autorizado.

## Modelo de dados

Não há novas entidades, colunas, permissões ou migrations. Reutilizar:

| Entidade | Campos existentes | Uso |
|---|---|---|
| Projeto | `id`, `unidade_id`, `time_id`, `ativo` | Identificar projetos ativos dentro do escopo autorizado. |
| CasoTeste | `projeto_id`, `unidade_id`, `responsavel_id`, `backup_id`, `ativo` | Associação: caso ativo em que responsável ou backup corresponde ao usuário autenticado. |
| TimeMembro / identidade autenticada | participação ativa / `time_ids` | Uma atribuição isolada não concede acesso a projeto de time fora do escopo. |
| Perfil / identidade autenticada | `perfil_codigo`, `permissoes` | Distinguir Developer e verificar as permissões existentes. |

Consulta de projetos associados: filtrar projetos por unidade, atividade e times autorizados, usando `EXISTS` de caso ativo da mesma unidade e projeto com `(responsavel_id = usuario.id OR backup_id = usuario.id)`. Usar a mesma condição na contagem e seleção; `EXISTS` evita duplicar projetos com vários casos associados. Preservar a ordenação existente `created_at DESC, id`, apenas como ordem estável de consulta, sem criar preferência de produto.

Consulta pessoal de casos: combinar unidade, projeto, atividade e associação por OR; filtros adicionais são combinados por AND. Preservar a priorização existente dos casos de responsabilidade principal e o desempate por `tc_id, id`. Não buscar uma página de casos gerais para depois filtrar no navegador.

## Contrato da API

Respostas e schemas existentes são mantidos. `associados_a_mim` é um booleano opcional, com padrão `false`, documentado no OpenAPI. O cliente não informa o identificador do usuário para esse filtro.

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos` | `page`, `page_size`, `associados_a_mim=true` | 200 `PagedResult[ProjetoResponse]`, apenas projetos associados no escopo atual | 401, 403, 422 |
| GET | `/api/projetos/{projeto_id}/test-cases` | `page`, `page_size`, `associados_a_mim=true`; mantém `responsavel_id` opcional | 200 `PagedResult[CasoTesteResponse]`, casos como responsável ou backup do projeto | 401, 403, 404, 422 |
| GET | `/api/projetos/{projeto_id}` | UUID do projeto | 200 `ProjetoResponse`, com as verificações de acesso existentes | 401, 403, 404, 422 |
| PUT | `/api/test-cases/{caso_id}` | Contrato existente | 200 para edição autorizada; ser backup não autoriza edição | 401, 403, 404, 409, 422 |
| PATCH | `/api/test-cases/{caso_id}/transferir-para-backup` | Contrato existente | 200 para transferência autorizada pelo responsável principal | 401, 403, 404, 409, 422 |

- `page >= 1`; `1 <= page_size <= 100`. O filtro pessoal usa o mesmo `PagedResult`, incluindo `total_count` após todos os filtros e antes da paginação.
- Projetos associados exigem a permissão atual de consulta de projetos ou Test Cases; consultar casos exige `test_cases.consultar`. Nenhuma permissão é concedida automaticamente. Ausência de permissão retorna 403 e não estado vazio.
- Projeto inexistente, inativo ou fora da unidade/time autorizado retorna 404 na consulta de casos; alinhar a verificação de projeto ativo, hoje já presente na consulta de detalhe, também nessa consulta.
- Zero associações retorna 200 com `items: []` e `total_count: 0`. Parâmetros inválidos retornam 422 ProblemDetails; outros erros mantêm o formato padronizado.
- `responsavel_id`, se enviado junto ao filtro pessoal, restringe os casos associados ao responsável escolhido. Ele não substitui a condição pessoal nem transforma o OR responsável/backup em busca exclusiva de responsáveis.
- Sem `associados_a_mim`, preservar o comportamento dos consumidores existentes. A indisponibilidade da tela de listagem de projetos para dev é uma regra de navegação, não o bloqueio do GET usado pelo próprio dropdown.

## Navegação e apresentação

1. Manter Projects apontando para `/projetos` e visível ao Developer com as permissões de consulta existentes, inclusive quando não tem associações. Usar a tradução do rótulo Projects sem renomear desnecessariamente a navegação dos demais perfis.
2. Em `ProjetosEntradaPage`, decidir pelo perfil antes de montar `ProjetosPage`. Para dev, consultar a primeira página de projetos com `associados_a_mim=true` e `page_size=1`. Havendo resultado, encaminhar com substituição do histórico para `/projetos/{id}`. Não montar a listagem de projetos nem iniciar suas consultas/formulários para o dev.
3. Sem resultado, apresentar `ProjetosDevEmptyState`, com a mensagem única da spec e navegação lateral preservada. Carregamento usa `role="status"`; erro usa `role="alert"` e permite tentar novamente. Reaproveitar `TableEmptyState`/painel compartilhado, sem adicionar ações de gestão.
4. No detalhe, dev inicia na aba Test Cases, usando `associados_a_mim=true`. O filtro pessoal permanece ativo em toda página e combinação de filtros. Preservar a funcionalidade atual de Form Factor conforme suas permissões, sem mudar seus contratos nesta entrega.
5. No dropdown existente, carregar apenas projetos associados para dev. Buscar páginas de até 100 itens sob demanda, com carregamento de mais opções até `total_count`, para permitir escolher projetos além da primeira página. Falha em uma página mantém opções já carregadas e permite repetição; não simular que não há outros projetos. Com um único projeto, preservar a apresentação atual do título sem menu.
6. Trocar de projeto volta à página 1 dos casos, limpa filtros locais do projeto anterior e mantém a aba Test Cases. A lista mostra responsável e backup pelos mecanismos existentes. Apenas o responsável principal recebe controles de edição e transferência; backup vê os campos somente para leitura.
7. Se um projeto acessível aberto diretamente não tem mais casos associados, reconsultar os projetos pessoais e encaminhar ao primeiro elegível ou ao estado vazio; impedir ciclos de redirecionamento. Para 403/404, apresentar o erro de acesso sem consultar ou renderizar dados do projeto negado.
8. Invalidar consultas de casos e de projetos associados após transferência ou alteração de atribuição; se o dev perder sua última associação no projeto atual, aplicar a mesma recuperação do item anterior. Incluir usuário, unidade, projeto, filtro pessoal, filtros e paginação nas chaves relevantes do cache para não reutilizar resultados de outro contexto.

Usar as constantes e os componentes compartilhados de tabela, sem criar um paginador ou padrão visual exclusivo. Textos novos ficam em inglês, português e coreano; o dropdown mantém navegação por teclado, foco e indicação do projeto selecionado.

## Backend: arquivos

Seguir a receita `python-crud` apenas nas camadas afetadas por consulta, sem recriar entidades ou CRUDs.

Arquivos alterados, relativos a `backend/`:

- `src/domain/entities/interfaces/projeto_repository.py`: acrescentar consulta paginada de projetos por times e usuário associado.
- `src/domain/entities/interfaces/caso_teste_repository.py`: acrescentar o argumento interno `associado_usuario_id` à consulta por projeto.
- `src/infrastructure/repositories/projeto_repository.py`: implementar o `EXISTS` com contagem e paginação consistentes.
- `src/infrastructure/repositories/caso_teste_repository.py`: implementar a associação responsável/backup na consulta pessoal.
- `src/application/services/interfaces/projeto_service.py` e `src/application/services/projeto_service.py`: propagar o filtro e resolver escopo e identidade autenticada.
- `src/application/services/interfaces/caso_teste_service.py` e `src/application/services/caso_teste_service.py`: alinhar assinatura ao filtro `responsavel_id` já existente, acrescentar filtro pessoal e verificar projeto ativo.
- `src/api/routers/projetos.py`: declarar e encaminhar o novo query param nas duas listagens.
- `tests/unit/application/services/test_projeto_service.py`, `test_caso_teste_service.py` e `tests/functional/test_projetos_api.py`, `test_casos_teste_api.py`: ampliar testes e dublês às assinaturas novas.

Arquivos novos:

- `tests/integration/test_consultas_associadas_dev.py`: testar consultas reais com principal, backup, colega, múltiplas páginas, atividade e isolamento por unidade/time.

Não são necessárias mudanças de composição de dependências, schemas de resposta ou rotas de escrita.

## Frontend: arquivos

Seguir `react-crud` para cliente → hooks → apresentação → rotas, dentro do módulo existente. Aplicar `table-rules` à composição e aos estados da listagem.

Arquivos novos, relativos a `frontend/`:

- `src/modules/projetos/ProjetosEntradaPage.tsx` e `.test.tsx`: decisão de navegação por perfil, carregamento, erro e encaminhamento.
- `src/modules/projetos/components/ProjetosDevEmptyState.tsx` e `.test.tsx`: estado vazio único, acessível e traduzido.
- `src/modules/projetos/components/ProjetoSwitcher.test.tsx`: consulta pessoal, troca e opções além da primeira página.
- `e2e/projetos-dev.spec.ts`: fluxo completo do dev com API real e dados de teste isolados.

Arquivos alterados:

- `src/modules/projetos/api/projetos.api.ts`: tipar e transmitir `associados_a_mim` nas consultas de projetos e casos, incluindo a implementação mock.
- `src/modules/projetos/hooks/useProjetos.ts` e seus testes: encapsular consultas pessoais e paginação do seletor; manter consultas e invalidações de gestão compatíveis.
- `src/modules/projetos/routes.tsx` e `routes.test.ts`: usar a página de entrada em `/projetos`, preservando o caminho de detalhe.
- `src/modules/projetos/ProjetoDetalhePage.tsx` e `.test.tsx`: consulta pessoal, recuperação de associação perdida, troca de contexto e ações por posse.
- `src/modules/projetos/components/ProjetoSwitcher.tsx`: filtrar opções para dev e permitir carregar páginas seguintes.
- `src/core/layout/Sidebar.tsx` e `.test.tsx`: garantir acesso ao fluxo pessoal e o rótulo traduzido para dev.
- `src/core/i18n/resources.ts` e `resources.test.ts`: adicionar/verificar mensagens nos três idiomas.
- `src/core/mock/database.ts` e `.test.ts`: reproduzir filtros, escopo, contagem e paginação com a identidade mock atual, sem resetar dados persistidos existentes.
- `vite.config.ts`: permitir `SDF_E2E_API_URL` para apontar o proxy dos testes à API dedicada, preservando `http://localhost:8000` como destino padrão. As jornadas reais não interceptam respostas de sucesso.

Ampliar os testes existentes de cliente/hooks nos arquivos correspondentes; se não houver teste do cliente, criar `src/modules/projetos/api/projetos.api.test.ts`.

## Critérios de aceite → testes

| CA | Nível | Cobertura prevista |
|---|---|---|
| CA-01 | Componente + e2e | Projects visível ao dev, inclusive sem associações, com rótulo traduzido. |
| CA-02 | Componente + e2e | Único projeto encaminha diretamente aos TCs pessoais; listagem de projetos nunca monta. |
| CA-03 | Componente + e2e | Abertura direta de `/projetos` e recarregamento seguem a mesma decisão. |
| CA-04 | Unidade + componente + e2e | Nenhum projeto/caso associado retorna coleção vazia e apresenta a mensagem única. |
| CA-05 | Integração + componente | Projetos do time sem principal/backup do dev não são elegíveis. |
| CA-06 | Componente + e2e | Falha na consulta apresenta alerta e repetição, sem estado vazio incorreto. |
| CA-07 | Componente | Resposta pendente mostra carregamento sem mensagem de ausência. |
| CA-08 | Unidade + integração + funcional + e2e | Atribuição em time fora do escopo não concede acesso; outra unidade/inexistente retorna 404; sem permissão retorna 403. |
| CA-09 | Componente + recursos i18n | Estado vazio e navegação traduzidos em en, pt-BR e ko. |
| CA-10 | Unidade + componente + e2e | Múltiplos projetos abrem o primeiro retornado, com TCs de um único projeto. |
| CA-11 | Integração + componente | Filtro de associação ocorre antes da paginação, ignorando projetos sem casos do dev. |
| CA-12 | Unidade + integração + e2e | Projeto com dev somente como backup participa da consulta e do encaminhamento. |
| CA-13 | Integração + funcional + componente | Listagem pessoal contém principal e backup, exclui outros casos e tem contagem/páginas corretas. |
| CA-14 | Unidade + funcional + componente | Backup sem gestão não vê ações de edição/transferência; tentativa direta retorna 403 e não grava. |
| CA-15 | Componente + e2e | Dropdown troca projeto e reinicia página/filtros exibindo somente associações nesse projeto. |
| CA-16 | Integração + componente + e2e | Dropdown oferece somente projetos elegíveis, inclusive os disponíveis após 100 opções. |

Regressões adicionais: manter consultas e navegação de administrador/gerente/KP; validar `associados_a_mim` inválido e paginação fora dos limites com 422; não duplicar projeto com vários casos; excluir registros inativos das consultas pessoais; confirmar paridade do mock e invalidação após perder a última associação.

Verificação prevista durante a implementação: `cd backend && uv run pytest`, `uv run ruff check .` e testes de arquitetura incluídos no pytest; `cd frontend && npm test`, `npm run lint`, `npm run build` e `npm run e2e -- e2e/projetos-dev.spec.ts`. Integração e e2e exigem PostgreSQL/Docker e API configurados; testes com interceptação de rede cobrem falhas de consulta, sem substituir o fluxo de sucesso com API real.

## Riscos e decisões pendentes

- Spec, plano e tasks aprovados; implementação concluída e verificações registradas em `tasks.md`.
- O nome exibido Developer não é o identificador estrutural do perfil; condições por nome ou por ausência de permissão poderiam aplicar o fluxo a perfis errados. Centralizar a verificação pelo código `USUARIO_PADRAO` no contexto apropriado.
- As permissões dos perfis podem ser alteradas pelo administrador. Sem consulta a Test Cases, apresentar acesso negado e não interpretar o 403 como ausência de associações.
- O dropdown atual limita a consulta a 100 projetos. A paginação de opções deve ter tratamento de erro próprio e não concluir ausência de projetos enquanto houver páginas pendentes.
- Atribuições podem mudar durante o uso. Revalidar ao entrar/trocar de projeto e após mutações locais, sem ciclos ou reaproveitamento de listas antigas de outro usuário.
- Há divergência documental pré-existente entre o ADR 0022 (10 itens) e `docs/tables-rules.md`/constante atual (20). Esta entrega reutiliza `DEFAULT_TABLE_PAGE_SIZE` sem mudar seu valor; a harmonização documental fica fora desta spec.
