# 0019. Senha inicial local com troca obrigatória

- **Status:** Substituído por [0023](0023-senha-sem-minimo-de-caracteres.md)
- **Data:** 2026-10-23
- **ADRs relacionados:** 0014, 0018

## Contexto

Até a integração com a API corporativa de autenticação, a unidade precisa conseguir provisionar contas
que possam entrar no sistema sem cadastrar uma senha pessoal para cada pessoa.

## Decisão

O backend usa `SENHA_INICIAL_USUARIOS`, uma configuração de ambiente, para criar novas contas. A senha
é armazenada somente como hash Argon2 e nunca é retornada pela API. A conta recebe a flag
`senha_alteracao_obrigatoria`; após entrar, a pessoa só pode consultar o próprio perfil, sair ou trocar
sua senha conforme a política registrada no ADR 0023.

A troca atualiza a senha, invalida as outras sessões e emite tokens novos para a sessão atual. As
requisições protegidas são recusadas até que a troca termine. A autenticação local é temporária e será
substituída pela integração corporativa.

## Consequências

- A operação precisa configurar `SENHA_INICIAL_USUARIOS` antes de criar contas.
- A equipe que provisiona contas precisa informar a senha inicial às pessoas por um canal apropriado.
- A senha inicial compartilhada não deve ser usada como senha pessoal permanente.
- Contas existentes não recebem essa flag automaticamente; a regra vale para contas novas.
