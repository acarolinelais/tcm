# 003. Perfis, permissões e ciclo de vida do JWT: Spec

- **Status:** Implementada (validação pendente)
- **Data:** 2026-10-22
- **ADRs relacionados:** 0013, 0014, 0015

## Problema

A spec 002 implementou unidade, setores, times e login, mas as permissões ainda não cobrem toda a
intenção dos ADRs. Hoje qualquer pessoa autenticada pode criar, editar, ativar e inativar usuários da
própria unidade; essas operações não estão restritas à administração. O service de times exige
administração para criar um time, embora gerentes também devam poder fazê-lo após serem alocados pelo
admin a um time existente. Não existe um endpoint para a pessoa consultar seu perfil efetivo e as
permissões que possui. Além disso, o JWT contém `admin_unidade`, então mudanças de perfil ou
desativação da conta podem não valer enquanto um token já emitido continuar válido.

Os papéis e permissões têm escopos diferentes: administração vale para a unidade; gerente vale para
os times aos quais foi alocado; KP e dev valem para cada vínculo de membro. Perfis cadastráveis
agrupam permissões que os administradores podem vincular aos usuários. Um único nome de perfil não
representa corretamente alguém que, por exemplo, tem papéis distintos em vários times.

## Objetivo

Aplicar permissões configuráveis por perfil em usuários, setores, times e demais recursos, e oferecer
à pessoa autenticada uma visão confiável de seu perfil e permissões efetivas. Fortalecer a emissão e a
validação dos tokens com access token e refresh token, claims de identidade e escopo atual, e
invalidação imediata das sessões após alterações de acesso.

## Histórias de usuário

- Como **pessoa autenticada**, quero consultar meu perfil e meus papéis por time, para entender o que
  posso fazer na unidade.
- Como **administradora da unidade**, quero que operações administrativas fiquem restritas ao meu
  papel, para proteger contas e a estrutura organizacional.
- Como **gerente**, quero criar times após ser alocado pelo admin a um time existente e administrar os
  times sob minha responsabilidade sem obter acesso administrativo à unidade.
- Como **administradora da unidade**, quero cadastrar perfis e vincular permissões a eles para definir
  o que cada perfil pode fazer nos controllers e na interface.
- Como **membro de time**, quero que meu papel de KP ou dev valha apenas nos times em que tenho esse
  papel.
- Como **pessoa autenticada**, quero renovar minha sessão com refresh token e ter tokens anteriores
  invalidados imediatamente após mudanças de acesso, para que as permissões atuais sejam respeitadas.

## Regras de negócio

- RN-01: Perfis cadastráveis agrupam permissões. Uma pessoa pode ter um perfil e permissões efetivas
  em escopos diferentes; as permissões são verificadas no backend e usadas pela interface para
  apresentar as ações disponíveis.
- RN-02: O backend é a autoridade final para autorização. A interface pode esconder ações sem
  permissão, mas isso não substitui a validação no backend.
- RN-03: Administração de usuários (criar, editar, ativar e inativar) exige permissão administrativa
  da unidade. Consultas seguem a hierarquia: admins listam todos os usuários da unidade; gerentes
  listam usuários dos times sob sua responsabilidade; usuários comuns listam apenas membros do seu
  próprio time. Usuários comuns do mesmo time podem consultar uns aos outros.
- RN-04: Administração de setores exige papel de administradora da unidade. A listagem continua
  limitada à unidade autenticada.
- RN-05: Um gerente deve primeiro ser alocado por um admin a um time já existente. Gerentes podem criar
  novos times e administrar os times sob sua responsabilidade; o admin pode administrar qualquer time
  da própria unidade. O backend valida o escopo permitido para cada operação.
- RN-06: KP e dev são papéis de vínculo com um time. Eles não concedem acesso administrativo à unidade
  nem a outros times.
- RN-07: Uma ação sobre dados de outra unidade não confirma a existência do recurso e segue a política
  de isolamento da spec 002.
- RN-08: A resposta de perfil deve representar o perfil, permissões efetivas e escopos por unidade e
  time, sem combinar os escopos em um papel global.
- RN-09: Access tokens e refresh tokens devem pertencer a uma sessão rastreável. Alterar perfil,
  permissões, vínculos, dados de acesso ou desativar a conta invalida imediatamente as sessões ativas;
  a API deve conferir o estado atual da sessão e da conta ao autorizar requisições e renovar tokens.
- RN-10: O access token deve carregar, no mínimo, identificador do usuário (`sub`), nome, email,
  perfil, `unidade_id`, indicação de acesso a múltiplos times, `time_id` atual quando houver, `iss`,
  `aud`, `iat`, `exp` e identificador de sessão/token (`jti`). As claims informativas não substituem
  a checagem atual de permissões no backend.
- RN-11: A chave JWT é configuração de ambiente, não pode ter um valor de produção versionado no
  repositório e deve ser rejeitada quando ausente ou abaixo do requisito mínimo definido no plano.

## Critérios de aceite

> Use Dado / Quando / Então e inclua cenários de falha. A duração dos tokens e a regra para determinar
> o time atual em sessões com múltiplos vínculos precisam ser detalhadas na implementação.

