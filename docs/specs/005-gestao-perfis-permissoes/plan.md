# 005. Gestão de perfis e permissões: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0006, 0009, 0018, 0020, 0031
- **ADRs novos propostos:** nenhum

## Abordagem

Manter uma tabela de perfis como tela inicial, no padrão da gestão de usuários. O menu de ações abre
a visualização ou edição das permissões num editor de largura completa. O editor
mostra identidade, permissões e uma barra de ação persistente. A criação começa como rascunho local
no mesmo editor e só cria o registro quando a pessoa confirma. A API recebe nome, descrição e a lista
completa de permissões em um único `POST`, validando o catálogo e persistindo perfil e associações
numa transação.

Os grupos visuais correspondem aos controllers/áreas responsáveis pelos recursos. O endpoint atual
de catálogo mantém metadados centralizados no backend e o frontend agrupa a resposta dinamicamente.
Grupos recolhidos mostram contagem e resumo das permissões selecionadas; a expansão revela as ações
com nomes legíveis. Edição e criação usam o mesmo padrão de rascunho, erro e confirmação. Não há
mudança na estrutura das tabelas nem no vínculo `perfil_permissoes`.

## Modelo e regras de persistência

| Dado | Origem | Regra |
|---|---|---|
| Permissao.id | Catálogo persistido | Identificador estável `controller.acao` |
| Permissao.descricao | Catálogo persistido | Texto legível da ação |
| modulo.codigo/nome/ordem | Registro central no backend | Namespace do controller, nome em português e ordem estável |
| permissao.ordem | Registro central no backend | Ordem estável dentro do controller |
| PerfilPermissao | Tabela de associação atual | Persiste o conjunto completo enviado |

Metadados de exibição não são copiados para associações. Cada permissão persistida precisa estar
registrada no catálogo central. Um controller novo recebe nome e ordem no mesmo registro. Nenhuma
enumeração paralela de controllers será mantida no frontend.

O POST valida que todos os IDs de permissão existem antes de gravar. A criação do perfil e a inclusão
dos vínculos usam a mesma transação; erro de validação, conflito ou persistência não pode deixar um
perfil incompleto. Nome duplicado é verificado dentro da unidade e retorna `409`. O PUT de edição
continua substituindo o conjunto inteiro e incrementando `auth_version` dos usuários vinculados.

## Catálogo inicial

| Controller | Permissões existentes |
|---|---|
| Usuários (`usuarios`) | `usuarios.consultar`, `usuarios.gerenciar` |
| Perfis (`perfis`) | `perfis.gerenciar` |
| Setores (`setores`) | `setores.consultar`, `setores.gerenciar` |
| Times (`times`) | `times.consultar`, `times.criar`, `times.gerenciar` |

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/perfis` | — | Perfis da unidade com códigos e permissões | 401, 403 |
| GET | `/api/perfis/permissoes` | — | Catálogo com `id`, `descricao`, `modulo { codigo, nome, ordem }` e `ordem` | 401, 403, erro explícito de configuração se faltar metadado |
| POST | `/api/perfis` | `{ nome, descricao?, permissoes: string[] }` | 201 com perfil e permissões criados atomicamente | 401, 403, 409, 422 |
| PUT | `/api/perfis/{id}/permissoes` | `{ permissoes: string[] }` | 200 com perfil atualizado | 401, 403, 404, 409, 422 |

O campo `permissoes` no POST aceita lista vazia para criar intencionalmente um perfil sem acessos.
Ausência do campo também é normalizada para lista vazia, se essa for a convenção escolhida no schema.
`id` e `descricao` do catálogo permanecem disponíveis; os metadados ampliam o contrato atual.

## Backend: arquivos e responsabilidades

- `backend/src/application/catalogos/permissoes.py` — registro de controllers, permissões e ordem.
- `backend/src/application/schemas/perfil.py` — schema de criação com permissões e schema tipado do catálogo.
- `backend/src/api/routers/perfis.py` — catálogo, POST atômico, edição, autorização e isolamento por unidade.
- Modelos e migrations — sem mudanças esperadas.
- `backend/tests/functional/test_perfis_api.py` — catálogo, criação vazia/com permissões, rollback lógico,
  conflito, permissão inválida, perfil protegido, autorização e isolamento por unidade.

## Frontend: arquivos e responsabilidades

- `frontend/src/modules/perfis/PerfisPage.tsx` — editor único com modos criar/editar/consulta.
- Componentes do módulo `perfis` — tabela e menu de ações, grupo expansível, resumo,
  seleção total/parcial, itens de permissão e barra de ações.
- `frontend/src/modules/perfis/api/perfis.api.ts` — request de criação recebe a lista completa.
- `frontend/src/shared/ui/` — reutilizar botão, diálogo e controles acessíveis; compartilhar componentes
  apenas se outras telas tiverem o mesmo padrão.
- Testes de componente e E2E — criação atômica do ponto de vista do fluxo, rascunhos, erro 409,
  perfis protegidos, teclado e viewport estreito.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01, CA-02 | API/componente | Visibilidade dos perfis da unidade e renderização de controller desconhecido a partir dos metadados |
| CA-03 a CA-05 | Componente | Grupo fechado com resumo; checkbox individual; seleção vazia, parcial e completa |
| CA-06, CA-07, CA-11 | Componente/E2E | Estados limpo/alterado, salvar, preservar erro, confirmação ao sair/trocar |
| CA-08 a CA-10 | API/componente | Criar perfil com conjunto completo; conflito ou ID inválido sem registro parcial; campos preservados |
| CA-12, CA-13 | Funcional/componente | Administrador edita permissões de perfis seedados; autorização e isolamento por unidade |
| CA-14 | E2E | Navegação por teclado e viewport estreito sem overflow horizontal |
| CA-15 | Componente | Menu da tabela oferece visualização e edição de permissões para todos os perfis |

## Riscos e decisões

- O POST muda de contrato ao receber `permissoes`; manter clientes antigos compatíveis requer valor
  padrão vazio para o campo.
- O estado de criação não existe no backend até o envio final; sair e descartar esse estado não exige
  compensação nem deixa registro incompleto.
- A lista resumida do grupo usa nomes legíveis existentes no catálogo. Se as descrições atuais não
  forem suficientes para diferenciar ações, atualizar o texto do catálogo no backend, não criar
  rótulos divergentes no frontend.
- Metadado desconhecido deve falhar claramente e ser observado como erro de configuração; não pode
  ser omitido ou agrupado num grupo genérico.
