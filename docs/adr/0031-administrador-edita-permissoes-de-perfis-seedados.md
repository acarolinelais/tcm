# 0031. Administrador edita permissões de perfis seedados

- **Status:** Aceito
- **Data:** 2026-10-23
- **ADRs relacionados:** 0018, 0021, 0026

## Contexto

Os perfis de sistema são criados pelo seed com códigos estáveis que definem regras estruturais,
como escopo administrativo, atribuição e participação em times. A tela de perfis, porém, também
impedia o administrador de ajustar as permissões desses perfis, inclusive quando a unidade precisava
adaptá-los ao seu modelo de acesso.

## Decisão

Uma pessoa autorizada a gerenciar perfis pode alterar as permissões associadas a qualquer perfil da
própria unidade, inclusive `ADMIN_UNIDADE`, `USUARIO_PADRAO`, `GERENTE` e `KP`. O código, o nome e a
descrição dos perfis seedados permanecem gerenciados pelo sistema; sua atribuição e seus escopos
estruturais continuam sujeitos às regras dos ADRs relacionados. A alteração invalida as sessões das
contas associadas ao perfil por meio de `auth_version`.

## Alternativas consideradas

- **Manter permissões de perfil seedado imutáveis:** impede a unidade de adaptar seus acessos e
  exige mudanças no seed para cada necessidade administrativa.
- **Permitir editar também código e identidade do perfil:** pode quebrar verificações de escopo e
  regras especiais que dependem dos códigos estáveis.

## Consequências

- ✅ Administradores podem ajustar as permissões de todos os perfis da unidade pela tela e API.
- ✅ Códigos e regras estruturais seguem estáveis e sob controle do sistema.
- ⚠️ Alterar um perfil compartilhado afeta todas as contas vinculadas; alterar as permissões de
  `ADMIN_UNIDADE` pode remover da conta bootstrap o acesso a operações administrativas.
