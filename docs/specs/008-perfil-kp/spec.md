# 008. Perfil de conta KP: Spec

- **Status:** Em andamento
- **Data:** 2026-10-23
- **ADRs relacionados:** 0018, 0020, 0021, 0026, 0031

## Problema

O papel KP era armazenado separadamente em cada vínculo de time, além do perfil da conta. Com o
perfil de sistema KP, manter as duas fontes de verdade cria uma escolha duplicada e pode deixar o
acesso da pessoa inconsistente entre times dos quais ela participa.

## Objetivo

Usar o perfil da conta para determinar se a pessoa exerce a função KP. Uma conta com perfil KP terá
essa capacidade em todos os times dos quais for membro ativo. A associação ao time continua limitando
o escopo: o perfil KP, sozinho, não dá acesso a times dos quais a pessoa não participa.

Nesta entrega o perfil KP herda as permissões de `USUARIO_PADRAO`. Permissões para gerenciar
atividades e tarefas serão adicionadas junto com os módulos correspondentes.

## Histórias de usuário

- Como **administrador da unidade**, quero atribuir o perfil KP ao criar ou editar uma conta.
- Como **gerente**, quero atribuir KP a uma conta sob minha responsabilidade no cadastro ou edição.
- Como **KP**, quero gerenciar atividades e tarefas em todos os times de que sou membro.
- Como **membro de times**, quero que minha participação em um time delimite meu acesso, sem precisar
  de uma segunda seleção de papel KP no vínculo.

## Regras de negócio

- RN-01: Cada unidade possui um perfil de sistema `KP` reutilizável. Nome, descrição e código são
  mantidos pelo sistema; as permissões podem ser ajustadas por quem possui `perfis.gerenciar`, conforme
  ADR 0031. O perfil pode ser atribuído a várias contas.
- RN-02: O perfil `KP` inclui as permissões de `USUARIO_PADRAO`. Permissões de atividades e tarefas
  serão acrescentadas nas specs desses módulos, quando as ações e códigos forem definidos.
- RN-03: O perfil de conta `KP` e a participação em times são dimensões distintas. Atribuir KP não
  cria participação em time; cada participação ativa define um time em que a conta pode atuar.
- RN-04: Uma conta com perfil KP pode exercer as permissões próprias de KP em todos os times em que
  possui participação ativa. Não há papel adicional KP/DEV no vínculo de time.
- RN-05: Uma conta KP sem participação ativa em um time não pode consultar nem gerenciar atividades
  daquele time. A conta não pode acessar times de outra unidade.
- RN-06: Em times com participação ativa, KP pode consultar e editar atividades/tarefas, criar novas
  e atribuir ou transferir itens entre membros do mesmo time, conforme a matriz detalhada na spec
  desses módulos.
- RN-07: O perfil KP não concede permissões administrativas sobre usuários, setores, perfis ou
  composição dos times. Essas ações continuam dependendo das permissões e escopos próprios.
- RN-08: Alterar o perfil da conta invalida sessões anteriores conforme o mecanismo existente.
  Remover ou inativar a participação em um time revoga imediatamente o acesso da pessoa àquele time.
- RN-09: O administrador pode atribuir KP a qualquer usuário da unidade no cadastro ou edição. O
  gerente pode escolher entre `USUARIO_PADRAO` e KP no cadastro e na edição somente de usuários sob
  sua responsabilidade. O gerente não pode atribuir outros perfis nem alterar o responsável.
- RN-10: O nome de exibição do perfil KP é traduzido para inglês, português e coreano. A tradução não
  altera o código estável `KP` nem nomes de perfis personalizados.
- RN-11: O gerente pode visualizar o nome e o código do perfil atribuído às contas dentro do escopo
  que já pode consultar. Essa leitura não libera o catálogo completo de permissões nem a administração
  de perfis; as opções de atribuição continuam limitadas a KP e `USUARIO_PADRAO`.

## Critérios de aceite

- **CA-01:** Dado um administrador criando ou editando usuário, quando seleciona KP, então a conta é
  salva com esse perfil e sessões anteriores deixam de autorizar operações.
- **CA-02:** Dado um gerente criando ou editando usuário sob sua responsabilidade, quando seleciona
  KP ou `USUARIO_PADRAO`, então a conta é salva mantendo o gerente como responsável; outros perfis
  são recusados.
- **CA-03:** Dado o perfil de sistema KP, quando uma pessoa autorizada o consulta na tela de perfis,
  então pode ajustar suas permissões; nome, descrição e código permanecem mantidos pelo sistema e
  tentativas sem permissão ou fora da unidade são recusadas.
- **CA-04:** Dada uma conta com perfil KP e participação ativa nos times A e B, quando os módulos de
  atividades/tarefas estiverem disponíveis, então pode executar as ações de KP nos dois times.
- **CA-05:** Dada uma conta KP sem participação ativa no time C, quando tenta consultar ou gerenciar
  atividades/tarefas de C, então a API recusa sem persistir alterações.
- **CA-06:** Dado que uma participação em time é removida ou inativada, quando a alteração é salva,
  então o acesso KP àquele time é revogado sem aguardar novo login.
- **CA-07:** Dado uma tentativa de atribuir KP ou consultar time fora da unidade autenticada, quando
  a API processa a solicitação, então recusa sem revelar ou alterar dados de outra unidade.
- **CA-08:** Dado uma tela em inglês, português ou coreano, quando o perfil KP aparece, então o nome
  está no idioma selecionado e o código permanece estável.
- **CA-09:** Dada uma conta KP que participa de vários times, quando consulta a área de times, então
  vê somente os times em que possui participação ativa.
- **CA-10:** Dado um gerente atribuindo ou removendo KP, quando o usuário está sob sua
  responsabilidade, então pode escolher KP ou `USUARIO_PADRAO`; para usuário fora desse escopo ou
  para qualquer outro perfil, o backend recusa a operação.
- **CA-11:** Dado um gerente consultando usuários dentro do seu escopo, quando a lista é exibida,
  então vê o nome do perfil atualmente atribuído sem acessar o catálogo de permissões ou alterar
  perfis que não pode atribuir.

## Fora de escopo

- Implementar entidades, telas e endpoints de atividades ou tarefas; seus contratos e a matriz de
  ações serão definidos nas specs desses módulos.
- Alterar a associação de pessoas aos times ou permitir que KP gerencie composição de time.
- Conceder ao KP permissões de administração de unidade, setor, usuário, perfil ou time.
- Limitar a quantidade de contas KP por unidade, setor ou time.

## Decisões confirmadas

- KP é um perfil de conta reutilizável por unidade, separado da participação da conta em times.
- O perfil KP atribui capacidade de KP a todos os times em que a conta é membro ativo.
- A participação no time define o escopo; não há seleção de papel KP/DEV dentro do time.
- Administradores atribuem KP a qualquer conta da unidade; gerentes atribuem KP ou padrão apenas a
  contas sob sua responsabilidade, inclusive no cadastro.
- Nesta entrega, o perfil herda as permissões de `USUARIO_PADRAO`; permissões de atividades e tarefas
  serão adicionadas junto com esses módulos, sem códigos provisórios.
