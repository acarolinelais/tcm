# 022. Resultados Form Factor por rodada: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0013, 0015, 0018, 0020, 0021, 0022, 0026, 0030, 0031, 0034, 0036
- **ADRs novos propostos:** nenhum

## Abordagem

Form Factor exibe os TCs que estão atualmente em `In Validation` como elegíveis para a próxima
rodada. Criar uma rodada captura o SDF ID opcional e todos esses TCs naquele momento; a rodada ganha
um identificador próprio, independente do SDF ID.
Cada TC da seleção tem uma execução de rodada no histórico desde o início, mesmo que ainda não tenha
resultados. Admin, gerente e KP no escopo podem criar rodadas e lançar resultados para qualquer TC
incluído; um DEV pode registrar os resultados dos TCs da rodada em que seja responsável principal ou
Backup. Ao salvar resultados, qualquer `FAIL` leva o TC para `InReview`; somente `PASS` em todos os
modelos do projeto leva para `Done`. Se houver modelos vazios e nenhum `FAIL`, o TC permanece em
`InValidation`. O envio de resultados é por TC e atômico para o conjunto de modelos preenchidos,
incluindo a mudança de Status, o que permite que o DEV lance seus casos depois que a gestão preparou
a rodada. A importação SDF por planilha segue separada e permanece restrita a Admin, gerente e KP no
escopo.

**Interpretação para resolver o salvamento da rodada:** “salvar inteira” significa salvar a criação
da rodada e seu conjunto de TCs de uma vez; resultados são enviados depois, por TC, em um único envio
com todos os modelos preenchidos para aquele TC. Assim, resultados de um TC ainda não lançado ficam
vazios no histórico, sem tornar a rodada inteira indisponível aos demais DEV.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `RodadaFormFactor` (nova) | unidade, projeto, criada_por | IDs | Rodada interna, com identidade independente do SDF ID; criada por Admin, gerente ou KP autorizado no escopo |
| `RodadaFormFactor` | `sdf_id` | string opcional, máximo 50 | Valor livre, aceita espaços e caracteres especiais; imutável após a criação da rodada |
| `RodadaFormFactor` | `created_at` | timestamp | Identifica cronologicamente rodadas mesmo quando o SDF ID está vazio ou repetido |
| `ExecucaoSdf` | `rodada_id` | UUID opcional | Liga cada execução manual da rodada à rodada; execução por TC é criada para toda a seleção `In Validation`, inicialmente sem resultados |
| `ResultadoFormFactor` | execução, modelo, resultado | relações existentes | Cada TC recebe um envio atômico com resultados PASS/FAIL para zero ou mais modelos associados; envio já registrado é imutável |
| `CasoTeste.status` | enum ampliado | Status | Acrescentar `Done` e `Cancelled`; após resultado `FAIL`, atualizar para `InReview`; atualizar para `Done` somente com `PASS` em todos os modelos; resultados parciais sem `FAIL` mantêm `InValidation`; permitir voltar de `InReview` para `InValidation` após correção |
| `PerfilPermissao` | `form_factor.registrar` | permissão nova | Concede a capacidade de iniciar rodadas ou registrar resultados, sempre limitada por papel, escopo e atribuição do TC |

Execuções existentes de origem MANUAL, anteriores à spec, continuam sem `rodada_id` e permanecem
visíveis no histórico. Execuções importadas por planilha continuam ligadas a `ImportacaoSdf`, sem
serem convertidas em rodadas manuais. As consultas do Resumo e Results passam a incluir a identidade
da rodada e o SDF ID herdado dela para execuções manuais novas.

## Contrato da API

