# 013. Seed organizacional SVP: Spec

- **Status:** Concluída
- **Data:** 2026-10-24
- **Specs relacionadas:** 006, 008, 012-identificador-externo-usuario

## Problema

Uma instalação inicial do SDF Manager precisa carregar a equipe SVP e sua hierarquia de setor e time,
com contas prontas para o primeiro acesso e com os perfis corretos.

## Objetivo

Provisionar no tenant Manaus os usuários informados, o setor SVP, o time SDF Automation e os vínculos
organizacionais correspondentes. A senha inicial deve seguir a configuração existente do sistema e ser
trocada no primeiro acesso.

## Histórias de usuário

- Como administrador da unidade, quero encontrar a estrutura SVP e seus usuários já provisionados para
  que a equipe possa iniciar o uso sem cadastro manual de toda a organização.
- Como usuário provisionado, quero entrar com a senha inicial configurada e definir minha senha pessoal
  no primeiro acesso.

## Usuários provisionados

| Nome | User ID | Perfil | E-mail |
|---|---|---|---|
| Ivan Moreira | `ivan.moreira` | Gerente | `ivan.moreira@sidia.com` |
| Afonso Fagundes | `a.fagundes` | KP | `a.fagundes@sidia.com` |
| Maria Pernalete | `maria.pernalete` | KP | `maria.pernalete@sidia.com` |
| Caroline Laís | `caroline.silva` | Dev | `caroline.silva@sidia.com` |
| Raquel Batista | `raquel.batista` | Dev | `raquel.batista@sidia.com` |
| Isabel Gama | `isabel.gama` | Dev | `isabel.gama@sidia.com` |
| Nivea Pereira | `nivea.pereira` | Dev | `nivea.pereira@sidia.com` |
| Victoria Andrade | `victoria.andrade` | Dev | `victoria.andrade@sidia.com` |
| Janderson Brandão | `janderson.brandao` | Dev | `janderson.brandao@sidia.com` |
| Gilmar Silva | `gilmar.silva` | Dev | `gilmar.silva@sidia.com` |
| Marcio Marques | `marcio.marques` | Dev | `marcio.marques@sidia.com` |
| Guilherme Rabaioli | `guilherme.rabaioli` | Dev | `guilherme.rabaioli@sidia.com` |

## Regras de negócio

- RN-01: Ivan Moreira recebe o perfil `GERENTE`; Afonso Fagundes e Maria Pernalete recebem `KP`;
  os outros nove usuários recebem `USUARIO_PADRAO` (perfil exibido como Developer).
- RN-02: Cada conta recebe o nome, `user_id` e e-mail especificados no pedido, vinculados à unidade Manaus.
- RN-03: As contas usam `SENHA_INICIAL_USUARIOS`, persistida apenas como hash, e exigem troca de senha
  no primeiro acesso.
- RN-04: Ivan é responsável pelo setor SVP. O time SDF Automation pertence a SVP e Ivan não é membro
  inicial do time.
- RN-05: Afonso, Maria e os nove usuários Developer são membros ativos do time SDF Automation.
- RN-06: O admin bootstrap e as permissões já configuradas nos perfis não são alterados.
- RN-07: A seed preserva o admin bootstrap, as permissões de perfil, os gerentes atuais do setor e os
  membros atuais do time que não estão nesta lista.
- RN-08: Um usuário existente com um `user_id` solicitado é reconciliado para o nome, e-mail, perfil,
  senha inicial e estado ativo informados. Se e-mail e `user_id` apontarem para contas diferentes, a seed
  falha sem alteração parcial.
- RN-09: O setor SVP e o time SDF Automation existentes são reutilizados. O time é reassociado a SVP;
  não são criadas cópias com diferença apenas de maiúsculas/minúsculas.

## Critérios de aceite

- **CA-01:** Dado o banco com a unidade Manaus e seus perfis de sistema, quando a seed for aplicada,
  então as doze contas terão os nomes, e-mails, `user_id` e perfis da tabela desta spec.
- **CA-02:** Dado que `SENHA_INICIAL_USUARIOS` está configurada, quando as contas forem provisionadas,
  então suas senhas serão armazenadas como hash e a troca obrigatória estará ativa.
- **CA-03:** Dada a estrutura SVP, quando a seed for aplicada, então Ivan será gerente responsável pelo
  setor SVP, SDF Automation pertencerá a SVP e os onze usuários indicados (sem Ivan) serão membros ativos.
- **CA-04:** Dado o admin bootstrap e as permissões atuais dos perfis, quando a seed for aplicada,
  então suas identidades e permissões permanecerão iguais.
- **CA-05:** Dado um registro com `user_id` já existente e e-mail diferente, quando a seed for aplicada,
  então a mesma conta será atualizada para os dados solicitados, sem duplicar sua identidade.
- **CA-06 (falha):** Dado um e-mail e um `user_id` que apontem para contas diferentes, quando a seed for
  aplicada, então ela falhará com diagnóstico claro e sem aplicar parcialmente seus dados.
- **CA-07 (falha):** Dada a ausência de `SENHA_INICIAL_USUARIOS` ou de um perfil requerido, quando a seed
  for aplicada, então ela falhará claramente sem criar contas incompletas.

## Fora de escopo

- Criar ou alterar telas e endpoints de gestão de usuários, setores ou times.
- Alterar permissões dos perfis existentes ou a conta admin bootstrap.
- Provisionar a mesma estrutura em outras unidades.

## Decisão de reconciliação

Foi confirmado reutilizar a conta “Carol” que já possui o `user_id` `caroline.silva`, mover o time
SDF Automation existente de FOTA FUS para SVP, preservar os membros atuais não listados e manter o admin
e as permissões de perfis inalterados.
