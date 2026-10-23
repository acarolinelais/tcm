# 008. Perfil de conta KP: Spec

- **Status:** Em andamento
- **Data:** 2026-10-23
- **ADRs relacionados:** 0018, 0020, 0021

## Problema

O papel KP existe somente no vínculo da pessoa com cada time (`TimeMembro.papel`). A conta continua
com as permissões do perfil `USUARIO_PADRAO`, apesar de KP precisar gerenciar atividades e tarefas.
Ao mesmo tempo, um perfil global sozinho não identifica em qual time a pessoa exerce essa função.

## Objetivo

Criar um perfil de sistema KP reutilizável, que o administrador pode atribuir às contas da unidade e
o gerente pode atribuir às contas sob sua responsabilidade. Nesta entrega ele herda as permissões de
`USUARIO_PADRAO`; as permissões adicionais de atividades e tarefas serão integradas junto com esses
módulos e só poderão ser usadas nos times em que a pessoa também tem o papel KP.

## Histórias de usuário

- Como **administrador da unidade**, quero atribuir o perfil KP ao criar ou editar um usuário, para
  conceder a capacidade de gerenciar atividades e tarefas.
- Como **KP**, quero gerenciar atividades e tarefas nos times em que exerço esse papel, para coordenar
  o trabalho sem obter acesso aos demais times.
- Como **pessoa membro de times diferentes**, quero que o papel de cada vínculo continue determinando
  minhas capacidades naquele time, mesmo quando minha conta tem o perfil KP.

## Regras de negócio

- RN-01: Cada unidade possui um perfil de sistema `KP` reutilizável, protegido contra edição de nome,
  descrição e permissões pela tela e pela API. O administrador pode atribuí-lo a várias contas; esse
  perfil não representa uma única pessoa KP da unidade.
- RN-02: O perfil `KP` inclui as permissões de `USUARIO_PADRAO`. As permissões adicionais para
  gerenciar atividades e tarefas serão adicionadas junto às specs desses módulos, quando as ações e
  códigos forem definidos. Até lá, o perfil não concede operações de tarefas inexistentes.
- RN-03: O perfil de conta e `TimeMembro.papel` são dimensões distintas. Atribuir o perfil `KP` não
  cria vínculo com time, não altera papel de vínculo existente e não concede acesso a todos os times.
- RN-04: As permissões adicionais de KP só podem ser exercidas em um time se a conta também possuir
  vínculo ativo naquele time com `TimeMembro.papel == KP`.
- RN-04a: Um time pode ter vários membros ativos com papel KP. Não há limite de um KP por time ou
  por setor; cada vínculo define independentemente quem exerce esse papel em cada time.
- RN-05: O perfil `KP`, sem vínculo KP ativo em um time, não concede capacidade de criar, editar,
  atribuir ou transferir atividades e tarefas naquele time. Com vínculo `DEV`, a pessoa mantém apenas
  os direitos correspondentes ao perfil e ao papel DEV.
- RN-06: Em times com vínculo KP ativo, KP pode consultar e editar as atividades/tarefas do time,
  criar novas e atribuir ou transferir itens entre membros do mesmo time, conforme a matriz detalhada
  na spec do módulo de atividades/tarefas. O acesso continua restrito à unidade da conta.
- RN-07: O perfil KP não concede permissões administrativas sobre usuários, setores, perfis ou
  composição dos times. Essas ações continuam dependendo das permissões e escopos próprios.
- RN-08: Alterar o perfil da conta invalida as sessões anteriores conforme o mecanismo de sessão
  existente. Remover o vínculo KP ou mudar seu papel também deve revogar imediatamente as permissões
  de KP daquele time.
- RN-09: O administrador pode atribuir KP a qualquer usuário da unidade no cadastro ou edição. O
  gerente pode escolher entre `USUARIO_PADRAO` e KP no cadastro e na edição somente de usuários sob
  sua responsabilidade. O gerente não pode atribuir outros perfis nem alterar o responsável.
- RN-10: O nome de exibição do perfil de sistema KP é traduzido para inglês, português e coreano. A
  tradução não altera o código estável `KP` nem nomes de perfis personalizados.