Todas as rotas filtram unidade e projeto no service. Listagens da rodada são paginadas; não há limite
de TCs por rodada, mas cada página respeita o máximo universal de 100 itens.

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/projetos/{id}/form-factor` | filtros existentes | 200 Resumo com resultados mais recentes, TCs elegíveis em `In Validation` e SDF ID/rodada quando disponíveis | 401, 403, 404, 422 |
| POST | `/api/projetos/{id}/form-factor/rodadas` | `{ sdf_id?: string \| null }` | 201 rodada + total de TCs capturados; cria a rodada e suas execuções sem resultados | 401, 403, 404, 409 se nenhum TC elegível, 422 se SDF ID exceder 50 caracteres |
| GET | `/api/projetos/{id}/form-factor/rodadas/{rodada_id}/test-cases` | `page`, `page_size` | 200 `PagedResult` com TC, responsável, backup, resultados preenchidos e modelos vazios | 401, 403, 404, 422 |
| POST | `/api/projetos/{id}/form-factor/rodadas/{rodada_id}/test-cases/{caso_id}/resultados` | `{ resultados: { modelo_id: PASS \| FAIL } }` | 201 execução atualizada com mapa de resultados e identidade/SDF ID da rodada | 401, 403, 404, 409 se resultados desse TC já foram enviados, 422 se resultado/modelo inválido |
| GET | `/api/projetos/{id}/form-factor/results` | filtros existentes | 200 histórico com todas as linhas da rodada, inclusive TCs sem resultados | 401, 403, 404, 422 |
| POST | `/api/projetos/{id}/relatorios-sdf` | multipart `arquivo` | 201 importação existente, permitida somente a Admin/gerente/KP no escopo | 401, 403, 404, 409, 422 |

O catálogo de perfis acrescenta `form_factor.registrar` à permissão de entrada manual. `form_factor.importar`
continua dedicada à importação de arquivos. A rota de planilha também valida o código do perfil, então
um perfil personalizado que receba `form_factor.importar` não ganha essa operação.

## Backend: arquivos

- `domain/entities/rodada_form_factor.py` e sua interface de repositório — entidade do lote, ID
  interno, SDF ID opcional e criação no escopo do projeto.
- `domain/entities/execucao_sdf.py` e `domain/queries/form_factor_linha.py` — vínculo da execução à
  rodada e exposição do ID/SDF ID, preservando importações e registros manuais antigos.
- `domain/entities/caso_teste.py` e serviços de Test Case/Form Factor — acrescentar os Status `Done`
  e `Cancelled`; aplicar transições `To-Do` → `InProgress` → `InValidation`, `InReview` →
  `InValidation` após correção, `FAIL` → `InReview` e aprovação → `Done`; salvar resultados e Status
  atomicamente; permitir cancelamento pelo DEV atribuído e pela gestão autorizada no escopo.
- `infrastructure/data/models/rodada_form_factor_model.py`, `execucao_sdf_model.py`, migration e
  `models/__init__.py` — persistência do lote, vínculo execução/rodada e unicidade de um TC por rodada.
- `infrastructure/repositories/rodada_form_factor_repository.py`, `execucao_sdf_repository.py` e
  `resultado_form_factor_repository.py` — criação da seleção completa, paginação dos TCs da rodada,
  submissão dos resultados e projeções do histórico.
- `application/catalogos/permissoes.py` e migration — adicionar `form_factor.registrar`, seed para
  Admin/Gerente/KP e `USUARIO_PADRAO`, sem conceder `form_factor.importar` a DEV.
- `application/schemas/form_factor.py` e schemas de rodada — request/response do lote, SDF ID com
  limite de 50, resultados opcionais por modelo e ID da rodada nas linhas históricas.
- `application/services/form_factor_service.py` e interface — criação da rodada por gestores,
  listagem dos TCs capturados e gravação autorizada de resultados por TC.
- `application/services/importacao_sdf_service.py` — restringir a importação por planilha a Admin,
  gerente ou KP com permissão e escopo.
- `api/routers/projetos.py`, `api/dependencies.py` e composição de serviços — novas rotas de rodada e
  injeção de dependência.
- Testes unitários de entidade/service, integração de repositórios/migration e funcionais de API:
  snapshot `In Validation`, SDF ID opcional/livre/limite, inclusão de TCs vazios, histórico após troca
  de Status, upload permitido/negado, permissão por principal/Backup, escopo e isolamento por unidade.

## Frontend: arquivos

- `modules/projetos/model/projeto.ts`, `api/projetos.api.ts`, `hooks/useProjetos.ts` — contratos,
  chamadas para criar rodada/listar TCs/enviar resultados e invalidação das consultas afetadas.
- Novo componente de criação de rodada — entrada opcional do SDF ID e confirmação do total de TCs
  `In Validation` que será capturado.
- Novo componente de TCs da rodada — lista paginada, resultados por modelo e envio independente por
  TC, habilitado apenas para gestor no escopo ou DEV responsável principal/Backup.
- `ProjetoDetalhePage.tsx`, `FormFactorResultadosTabela.tsx` e `FormFactorTabela.tsx` — acesso ao fluxo
  de rodada, histórico com SDF ID/ID interno e importação por planilha somente para Admin/Gerente/KP.
- `core/mock/database.ts` e `database.test.ts` — schema mock para rodadas, TCs capturados, autorização
  por função/atribuição e histórico consistente.
- `core/i18n/resources.ts` — textos de rodada, SDF ID, resultados pendentes, erros e permissões em
  inglês, português e coreano.
- `model/projeto.ts`, tabela de Test Cases e badges — exibir `Done`/`Cancelled`, atualizar Status
  após o lançamento do resultado e permitir que o DEV atribuído cancele o TC.
- Testes de API/hook/componente para papéis, escopo, campos vazios, limite de 50 caracteres, lotes
  acima de 20 TCs, SDF ID vazio e histórico preservado.
- E2E cobrindo Admin/Manager/KP criando rodada e importando planilha, DEV lançando resultado do TC
  principal e do Backup, negação para TC alheio e consulta de duas rodadas do mesmo TC.

**Correção do Resumo (RN-12):** cada TC tem um corte, que é a `data_reportada` da execução da sua rodada
mais recente (a execução da rodada nasce com a data de criação da rodada). Em
`listar_form_factor_por_projeto`, a subconsulta `resultados_validos` passa a ignorar execuções anteriores a
esse corte. Assim, as células, a data, o SDF ID e os filtros por SDF/modelo/resultado usam a mesma base. TCs
que nunca participaram de rodada não têm corte e mantêm o comportamento anterior (último resultado por
modelo). O mock (`core/mock/database.ts`, `formFactor.listar`) aplica o mesmo corte.

**Rodada atual (RN-13):** a rodada pendente do Resumo passa a ser a execução de rodada mais recente do TC
(mesma chave do corte, `data_reportada`), e só conta como pendente se ainda não tiver resultados. Não há
migration: as execuções antigas sem resultado continuam como estão e deixam de ser oferecidas. O service
`registrar_resultados_rodada` consulta a rodada mais recente do caso (`ExecucaoSdfRepository`) e recusa com
`ConflictException` o registro em outra rodada. O mock faz o mesmo em `listar` e `registrarResultadosRodada`.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01, CA-07 | Integração/funcional | Rodada captura todos os TCs com Status `In Validation`, sem truncar por paginação, e não captura outros Status |
| CA-02, CA-08 | Unidade/funcional | SDF ID aceita vazio, espaços e caracteres especiais até 50; excedente não persiste rodada |
| CA-03, CA-09, CA-10, CA-12 | Funcional/E2E | Admin/Gerente/KP criam e registram no escopo; DEV principal/Backup registra só TC atribuído; DEV/perfil custom não importa planilha |
| CA-04, CA-11 | Funcional/integração | Resultados por TC/modelo são atômicos; campo vazio e TC sem resultados ficam no histórico; resultado inválido não grava parcial |
| CA-05, CA-06 | Integração/E2E | Segunda rodada não apaga a primeira; TCs fora de `In Validation` continuam consultáveis no histórico |
| CA-13 a CA-18 | Domínio/funcional/E2E | Fluxo de Status, transições automáticas após resultados, resultados parciais, retorno para validação e cancelamento autorizado |
| CA-19, CA-20 | Integração/unidade (mock) | Nova rodada esvazia as colunas do Resumo; registro parcial não traz de volta resultados da rodada anterior; filtro por resultado ignora rodadas anteriores; histórico preservado |
| CA-21, CA-22 | Integração/unidade/mock | Rodada pendente do Resumo é a mais recente do TC; registro em rodada anterior é recusado sem gravar |

## Riscos e decisões pendentes

- A spec anterior dizia que a rodada seria salva inteira; o fluxo agora cria primeiro o cabeçalho e a
  seleção de TCs, e cada DEV envia os resultados do próprio TC depois. Este plano interpreta “inteira”
  como a seleção da rodada criada em uma operação e o mapa de resultados de cada TC salvo atomicamente.
- A rodada captura o conjunto de TCs elegíveis no momento da criação. Alterações posteriores de Status
  não alteram essa seleção nem removem resultados do histórico.
- Resultados enviados uma vez são imutáveis conforme o escopo da spec 020. Se houver erro de digitação,
  a spec não define correção/reabertura; o usuário precisará de nova rodada até uma decisão futura.
- A spec não define o que fazer ao iniciar uma rodada quando nenhum TC está `In Validation`; o endpoint
  retorna conflito sem criar uma rodada vazia.
- O catálogo existente de Status de TC ainda não inclui `Done` e `Cancelled`; a implementação precisa
  ampliar enum, validação de banco, API e labels da interface. Resultados parciais sem `FAIL` mantêm
  `InValidation`; o DEV só pode cancelar TCs atribuídos a ele.
- As permissões da tela de resultados são complementares; a API revalida perfil, unidade, escopo e
  vínculo ativo do responsável/Backup antes de aceitar cada envio.
