# 001. Fundação: esqueleto executável: Spec

- **Status:** Aprovado
- **Data:** 2026-10-22

## Problema
O repositório tem a governança pronta (ADRs, skills, templates), mas nenhum sistema executável. Não há
como verificar, de ponta a ponta, se os padrões definidos nos ADRs funcionam juntos, nem uma base sobre a
qual novas funcionalidades (como telas e identidade visual) possam ser construídas.

## Objetivo
Ao final, existe um sistema rodando localmente — interface, API e banco de dados — com um cadastro de
Usuários funcional de ponta a ponta, provando que a base definida nos ADRs sustenta um CRUD completo.

## Histórias de usuário
- Como **pessoa desenvolvedora**, quero subir o sistema localmente com os comandos documentados, para
  confirmar que a base funciona antes de construir novas funcionalidades sobre ela.
- Como **usuária do sistema**, quero cadastrar, listar, editar e inativar usuários, para gerenciar quem
  tem registro no sistema.

## Regras de negócio
- RN-01: Um usuário tem nome, e-mail e um estado ativo/inativo; é criado como ativo.
- RN-02: O e-mail de um usuário é único entre todos os usuários, ativos ou inativos.
- RN-03: Remover um usuário é sempre lógico (inativação); o registro nunca é apagado.
- RN-04: A listagem padrão mostra só usuários ativos; é possível alternar para incluir os inativos.

## Critérios de aceite
> Use o formato Dado / Quando / Então. Inclua cenários de **falha**.

- **CA-01:** Dado que não há usuários cadastrados, quando a pessoa acessa a listagem, então ela vê uma
  lista vazia com indicação de que não há registros.
- **CA-02:** Dado nome e e-mail válidos, quando a pessoa cadastra um novo usuário, então ele passa a
  aparecer na listagem como ativo.
- **CA-03 (falha):** Dado um e-mail já usado por outro usuário, quando a pessoa tenta cadastrar um novo
  usuário com esse e-mail, então o sistema recusa e informa que o e-mail já está em uso.
- **CA-04 (falha):** Dado um cadastro sem nome ou com e-mail em formato inválido, quando a pessoa tenta
  salvar, então o sistema recusa e aponta o campo inválido.
- **CA-05:** Dado um usuário existente, quando a pessoa edita seu nome ou e-mail, então a listagem passa a
  refletir o novo valor.
- **CA-06:** Dado um usuário ativo, quando a pessoa o inativa, então ele deixa de aparecer na listagem
  padrão, mas aparece quando a pessoa opta por incluir inativos.
- **CA-07 (falha):** Dado um identificador de usuário que não existe, quando a pessoa tenta abrir ou
  editar esse usuário, então o sistema informa que o registro não foi encontrado.
- **CA-08:** Dado o sistema configurado localmente, quando a pessoa desenvolvedora inicia os serviços com
  os comandos documentados, então a interface consegue listar os usuários cadastrados no banco de dados.

## Fora de escopo
- Autenticação e autorização (CLAUDE.md: ainda não existem neste projeto).
- Identidade visual, layout de dashboard, sidebar e navbar (fica para uma spec posterior).
- Exclusão física de usuários.
- Qualquer entidade de negócio além de Usuário.
- Paginação, busca ou filtros além do alternar ativos/inativos.

## Dúvidas em aberto
- Nenhuma neste momento; versões de ferramentas e bibliotecas serão fixadas no `plan.md`.
