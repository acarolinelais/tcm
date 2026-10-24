# 012. Identificador externo de usuário: Spec

- **Status:** Concluída
- **Data:** 2026-10-24
- **Specs relacionadas:** 006, 011

## Problema

As contas de usuário são identificadas no sistema por nome e e-mail, mas algumas planilhas de projetos
e Test Cases usam um identificador próprio da pessoa nas colunas de responsável e backup. Esse valor
não é o identificador interno da conta e hoje não pode ser cadastrado nem usado para localizar a pessoa
na importação.

## Objetivo

Permitir que cada usuário tenha um identificador textual próprio, informado e editável na gestão de
usuários. A importação de projetos e Test Cases deve reconhecer responsáveis e backups pelo nome,
e-mail ou identificador, mantendo as regras atuais de associação ao time e de validação de ambiguidades.

## Histórias de usuário

- Como **administradora ou gerente autorizado a gerir uma conta**, quero informar e editar o
  identificador próprio do usuário para manter a correspondência com as planilhas da equipe.
- Como **gerente ou KP que importa uma planilha de Test Cases**, quero que responsável e backup sejam
  encontrados também pelo identificador próprio, para importar atribuições sem depender do nome ou
  e-mail.

## Regras de negócio

- RN-01: O identificador próprio é um texto livre distinto do identificador interno da conta. Não é
  gerado pelo sistema e não pode alterar a identidade interna, autenticação ou relacionamentos do usuário.
- RN-02: O campo é opcional para permitir contas sem identificador e preservar usuários já cadastrados.
  Quando informado, espaços no início e no fim são removidos; valor vazio após essa remoção equivale a
  campo não informado.
- RN-03: O identificador próprio deve ser único entre usuários da mesma unidade, sem diferenciar
  maiúsculas de minúsculas. Unidades diferentes podem usar o mesmo valor.
- RN-04: Usuários autorizados a criar ou editar uma conta podem informar, alterar ou limpar o
  identificador próprio. As permissões e os escopos atuais de gestão de usuários continuam valendo.
- RN-05: Na importação inicial da spec 011, cada valor nas colunas de responsável e backup pode
  corresponder ao nome, e-mail ou identificador próprio de um usuário. O sistema considera as
  correspondências dos três campos em conjunto; se apontarem para mais de uma pessoa, o valor é
  ambíguo.
- RN-06: A identificação de responsável e backup continua restrita aos membros ativos do time do
  projeto. Uma correspondência única fora do time não é aceita; correspondências ambíguas não são
  resolvidas por preferência entre nome, e-mail ou identificador.
- RN-07: A importação preserva a validação atual de responsável e backup: ambos são obrigatórios,
  distintos e precisam identificar pessoas válidas do time. Erros são apresentados por linha e não
  criam projeto ou casos parcialmente.
- RN-08: O identificador próprio aceita até 150 caracteres.

## Critérios de aceite

- **CA-01:** Dado um usuário autorizado criando ou editando uma conta, quando informa um identificador
  próprio válido, então o valor é salvo e aparece nos dados da conta.
- **CA-02:** Dado um usuário sem identificador próprio, quando sua conta é consultada ou editada, então
  o campo aparece vazio e a conta continua válida.
- **CA-03:** Dado um identificador informado com espaços nas extremidades, quando a conta é salva, então
  o valor armazenado não contém esses espaços; dado um valor composto somente por espaços, então ele é
  tratado como não informado.
- **CA-04 (falha):** Dado um identificador já utilizado por outra conta da mesma unidade, quando uma
  pessoa tenta criar ou atualizar uma conta com esse valor, então a operação é recusada e nenhuma
  alteração é persistida.
- **CA-05:** Dado um identificador usado em outra unidade, quando uma pessoa cria ou atualiza uma conta
  na unidade atual com esse mesmo valor, então a operação é permitida.
- **CA-06:** Dada uma planilha com o nome de um membro ativo do time na coluna responsável ou backup,
  quando ela é importada, então a atribuição é resolvida pelo nome como atualmente.
- **CA-07:** Dada uma planilha com o e-mail de um membro ativo do time na coluna responsável ou backup,
  quando ela é importada, então a atribuição é resolvida pelo e-mail como atualmente.
- **CA-08:** Dada uma planilha com o identificador próprio de um membro ativo do time na coluna
  responsável ou backup, quando ela é importada, então a atribuição é vinculada à conta correspondente.
- **CA-09 (falha):** Dado um valor que corresponde a mais de uma pessoa entre nome, e-mail e
  identificador, quando a planilha é validada, então a linha é reportada como ambígua e não há criação
  parcial do projeto ou dos casos.
- **CA-10 (falha):** Dado um valor que corresponde somente a um usuário que não é membro ativo do time,
  quando a planilha é validada, então a linha é reportada como pessoa fora do time e não há criação
  parcial.
- **CA-11:** Dada uma planilha válida em que responsável e backup são identificados por combinações de
  nome, e-mail ou identificador próprio, quando a importação é concluída, então cada caso recebe as
  contas corretas e todas as validações atuais de atribuição são mantidas.
- **CA-12 (falha):** Dado um identificador próprio com mais de 150 caracteres, quando uma pessoa tenta
  criar ou atualizar a conta, então a operação é recusada com erro de validação e nenhum dado é salvo.

## Fora de escopo

- Alterar o identificador interno da conta, o login ou os dados de autenticação.
- Usar o identificador próprio em outras importações além da planilha inicial de projetos e Test Cases.
- Adicionar filtros ou colunas de identificação própria à listagem de usuários.

## Dúvidas em aberto

- Nenhuma.
