# 006. Administração da unidade: Spec

- **Status:** Aprovada
- **Data:** 2026-10-23
- **ADRs relacionados:** 0013, 0018, 0019, 0020, 0021
- **Specs relacionadas:** 002, 003, 004, 005

## Problema

A administração da estrutura organizacional está distribuída entre operações de setores, usuários e
times, sem uma experiência que apresente como essas partes se conectam. Em especial, ainda não há um
vínculo direto entre gerente e setor. A regra atual espera que o admin associe o gerente a um time
existente, mas isso impede o fluxo em que o gerente recebe responsabilidade por um setor e cria os
times desse setor.

## Objetivo

Oferecer à pessoa administradora da unidade um espaço para organizar setores, usuários, responsáveis
e times. Permitir que gerentes atuem somente nos setores que lhes foram associados, respeitando as
permissões do perfil e o isolamento da unidade.

## Histórias de usuário

- Como **administradora da unidade**, quero acessar uma área administrativa para organizar os dados
  e as responsabilidades da minha unidade.
- Como **administradora da unidade**, quero criar setores e associar usuários responsáveis a eles,
  para delegar a criação e gestão de times.
- Como **administradora da unidade**, quero criar usuários e escolher seus perfis de acesso, para
  conceder somente as permissões adequadas.
- Como **gerente associado a um setor**, quero criar times nesse setor e administrá-los dentro do
  escopo que me foi atribuído.

## Regras de negócio

- RN-01: A área administrativa e suas operações de configuração da unidade são acessíveis apenas a
  usuários com perfil `ADMIN_UNIDADE`. A autorização é sempre validada pelo backend.
- RN-02: A administração é limitada à unidade do usuário autenticado. Nenhuma consulta, vínculo ou
  alteração pode cruzar unidades.
- RN-03: A criação de usuários permite selecionar um perfil existente e elegível. Perfil de acesso e
  responsabilidade de gerente são conceitos separados: o perfil concede permissões e a associação
  a setores define o escopo organizacional em que elas podem ser exercidas.
- RN-03a: O perfil de sistema **Gerente** é seedado, protegido contra edição e atribuível pelo
  administrador. Ele concede `times.consultar`, `times.criar` e `times.gerenciar`; a associação
  ativa a setor restringe essas permissões aos times daquele setor.
- RN-04: A administração permite criar, editar, inativar e consultar setores da unidade. Um setor
  com times ativos não pode ser inativado. Ao inativar um setor sem times ativos, as associações de
  gerentes a ele também são inativadas. Reativar o setor não reativa associações antigas; o admin
  precisa associar os gerentes novamente. Inativar não remove histórico nem times já inativos.
- RN-05: A pessoa administradora pode associar e desassociar usuários gerentes a setores da mesma
  unidade. Somente usuários ativos com perfil de sistema `GERENTE` podem receber essa associação.
  Um setor pode ter vários gerentes e um gerente pode responder por vários setores.
- RN-06: Um gerente pode criar times somente em setores aos quais está associado. A associação ao
  setor, não a atribuição direta no time, é a fonte de autorização para gerir times daquele setor.
- RN-07: O backend valida que usuário, setor, time e associação pertencem à mesma unidade e que o
  gerente tem o escopo necessário para a operação.
- RN-08: Gerentes podem administrar os times nos setores associados, incluindo a gestão de membros
  e papéis desses membros, dentro do escopo autorizado. O gerente não administra usuários, setores,
  perfis ou times de setores não associados.
- RN-09: Quando um gerente é desassociado de um setor, perde imediatamente o acesso de gestão a
  todos os times daquele setor, mesmo que o campo legado `Time.gerente_id` ainda o referencie.
- RN-10: `Time.gerente_id` identifica o responsável principal pelo time, mas não concede autorização
  por si só. A autorização de gestão decorre das permissões do perfil e da associação ativa do
  gerente ao setor do time.
- RN-11: Alterações de perfil, associação a setor, responsabilidade por time e membros devem
  invalidar sessões ativas quando alterarem permissões efetivas, conforme spec 003.
