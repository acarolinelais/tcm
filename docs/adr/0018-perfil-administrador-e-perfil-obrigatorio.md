# 0018. Perfil administrador da unidade e perfil obrigatório

- **Status:** Aceito
- **Data:** 2026-10-23
- **ADRs relacionados:** 0015, 0017

## Contexto

O booleano `usuarios.admin_unidade` acumulava duas responsabilidades: identificava o administrador da
unidade e concedia acesso irrestrito aos recursos da unidade. Além disso, `usuarios.perfil_id` era
opcional, permitindo contas sem perfil, inclusive o administrador bootstrap.

## Decisão

Cada unidade possui perfis protegidos de sistema: `ADMIN_UNIDADE`, com todas as permissões e escopo
total da unidade, e `USUARIO_PADRAO`, atribuído por padrão a novas contas. O código estável do perfil,
não o nome editável, determina o escopo administrativo. Os perfis de sistema não podem ter suas
permissões alteradas nem ser atribuídos pela interface a outras contas; o administrador bootstrap
mantém o perfil administrador.

A migração associa administradores existentes ao perfil `ADMIN_UNIDADE`, os demais usuários ao perfil
`USUARIO_PADRAO`, torna `perfil_id` obrigatório e remove `admin_unidade`. O atributo não é enviado no
JWT; as permissões e o código do perfil são carregados do banco na autenticação. A API retorna
`perfil_codigo` no endpoint `/api/auth/me`.

A listagem de usuários mantém `perfil_id` e a coluna Perfil, pois é informação útil para gestão e
atribuição. Ela não retorna o objeto completo do perfil nem oferece estado “sem perfil”.

## Consequências

- O acesso administrativo e as permissões ficam vinculados a um único perfil seedado.
- Toda conta tem perfil; novas contas recebem o perfil padrão da unidade.
- O perfil administrador é protegido contra alterações acidentais pela API de gestão de perfis.
- Criar uma unidade futuramente exige também criar seus dois perfis padrão.
