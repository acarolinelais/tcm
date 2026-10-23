# 005. Gestão de perfis e permissões: Spec

- **Status:** Aprovada
- **Data:** 2026-10-23
- **ADRs relacionados:** 0006, 0009, 0018, 0020

## Problema

A tela atual exige que a pessoa entenda ao mesmo tempo a seleção do perfil, o cadastro de um novo
perfil e uma lista extensa de permissões. Na criação, nome e descrição são enviados primeiro; as
permissões são configuradas e salvas depois. Se a segunda operação falhar, fica um perfil vazio. A
interface também expõe os códigos técnicos junto às descrições e dá o mesmo peso visual a todos os
grupos.

## Objetivo

Oferecer um editor único e previsível para criar ou editar perfis. A criação deve incluir identidade
do perfil e permissões num único rascunho e numa única operação atômica. As permissões ficam
organizadas por controller/área da API em grupos compactos, com leitura rápida do que já está
selecionado e controles claros para alterar ações por grupo ou individualmente.

## Histórias de usuário

- Como **administradora da unidade**, quero criar um perfil e configurar seu acesso no mesmo fluxo,
  para não deixar perfis incompletos nem precisar descobrir uma segunda etapa.
- Como **administradora da unidade**, quero localizar rapidamente os perfis que posso editar e
  distinguir os perfis protegidos pelo sistema.
- Como **administradora da unidade**, quero entender o alcance de cada perfil usando nomes legíveis,
  resumos por controller e descrições curtas das ações.
- Como **pessoa que configura um perfil**, quero salvar ou descartar meu rascunho de forma explícita,
  para não perder alterações ao trocar de perfil ou sair da tela.

## Regras de negócio

- RN-01: Somente pessoas com a permissão `perfis.gerenciar` podem abrir e usar a tela. O backend
  continua sendo a autoridade para toda operação.
- RN-02: A tela inicial apresenta os perfis em uma tabela no padrão da listagem de usuários, com
  nome, descrição, tipo, quantidade de permissões e ações. Perfis do sistema são identificados como
  protegidos.
- RN-03: O menu de ações oferece **Visualizar permissões** para todos os perfis e **Editar
  permissões** apenas para perfis editáveis. A visualização é somente leitura; edição abre o editor
  de largura completa. Nenhuma segunda barra de navegação lateral é exibida.
- RN-04: Tabela, menu e editor se adaptam a telas estreitas sem exigir rolagem horizontal.
- RN-05: Selecionar **Novo perfil** abre o mesmo editor vazio, com campos de nome e descrição no
  cabeçalho e as permissões
  logo abaixo. Não há um modal de cadastro separado do editor de permissões.
- RN-06: Cada grupo corresponde a um controller/área da API (por exemplo, Usuários, Perfis, Setores
  ou Times). O catálogo informa o código, nome de exibição e ordem; o frontend não mantém uma lista
  própria desses grupos.
- RN-07: Os grupos de permissões são expansíveis e mostram no cabeçalho quantas permissões estão
  selecionadas (`2 de 4`) e, quando houver seleção, um resumo curto das ações ativas. Os grupos
  começam recolhidos para manter o editor escaneável.
- RN-08: Cada permissão apresenta um checkbox, um nome legível e uma descrição breve. O código
  técnico não aparece na leitura normal da tela; pode ser disponibilizado em detalhe acessível se
  houver necessidade operacional comprovada.
- RN-09: O cabeçalho do grupo oferece uma ação inequívoca para marcar ou desmarcar todas as
  permissões daquele controller. Seu estado é marcado, desmarcado ou parcial e deve ser anunciado
  para tecnologia assistiva. As permissões continuam independentes entre si.
- RN-10: Edição e criação mantêm um rascunho local. A barra de ações fica junto ao rodapé do editor,
  visível sem competir com os grupos. Na edição, **Salvar alterações** só fica ativo quando houver
  mudanças; na criação, **Criar perfil** fica ativo quando o nome for válido. A operação pendente
  desabilita controles conflitantes.
- RN-11: Criar perfil envia nome, descrição opcional e a lista completa de permissões numa única
  requisição. A API grava perfil e associações numa transação: ou todos os dados são persistidos ou
  nenhum. A resposta retorna o perfil criado com as permissões persistidas.
- RN-12: Ao sair do editor, iniciar um novo, cancelar a criação ou sair da tela com mudanças
  pendentes, a pessoa pode salvar, descartar ou permanecer. No rascunho de criação, as opções
  equivalentes são criar, descartar ou permanecer. Nenhum rascunho é descartado sem decisão explícita.
- RN-13: Perfis de sistema com `codigo` (`ADMIN_UNIDADE`, `USUARIO_PADRAO` e `GERENTE`) têm suas
  permissões visíveis, são somente leitura e não oferecem ação de salvar. A API recusa tentativas de
  alteração.
- RN-14: O perfil `ADMIN_UNIDADE` não pode ser atribuído a outras contas por esta tela. A atribuição
  continua na gestão de usuários, sujeita às restrições do ADR 0018.
- RN-14a: O perfil de sistema `GERENTE` pode ser atribuído a usuários pela gestão de usuários. Ele
  concede permissões de times, mas o escopo organizacional do gerente depende de associações ativas
  a setores, conforme a spec 006.