- RN-12: A administração não concede permissões implícitas por esconder ou exibir controles no
  frontend; cada operação continua protegida no backend.
- RN-13: A pessoa administradora usa uma área dedicada para consultar e administrar usuários,
  setores e times de toda a unidade, em páginas separadas. Gerentes e KP usam a área de Times;
  páginas e opções de navegação aparecem conforme permissões efetivas e mostram somente os recursos
  dentro dos escopos autorizados.
- RN-13a: O sidebar do administrador apresenta um grupo expansível **Administração**, com links para
  Usuários, Setores e Times. Esse grupo não aparece para usuários sem perfil `ADMIN_UNIDADE`.
- RN-14: KP continua sendo um papel por vínculo de membro com time (`TimeMembro.papel`); não é um
  perfil de conta. Gerentes e KP usam a mesma área de Times: gerente vê/gerencia times dos setores
  associados; KP vê/atua somente nos times em que tem esse papel. A navegação e as ações também
  dependem das permissões efetivas.
- RN-15: A conta com perfil `GERENTE`, mas sem associação ativa a setor, não tem escopo de gestão de
  times e não vê a opção de Times no sidebar até receber uma associação.
- RN-16: O administrador pode inativar um time para resolver a inativação do setor correspondente;
  a operação preserva membros e histórico e invalida sessões dos membros. Reativar o time exige que
  seu setor esteja ativo.
- RN-17: As tabelas de Usuários, Setores, Times e Perfis usam a composição visual universal definida
  na spec 004: espaçamento uniforme, painel de estado vazio cinza claro e arredondado separado do
  cabeçalho, e paginação compartilhada.

## Critérios de aceite

> Dado / Quando / Então; incluir falhas e isolamento entre unidades.

- **CA-01:** Dado um administrador da unidade, quando acessa a área administrativa, então pode
  consultar os setores, usuários e times da própria unidade.
- **CA-02 (falha):** Dado um usuário sem perfil `ADMIN_UNIDADE`, quando acessa a área ou tenta uma
  operação administrativa diretamente na API, então recebe acesso negado e nenhuma alteração é
  persistida.
- **CA-03:** Dado um administrador, quando cria um setor, então o setor aparece na listagem da mesma
  unidade.
- **CA-04:** Dado um administrador, quando edita ou inativa um setor da própria unidade, então os
  dados são atualizados sem apagar histórico nem atravessar o limite da unidade; a inativação só é
  permitida quando não há times ativos.
- **CA-05:** Dado um administrador, quando cria um usuário e seleciona o perfil de sistema Gerente,
  então a conta é criada com o fluxo de senha inicial previsto na spec 003; o vínculo a setores é
  feito depois por uma ação administrativa separada.
- **CA-06:** Dado um usuário gerente e um setor da mesma unidade, quando o administrador associa o
  usuário ao setor, então a associação fica disponível para autorização de criação de times.
- **CA-07:** Dado um gerente associado a um setor, quando cria um time nesse setor, então o time é
  criado sob sua responsabilidade.
- **CA-08 (falha):** Dado um gerente, quando tenta criar um time em setor não associado ou em outra
  unidade, então a API recusa a operação sem revelar dados de outra unidade.
- **CA-09:** Dado um gerente associado a um setor, quando administra times, membros e papéis nesse
  setor, então as mudanças são concluídas dentro do setor associado.
- **CA-10:** Dado uma alteração que muda permissões efetivas, quando ela é persistida, então sessões
  anteriores deixam de autorizar operações protegidas.
- **CA-11:** Dado um gerente ou KP sem determinada permissão, quando consulta a navegação, então não
  vê a opção correspondente; acesso direto à rota ou API também é recusado.
- **CA-12:** Dado um administrador da unidade, quando abre a área administrativa, então consegue
  consultar todos os usuários, setores e times da própria unidade.
- **CA-13 (falha):** Dado um gerente associado a um setor, quando sua associação é removida, então
  operações de gestão em qualquer time desse setor passam a ser recusadas, inclusive se o time ainda
  referenciar seu usuário como gerente.
- **CA-14 (falha):** Dado um setor com times ativos, quando o administrador tenta inativá-lo, então a
  operação é recusada e a API informa que os times precisam ser resolvidos primeiro.
