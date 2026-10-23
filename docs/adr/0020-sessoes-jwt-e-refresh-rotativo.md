# 0020. Sessões JWT e refresh token rotativo

- **Status:** Aceito
- **Data:** 2026-10-23
- **ADRs relacionados:** 0013, 0014, 0018, 0019

## Contexto

O ADR 0014 definiu o primeiro login local com JWT de acesso sem refresh token, adequado ao escopo
inicial. A evolução de permissões e perfis exige sessões rastreáveis: mudanças de acesso e troca de
senha precisam invalidar tokens já emitidos, e a pessoa não deve precisar autenticar novamente a cada
15 minutos. O ADR 0018 também substituiu a claim administrativa por perfis consultados no banco.

## Decisão

Manter JWT de acesso curto e introduzir sessões persistidas com refresh token opaco, rotativo e de uso
único:

- O access token expira em 15 minutos. Ele identifica usuário, unidade, sessão e versão de autenticação;
  não concede administração por uma claim `admin_unidade`. Perfil e permissões efetivas são resolvidos
  no backend conforme o modelo do ADR 0018.
- O refresh token expira em 7 dias. O backend persiste somente seu hash, associado à sessão, e o
  substitui a cada renovação. O token anterior deixa de ser aceito.
- Cada sessão registra a versão de autenticação do usuário. Alterações que revogam acesso incrementam
  `auth_version`; sessões com versão antiga e seus access/refresh tokens são recusados. Logout revoga
  a sessão atual.
- A troca obrigatória da senha inicial mantém a sessão atual, atualiza sua versão e emite tokens novos;
  as demais sessões do usuário são invalidadas, conforme ADR 0019.
- O frontend mantém os tokens em `sessionStorage`. A autenticação local e a senha inicial configurável
  são temporárias até a integração corporativa, sem alterar a separação entre autenticação e identidade
  local estabelecida no ADR 0014.

Este ADR substitui o ADR 0014 somente quanto à duração e ao ciclo de vida de tokens e sessões. A
interface `Autenticador` e a possibilidade de trocar o provedor de credenciais continuam válidas.

## Alternativas consideradas

- **Continuar sem refresh token:** força novo login a cada expiração do access token e não atende ao
  ciclo de sessão adotado na spec 003.
- **Refresh token persistido em texto puro:** facilita suporte operacional, mas expõe credenciais
  reutilizáveis em caso de vazamento do banco; armazenar o hash reduz esse impacto.
- **Access token de longa duração sem sessão rastreável:** dificulta revogar imediatamente acesso após
  mudança de perfil, desativação ou troca de senha.

## Consequências

- ✅ Sessões podem ser renovadas sem novo login e revogadas diante de alterações de acesso.
- ✅ O banco não armazena refresh tokens em texto puro; a rotação limita o uso de tokens antigos.
- ⚠️ A validação de access tokens consulta estado de sessão/versão no backend, portanto a autorização
  não é totalmente stateless.
- ⚠️ A tabela de sessões precisa de limpeza periódica para remover registros expirados ou revogados.
- ⚠️ A duração dos tokens e o armazenamento em `sessionStorage` devem ser reavaliados quando a
  autenticação corporativa for integrada.