## Critérios de aceite

- **CA-01:** Dado um administrador criando ou editando um usuário, quando seleciona o perfil KP,
  então a conta é salva com esse perfil e a sessão anterior do usuário deixa de autorizar operações.
- **CA-02:** Dado um gerente criando um usuário, quando salva a conta, então pode escolher `KP` ou
  `USUARIO_PADRAO`; a conta continua vinculada ao gerente como responsável.
- **CA-03:** Dado um perfil de sistema KP, quando o administrador consulta a tela de perfis, então vê
  suas permissões em modo somente leitura; tentativa de alteração direta pela API é recusada.
- **CA-04:** Quando os endpoints de atividades ou tarefas forem implementados, uma conta com perfil KP
  sem vínculo KP no time alvo não pode gerenciar esses recursos; o backend recusa a operação sem
  persistir alterações.
- **CA-05:** Dado uma conta com perfil KP e papel KP ativo no time A, quando o módulo de atividades ou
  tarefas for implementado, então poderá executar as ações autorizadas pela matriz daquele módulo.
- **CA-06:** Quando os endpoints de atividades ou tarefas forem implementados, essa mesma conta não
  pode gerenciar recursos do time B sem vínculo KP ativo, mesmo que seja DEV ou membro de B.
- **CA-07:** Dado uma conta com perfil KP em um time e papel DEV em outro, quando executa ações, então
  cada time aplica as permissões correspondentes ao papel daquele vínculo.
- **CA-08:** Dado um administrador alterando ou removendo o papel KP de um vínculo, quando a alteração
  é salva, então as permissões de KP daquele time são revogadas sem aguardar novo login.
- **CA-09:** Dado uma tentativa de atribuir KP em operação fora da unidade autenticada, quando a API
  processa a solicitação, então recusa a operação sem revelar ou alterar dados de outra unidade.
- **CA-10:** Dado uma tela em inglês, português ou coreano, quando o perfil KP aparece em formulário,
  tabela ou visualização de perfil, então o nome está no idioma selecionado e o código continua
  estável.
- **CA-11:** Dado um time com várias pessoas em vínculos KP ativos, quando cada uma executa ações KP
  naquele time, então todas podem exercer o papel; não há limite de uma pessoa KP por time ou setor.
- **CA-12:** Dado um gerente atribuindo ou removendo KP, quando o usuário está sob sua
  responsabilidade, então pode escolher KP ou `USUARIO_PADRAO`; para usuário fora desse escopo ou
  para qualquer outro perfil, o backend recusa a operação.

## Fora de escopo

- Implementar entidades, telas e endpoints de atividades ou tarefas; os contratos funcionais e a
  matriz de ações serão definidos na spec desses módulos.
- Alterar o vínculo de usuário com time ou permitir que o perfil KP crie esses vínculos.
- Conceder ao KP permissões de administração de unidade, setor, usuário, perfil ou time.
- Limitar a uma pessoa KP por time ou por setor; vários vínculos KP ativos podem existir em cada time.

## Decisões confirmadas

- O perfil KP é um perfil de conta separado do papel KP por time.
- O perfil de sistema KP seedado por unidade é um modelo reutilizável e pode ser atribuído a várias
  contas; a quantidade e o escopo das pessoas KP são definidos pelos vínculos de time.
- Um time ou setor pode ter vários KPs; não existe regra de unicidade de pessoa KP por time ou setor.
- O administrador atribui KP no cadastro ou edição de qualquer usuário da unidade; o gerente faz isso
  no cadastro e edição apenas de usuários sob sua responsabilidade, limitado a KP e `USUARIO_PADRAO`.
- O perfil será a base das permissões adicionais para gerenciar atividades e tarefas.
- O papel KP ativo no time limita onde as permissões adicionais podem ser exercidas.
- Nesta entrega, o perfil herda as permissões de `USUARIO_PADRAO`; permissões de tarefa e sua matriz
  de ações serão adicionadas junto com os módulos de atividades e tarefas, sem códigos provisórios.
