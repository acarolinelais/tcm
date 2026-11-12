# Specs

Cada feature fica em `NNN-nome-em-kebab-case/`, com três documentos revisados em ordem (ADR 0002):

| Arquivo | Pergunta | Regra |
|---|---|---|
| `spec.md` | O quê? Por quê? | Sem tecnologia. Critérios de aceite testáveis (`CA-xx`), incluindo os de falha. |
| `plan.md` | Como? | Segue os ADRs. Decisão nova exige um ADR novo. |
| `tasks.md` | Em que passos? | Tasks de até ~30 min, cada uma com o comando de verificação. |

Para criar: skill `spec`. Para implementar: skill `implement-task`. Templates em [`_templates/`](_templates/).

**Status de uma spec:** `Rascunho` → `Aprovada` → `Em andamento` → `Concluída`.

## Padrão universal de tabelas

Toda tabela nova ou existente usa o `DataTable` de `shared/ui/data-table.tsx` (sobre o `Table` do HeroUI,
[ADR 0037](../adr/0037-heroui-como-base-de-ui.md)) e segue a mesma composição visual: o estado de
carregando, erro ou vazio vem de `estadoDaTabela`, os filtros de coluna de `DataTableFilter`, e a
`DataTablePagination` fica ao final, com 20 itens por página como padrão ([ADR 0034](../adr/0034-paginacao-padrao-vinte-itens.md)). O conteúdo
das colunas e os filtros dependem do domínio, mas a estrutura, espaçamento, estados de carregamento/vazio
e paginação são comuns a todas as tabelas. A coluna de ações não recebe filtro. Exceções visuais devem
ser registradas em ADR antes de serem introduzidas. Não há exceção à paginação: a tela Resultados Gerais, antes
sem paginação, também pagina ([ADR 0039](../adr/0039-resultados-gerais-com-paginacao.md)).