- **CA-15:** Dado um setor sem times ativos, quando o administrador o inativa, então as associações
  ativas de gerentes a esse setor também são inativadas e não concedem mais acesso.
- **CA-16:** Dado um setor reativado, quando o gerente tenta gerir seus times, então só consegue após
  o admin criar novamente uma associação ativa.
- **CA-17:** Dado um KP associado a times, quando abre a área de Times, então vê somente os times em
  que possui o papel KP e as ações autorizadas para esses times.
- **CA-18 (falha):** Dado um usuário sem perfil `GERENTE` ou inativo, quando o administrador tenta
  associá-lo a um setor como gerente, então a API recusa a associação.
- **CA-19:** Dado um usuário com perfil `GERENTE` sem setor associado, quando acessa o sistema, então
  não recebe acesso de gestão de times nem a opção de Times no sidebar; após associação ativa, vê
  somente o escopo associado.
- **CA-20:** Dado um administrador da unidade, quando consulta o sidebar, então vê o grupo
  expansível Administração e seus links para Usuários, Setores e Times; usuários sem perfil
  `ADMIN_UNIDADE` não veem esse grupo.
- **CA-21:** Dado um administrador, quando inativa um time, então o time deixa de compor o escopo
  ativo do setor e seus membros perdem o contexto de acesso ao time, preservando os vínculos. O time
  só pode ser reativado enquanto o setor estiver ativo.

## Fora de escopo

- Criar, editar ou excluir perfis e permissões; consultar a spec 005.
- Alterar autenticação local ou integração corporativa; consultar a spec 003.
- Gestão de tarefas ou casos de teste.
- Administração de organizações acima da unidade.
- Ações de KP sobre tarefas; serão especificadas junto com o módulo de tarefas.

## Decisões confirmadas

- Relação entre gerentes e setores é muitos-para-muitos.
- Perfil concede permissões; associação a setor delimita o escopo em que o gerente exerce essas
  permissões.
- O perfil de sistema **Gerente** é seedado, somente leitura e atribuível pelo administrador; a
  associação a setor ocorre em ação posterior à criação da conta.
- Gerente administra times dos setores associados, inclusive membros e papéis.
- Admin tem área dedicada com visão completa da unidade; gerente e KP recebem opções no sidebar de
  acordo com suas permissões e escopos.
- Usuários, Setores e Times do admin ficam em páginas separadas dentro da área de Administração.
- A área de Administração aparece como grupo expansível no sidebar, apenas para o admin.
- KP continua como papel por time, e não como perfil global da conta.
- Setores podem ser criados, editados e inativados.
- Remover associação gerente-setor revoga o acesso a todos os times daquele setor; `Time.gerente_id`
  sozinho não concede autorização.
- `Time.gerente_id` permanece como indicação do responsável principal.
- A inativação de setor é bloqueada enquanto houver times ativos.
- Inativar setor sem times ativos também inativa os vínculos de gerentes com esse setor.
- Reativar setor não restaura associações de gerente; é necessária nova associação explícita.
- Gerentes e KP usam a mesma área de Times com escopos distintos: setores associados para gerente e
  vínculos KP para KP.
- O admin pode inativar/reabrir times na página administrativa para conseguir resolver a regra de
  inativação de setores; a reativação é recusada quando o setor está inativo.

## Impacto em regras existentes

A RN-05 e as decisões registradas na spec 003 e no ADR 0013 descrevem a associação inicial de um
gerente a um time existente. Esta spec propõe substituir essa etapa por associação direta ao setor,
com escopo para gerir os times daquele setor. Antes da aprovação, atualizar a spec 003 e avaliar um
ADR para registrar a nova relação e seu escopo. O perfil de sistema Gerente concede permissões de
times, mas só a associação ativa ao setor define o escopo. O papel de KP permanece por time,
conforme o modelo atual. `Time.gerente_id` permanece como responsável principal, sem conceder
autorização; essa autorização requer permissão adequada e associação ativa ao setor. KP e gerente
usam a mesma área de Times com escopos distintos.