- RN-15: Erros de carregamento, criação ou gravação seguem ProblemDetails e preservam o perfil
  selecionado e todo o rascunho. Conflito de nome deve apontar o campo ou explicar a duplicidade sem
  limpar os dados.
- RN-15: A tela mantém navegação por teclado, foco visível, associação entre checkbox e rótulo,
  estado parcial anunciado, hierarquia de títulos e mensagens de erro com semântica apropriada.

## Critérios de aceite

- **CA-01:** Dada uma administradora autorizada, quando abre a tela, então vê a tabela de perfis com
  ações disponíveis para cada item.
- **CA-15:** Dado um perfil, quando abre seu menu de ações, então pode visualizar permissões; perfis
  editáveis também oferecem a ação de editar permissões.
- **CA-02:** Dado um controller/área que o frontend ainda não conhece, quando o catálogo retorna seus
  metadados, então o grupo e suas permissões são exibidos sem alteração específica na página.
- **CA-03:** Dado um grupo recolhido, quando a pessoa consulta a lista, então identifica o nome do
  controller, a contagem de permissões selecionadas e um resumo curto das ações ativas.
- **CA-04:** Dada uma permissão, quando a pessoa marca ou desmarca seu checkbox, então somente aquela
  permissão muda no rascunho e a contagem do grupo é atualizada.
- **CA-05:** Dado um grupo sem seleções, parcial ou totalmente selecionado, quando a pessoa usa o
  controle do cabeçalho, então todas as permissões daquele grupo são selecionadas ou desmarcadas e
  os estados visual e acessível correspondem à seleção.
- **CA-06:** Dado um perfil editável sem mudanças, quando o editor é exibido, então salvar fica
  desabilitado; havendo mudanças, a barra informa que há alterações pendentes.
- **CA-07:** Dado um perfil editável com mudanças, quando salva, então a API recebe o conjunto
  completo e a tela confirma o estado persistido. Em caso de falha, o rascunho continua disponível
  para correção ou nova tentativa.
- **CA-08:** Dado o início de um novo perfil, quando a pessoa configura nome, descrição e
  permissões, então tudo permanece no mesmo editor e nenhum registro é criado antes da confirmação
  em **Criar perfil**.
- **CA-09:** Dado um nome válido e permissões selecionadas, quando cria, então a API persiste o
  perfil e suas associações atomicamente e o perfil criado fica selecionado no editor.
- **CA-10:** Dado um nome já usado na unidade ou uma permissão inválida, quando a criação falha,
  então a API não deixa perfil parcial e a interface preserva todos os campos e seleções, indicando
  como corrigir.
- **CA-11:** Dado um rascunho de edição ou criação, quando a pessoa retorna à tabela, cancela ou
  tenta sair, então pode salvar/criar, descartar ou permanecer sem perder dados acidentalmente.
- **CA-12:** Dado um perfil de sistema, quando a pessoa o seleciona, então vê o indicador de
  proteção e as permissões em modo somente leitura; gravação direta pela API é recusada.
- **CA-13:** Dada uma pessoa sem `perfis.gerenciar` ou de outra unidade, quando tenta consultar ou
  alterar dados, então a API recusa a operação e não persiste mudanças.
- **CA-14:** Dada uma tela estreita ou navegação por teclado, quando a pessoa percorre tabela,
  menu, editor, grupos e ações, então tudo permanece legível, operável, com foco visível e sem
  rolagem horizontal.
- **CA-16:** Dado o perfil de sistema `GERENTE`, quando o administrador o consulta, então vê suas
  permissões em modo somente leitura; quando atribui o perfil a um usuário pela gestão de usuários,
  então a atribuição é permitida sem tornar o perfil editável.

## Fora de escopo

- Atribuir perfis a usuários, que permanece na gestão de usuários.
- Renomear ou alterar a descrição de perfis já criados.
- Excluir, duplicar ou criar perfis a partir de modelos.
- Alterar permissões dos perfis de sistema ou definir dependências automáticas entre permissões.
- Criar permissões pela interface. O catálogo é mantido pelo backend.
- Implementar permissões para módulos de tarefas ainda não existentes.

## Evolução planejada

- A unidade precisará de um perfil **KP** com permissões superiores às do perfil `USUARIO_PADRAO`.
  Essa evolução não altera o escopo desta entrega. Uma spec própria definirá as permissões exatas,
  como o perfil será disponibilizado e como suas permissões de conta coexistem com o papel `KP` por
  time (`TimeMembro.papel`). O papel por time continuará delimitando em quais times a pessoa atua
  como KP; possuir o perfil de conta, por si só, não deve conceder acesso a todos os times.

## Decisões de UX

- Criar e editar usam o mesmo espaço e os mesmos controles, evitando dois fluxos de configuração.
- A tabela de perfis é a navegação; não há uma lista lateral interna nem formulários de criação
  embutidos nela.
- A hierarquia visual prioriza perfil, resumo do grupo e ação. Identificadores técnicos não competem
  com rótulos de leitura.
- Grupos começam recolhidos e mostram seleção resumida. A pessoa expande somente o controller que
  deseja revisar ou alterar.
- A criação atômica é requisito de UX e integridade: não existe estado persistido de perfil criado
  sem as permissões escolhidas no mesmo envio.