## Roadmap
| # | Spec | Status |
|---|---|---|
| 001 | Fundação: esqueleto executável (API FastAPI, app React, Postgres) | Aprovada |
| 002 | Multi-tenancy e autenticação (hierarquia Unidade/Setor/Time, login JWT, RBAC) | Aprovada |
| 003 | Perfis, permissões e ciclo de vida do JWT | Implementada (validação pendente) |
| 004 | Listagem filtrável de usuários e padronização de tabela | Concluída |
| 005 | Gestão de perfis e permissões por módulo | Aprovada |
| 006 | Administração da unidade (usuários, setores, gerentes e times) | Concluída |
| 007 | Internacionalização do frontend (inglês, português e coreano) | Concluída |
| 008 | Perfil de conta KP e permissões adicionais | Em andamento |
| 009 | Fluxo de branches (`main` + `dev` + hotfix), hooks e CI | Concluída |
| 010 | Modo mock persistido do frontend | Concluída |
| 011 | Projetos e Test Cases | Concluída |
| 012 | Perfil Dev em Projetos e Test Cases | Concluída |
| 012 | Identificador externo de usuário | Concluída |
| 013 | Seed organizacional SVP | Concluída |
| 014 | Catálogo de modelos de dispositivo (descrição, gestão pelo KP, item no sidebar) | Concluída |
| 015 | Descrição do modelo no seletor de projetos | Concluída |
| 016 | Upload da planilha no padrão do Figma (progresso, remover com Desfazer, prévia) | Concluída |
| 017 | Status In Validation do Test Case | Concluída |
| 018 | Form Factor em matriz por modelo (uma linha por Test Case, coluna por modelo, filtro Assignee) | Concluída |
| 019 | Escopo do gerente inclui os times em que participa (ADR 0036) | Concluída |
| 020 | Histórico e lançamento de resultados Form Factor | Concluída |
| 021 | Resultados gerais de Form Factor | Concluída |
| 022 | Redesign HeroUI de Projects e Teams (perfil dev e padrão de tabela) | Concluída (e2e com API real pendentes) |
| 022 | Resultados Form Factor por rodada (SDF ID, Status `Done`/`Cancelled`) | Concluída |
| 023 | Ciclo de Status do Test Case com PR e correções (`In Fixes`, `Excluded`) | Concluída |
| 025 | SDF ID único por rodada no projeto | Concluída |
| 026 | Justificativa ao excluir um Test Case | Concluída |
| 027 | Automation Level do Test Case (planilha, banco, API e tabela) | Concluída (e2e simulados; validação manual no navegador pendente) |
| 028 | Detalhes do Test Case (Title, Precondition, Procedure e Expected Result no painel lateral) | Concluída (e2e simulados; validação manual no navegador pendente) |
| 029 | Avatar do usuário logado na barra superior (HeroUI Avatar, iniciais) | Aprovada |
| 030 | Links de PR do Test Case (histórico no painel de detalhes) e painel em todas as tabelas de projetos | Concluída (e2e simulados; validação manual no navegador pendente) |
| 031 | Painéis laterais e listas de seleção no padrão HeroUI (Setores, Usuários, Modelos e Projetos) | Em andamento (9 e2e com API real pendentes) |
| 032 | Resultados Gerais por projeto, com histórico de execuções por data (abas, Form Factor por linha, ADR 0038) | Aprovada |
| 033 | Paginação na tela Resultados Gerais (ADR 0039, substitui o 0038) | Concluída (e2e simulados; validação manual no navegador pendente) |
| 034 | Tema claro e escuro (toggle no navbar e no login, escolha no navegador, ADRs 0040 e 0041) | Concluída |
| 035 | Exportar tabelas para Excel (página atual ou todos os itens, com filtros, botão no rodapé, ADR 0042) | Concluída (e2e com API real pendentes) |
| 036 | Cor do avatar nas Configurações (paleta de 8 cores, azul padrão, salva na conta, ADR 0043) | Concluída |
| 037 | Kanban do projeto e Board por setor e time (Kanban só pelo Board desde 2026-10-30) | Concluída |
| 038 | Histórico de alterações do Test Case por triggers no banco (todos os campos e PRs, com autor, origem e data; ADR 0044) | Em andamento |
| 039 | Overview com dados reais no escopo do perfil (desempenho mensal pela auditoria da 038) | Concluída |
| 040 | Página do Test Case com endereço próprio e edição dos textos | Rascunho |
| 041 | Busca global na barra superior (Test Cases, projetos e pessoas) | Rascunho |
| 042 | Troca da própria senha e redefinição pelo administrador (volta à senha padrão) | Concluída (code-review e security-review pendentes) |
| 043 | Ações em lote na lista de Test Cases (Status, responsável e Backup) | Rascunho |
| 044 | Comentários no Test Case | Rascunho |
| 045 | Evidências anexadas ao Test Case (exige ADR de armazenamento) | Rascunho |
| 046 | Notificações dentro do sistema (depende das 038, 040 e 044) | Rascunho |
| 047 | Corrigir rodadas e resultados de Form Factor | Rascunho |
| 048 | Documentação de uso dentro do sistema (guias por tarefa, destaque por perfil, slides em PDF para download) | Concluída |
| 049 | Transição suave ao trocar o tema (cores da tela mudam juntas e aos poucos, ícone do toggle anima) | Concluída |
| 050 | Ajustes visuais: tema escuro do protótipo, Navbar sem sobreposição, fim do shadcn, calendário e Sidebar | Em andamento (e2e com API real pendentes) |
| 051 | Estilização da tela de redefinição de senha (visual do login, olho, idioma, tema e sair; HeroUI) | Concluída |
| 052 | Tela de auditoria (Administration, só admin da unidade, filtros, detalhe e exportação; depende da 038) | Concluída |
| 053 | Seletor de projeto com busca na General Results (no lugar das abas por projeto) | Aprovada |
| 054 | Timeline dos Test Cases por projeto (Dia, Semana e Mês, filtros por pessoa e caso, sobre a auditoria da 038) | Concluída (e2e com API simulada) |
| 055 | Fundação visual do redesign (tokens claros, logotipo, sidebars, login, título azul, estado vazio e tabelas sem total, ADR 0045) | Concluída (e2e com API real pendentes; validação manual no navegador pendente) |
| 056 | Redesign do Board (cabeçalho com avatares, botão Filter, colunas e cards do protótipo) | Concluída (e2e com API simulada; validação manual no navegador pendente) |
| 057 | Redesign da Timeline (título azul, botão Filter, cabeçalho da grade, fundo quadriculado e cards do protótipo) | Concluída (e2e com API simulada; validação manual no navegador pendente) |
| 058 | Redesign de Projects (visual das abas, Origin "Spreadsheet" e histórico de execuções por linha, inclusive para o dev) | Concluída (e2e com API simulada; validação manual no navegador pendente) |
| 059 | Redesign da General Results (dev no escopo do time, abas por app, botões de rodada e importação, linha que expande por device, 5 datas, ADR 0046) | Em andamento (integração do backend e conferência no navegador pendentes) |
| 060 | Importação do relatório SDF no formato novo (SDF ID no nome do arquivo, device e data no cabeçalho, descrição no resultado) | Em andamento (integração do backend pendente) |
| 061 | Sessão entre abas (refresh token em cookie httpOnly, sessão de 10 horas, ADRs 0047 e 0048) | Concluída |
| 062 | Esconder a prévia da planilha na importação (botão Hide preview / Show preview) | Concluída (validação manual no navegador pendente) |
| 063 | Overview com gráficos para KP e dev (burndown, Pass Rate, entregas por dia e semana; Recharts, ADR 0051) | Em andamento (integração do backend e ajuste visual pelo protótipo pendentes) |
| 064 | Overview com gráficos para gerente e admin (andamento por time e por setor, retrabalho, finalizados por semana) | Em andamento (integração do backend pendente) |
| 065 | Datas de finalização do Test Case (Code done na primeira entrada em In Review; End date passa a ser a data em que todos os devices passam no SDF) | Concluída (caso Cancelled e End date no modo mock em aberto no backlog) |
| 066 | Status do Test Case pela importação do relatório SDF (só um caso em In Validation muda: tudo PASS vai para Done, FAIL vai para In Fixes) | Em andamento |
| 067 | Desfazer a última importação do relatório SDF (resultados saem, Status volta a In Validation se ninguém mexeu, SDF ID fica livre) | Concluída (validação manual no navegador pendente) |
| 068 | Aba Form Factor com a visão da General Results (sem Results/Summary; dev vê só os casos dele, gestão vê todos) | Concluída (validação manual no navegador pendente) |
| 069 | Projetos encerrados fora do Board, da Timeline e da General Results (filtro para exibir) e conclusão só com todos os Test Cases em Done ou Cancelled | Concluída (validação manual no navegador pendente) |
| 070 | Bug Reports (falhas em aberto do SDF por caso e device, com motivo; KP troca o responsável pela linha) | Concluída (validação manual no navegador pendente) |
| 071 | Data planejada do projeto (editada no projeto; o burndown planeja até ela e mostra a meta diária; sai a meta fixa de 2 por dia) | Concluída (validação manual no navegador pendente) |
| 072 | SDF Failures (Bug Reports renomeada: toda falha do SDF fica até a correção, uma linha por caso com as falhas; Dev Fix escolhido pelo KP; N/A e Check fecham o caso em Done) | Concluída (validação manual no navegador pendente) |
| 073 | Aba My Fixes e fluxo de correção (corretor pelo Dev Fix, tentativas com selo e filtro Reincidentes na SDF Failures) | Concluída (integração do backend no CI; e2e com API simulada) |
| 074 | Padronização da interface (Overview vazia com título, Teams e Users do KP em Administration, glossário de termos em inglês e nomes dos idiomas; ADRs 0054 e 0055) | Concluída (e2e da Overview com API real pendente) |
| 075 | End date e Planned date nos Test Cases (Planned date do projeto pela planilha; Code done vira End date; sai a data de todos os devices passaram) | Concluída (integração do backend no CI; e2e de importação com API simulada) |

> As duas specs 012 foram criadas em paralelo. Os diretórios e históricos foram preservados nesta integração; a harmonização da numeração está registrada no backlog da spec de perfil Dev.

> O repositório tem a governança (ADRs, skills, templates) pronta. A spec `001-fundacao` cria a
> infraestrutura comum dos dois lados e a primeira entidade de referência. As demais specs de contexto
> entram depois.
