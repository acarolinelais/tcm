# 004. Listagem filtrável de usuários: Spec

- **Status:** Concluída
- **Data:** 2026-10-23
- **ADRs relacionados:** 0004, 0006, 0008, 0009, 0013, 0017, 0022

## Problema

A listagem de usuários oferece paginação, mas não permite localizar pessoas por nome, e-mail, status
ou perfil. A tabela também apresenta controles de filtro de forma inconsistente e não define um padrão
reutilizável para outras páginas.

## Objetivo

Permitir que usuários autorizados filtrem a lista de pessoas sem perder o isolamento por unidade e
escopo de equipe. Padronizar a apresentação de tabelas, cabeçalhos filtráveis e paginação para que
outras páginas possam reutilizar os mesmos componentes.

## Histórias de usuário

- Como **administradora da unidade**, quero filtrar usuários por nome, e-mail, status e perfil para
  encontrar rapidamente uma conta.
- Como **gerente ou membro autorizado**, quero aplicar filtros somente às pessoas que já posso
  consultar, para preservar meu escopo de acesso.
- Como **pessoa que usa o sistema**, quero encontrar tabelas e paginação com controles consistentes
  para aprender a usá-los uma única vez.

## Regras de negócio

- RN-01: Os filtros podem ser combinados e são aplicados antes da paginação.
- RN-02: Nome e e-mail fazem busca parcial sem diferenciar maiúsculas de minúsculas.
- RN-03: Status aceita ativo, inativo ou todos. Perfil aceita um perfil específico ou todos. Todo
  usuário possui um perfil obrigatório.
- RN-04: Filtros não ampliam o escopo de consulta: admins continuam restritos à unidade; os demais
  continuam restritos aos usuários visíveis por seus times e permissões.
- RN-05: Todas as tabelas do sistema, existentes e futuras, usam o padrão visual compartilhado:
  cabeçalho, corpo, painel de estado vazio arredondado e separado do cabeçalho, espaçamentos,
  rolagem e paginação seguem a mesma composição. Cada domínio fornece conteúdo, colunas e filtros sem
  duplicar essas regras visuais. Exceções exigem ADR.
- RN-06: A paginação começa com 10 itens por página e permite selecionar 10, 20, 50 ou 100 itens.
- RN-07: A coluna de ações não oferece filtro.

## Critérios de aceite

- **CA-01:** Dado um usuário autorizado na listagem, quando informa parte de um nome, então recebe
  somente correspondências dentro de seu escopo.
- **CA-02:** Dado um usuário autorizado na listagem, quando informa parte de um e-mail, então recebe
  somente correspondências dentro de seu escopo.
- **CA-03:** Dado um filtro de status ou perfil, quando seleciona uma opção, então a lista e a
  contagem da paginação refletem a opção selecionada.
- **CA-04:** Dado filtros em mais de uma coluna, quando aplica todos, então os resultados atendem a
  todos os filtros antes da paginação.
- **CA-05:** Dado um usuário sem acesso a outra equipe ou unidade, quando combina filtros que
  corresponderiam a uma pessoa fora do seu escopo, então essa pessoa não aparece nos resultados nem
  na contagem.
- **CA-06:** Dado um filtro textual, quando limpa ou altera o valor, então a consulta e a página
  retornam ao primeiro conjunto de resultados correspondente.
- **CA-07:** Dado parâmetros de página, tamanho ou identificador de perfil inválidos, quando consulta
  a listagem, então a API rejeita a requisição com erro de validação.
- **CA-08:** Dada qualquer tabela do sistema, existente ou futura, quando ela é exibida, então usa
  `TableLayout` e os componentes compartilhados, com espaçamento uniforme entre cabeçalho, corpo ou
  estado vazio e paginação; o painel vazio tem fundo cinza claro, cantos arredondados e fica separado
  do cabeçalho; o conteúdo é rolável sem deslocar a paginação ou o cabeçalho da página.
- **CA-09:** Dado a paginação sem configuração prévia, quando a tabela abre, então mostra 10 itens por
  página e oferece controles para navegar e alterar essa quantidade.
- **CA-10:** Dado que uma tabela não tem registros ou que os filtros não retornam resultados, quando
  ela é exibida, então mostra o painel vazio universal com orientação e uma ação adequada ao contexto.

## Fora de escopo

- Ordenação por coluna.
- Definição dos filtros de negócio de outros recursos; a composição visual universal da tabela se
  aplica a todos eles.
- Mudança das regras de autorização ou do escopo hierárquico definido na spec 003.

## Dúvidas em aberto

- Nenhuma.