- **CA-01:** Dado uma pessoa autenticada, quando consulta seu perfil, então recebe seus dados básicos,
  unidade, perfil, permissões efetivas, time atual e lista de times em que está alocada.
- **CA-02:** Dado uma pessoa com papéis diferentes em times diferentes, quando consulta o perfil,
  então cada papel permanece associado ao time correto.
- **CA-03:** Dado uma pessoa sem permissão administrativa, quando tenta criar, editar, ativar ou
  inativar um usuário, então recebe 403 e nenhuma alteração é persistida.
- **CA-04:** Dado uma administradora autenticada, quando realiza uma operação administrativa de
  usuários em sua unidade, então a operação autorizada é concluída.
- **CA-05:** Dado uma pessoa que não administra a unidade, quando tenta criar um setor, então recebe
  403; a listagem de setores continua restrita à sua unidade.
- **CA-06:** Dado uma gerente alocada pelo admin a um time, quando cria outro time ou administra
  membros e permissões dentro do seu escopo, então a operação é concluída; quando tenta operar fora
  desse escopo, recebe 403.
- **CA-07:** Dado uma administradora autenticada, quando administra membros ou papéis de qualquer time
  de sua unidade, então a operação é concluída.
- **CA-08:** Dado uma pessoa com perfil KP ou dev em um time, quando consulta usuários, então só vê
  membros dos times aos quais tem acesso e não recebe acesso aos demais times ou à administração da
  unidade sem as permissões correspondentes.
- **CA-09:** Dado um JWT ausente, malformado, expirado, assinado com chave incorreta ou com claims
  obrigatórias ausentes, quando acessa um endpoint protegido, então recebe 401 ProblemDetails.
- **CA-10:** Dado uma conta inativada, perfil alterado ou permissão/vínculo revogado, quando uma sessão
  previamente emitida é usada, então access e refresh tokens da sessão são recusados imediatamente.
- **CA-13:** Dado um refresh token válido, quando a pessoa renova a sessão, então recebe novos tokens e
  o refresh token anterior deixa de ser aceito.
- **CA-14:** Dado um usuário comum, quando lista ou consulta usuários, então só vê pessoas do seu time;
  dado um gerente, então vê pessoas dos times sob sua responsabilidade; dado um admin, então vê todos
  os usuários da unidade.
- **CA-15:** Dado um perfil cadastrado com permissões, quando um controller ou a interface avalia uma
  ação, então a permissão correspondente é aplicada; sem a permissão, o backend responde 403.
- **CA-11:** Dado uma configuração sem segredo JWT ou com segredo abaixo do mínimo definido, quando a
  API inicia ou emite um token, então a configuração é rejeitada com erro claro, sem emitir tokens.
- **CA-12:** Dado um token válido, quando a pessoa atualiza seu perfil, então a resposta contém somente
  dados de perfil e permissões, nunca hash de senha ou claims internas desnecessárias.

## Fora de escopo

- Implementar entidades e endpoints de tarefas ou casos de teste; a matriz desses recursos será
  detalhada quando a entidade Task entrar no projeto.
- Criar telas de login e de gestão de usuários, setores e times; esta spec define contratos e regras
  que essas telas poderão consumir. O cadastro e a vinculação de perfis e permissões fazem parte do
  escopo desta spec.
- Integrar o login à API corporativa.
- Construir permissões diferentes por cliente/tenant, fora do catálogo de permissões administrado pela
  unidade.

## Decisões registradas

- Gerentes podem criar times depois que um admin os aloca a um time previamente criado.
- Usuários comuns podem ver usuários do próprio time; gerentes veem usuários dos times abaixo deles;
  admins veem todos os usuários da unidade.
- KP e demais poderes serão representados por permissões vinculadas a perfis cadastráveis, aplicadas
  nos controllers do backend e refletidas na interface.
- Alterações de acesso invalidam imediatamente a sessão ativa.
- O fluxo de autenticação terá refresh token.
- Claims incluirão nome, email, perfil, unidade, acesso a múltiplos times e o time atual quando
  aplicável, além dos campos de validação e sessão necessários.

## Decisões de implementação adotadas

- Access token expira em 15 minutos; refresh token opaco expira em 7 dias, é armazenado como hash no
  backend e rotacionado a cada renovação. O frontend guarda os tokens em `sessionStorage`.
- Para usuários em vários times, `time_id` é inicialmente o primeiro time em ordem alfabética. A API
  informa os vínculos no perfil; a troca explícita de time fica para uma evolução posterior.
- O catálogo inicial inclui permissões de consulta/gestão de usuários, consulta/gestão de setores,
  consulta/criação/gestão de times e gestão de perfis. Administradores têm todas as permissões; a
  alocação como gerente concede as permissões de gestão de time no escopo dos times gerenciados.
- O gerente cria novos times no mesmo setor de um time existente ao qual foi alocado pelo admin.
- As permissões de KP para tarefas serão aplicadas quando os endpoints e a entidade de tarefas forem
  criados.
