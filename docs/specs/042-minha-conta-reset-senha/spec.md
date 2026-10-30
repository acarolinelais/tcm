# 042. Minha conta e redefinição de senha pelo administrador: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

O menu da conta mostra só o e-mail e Sair. A pessoa não tem onde ver os próprios dados, e trocar a senha só
acontece no primeiro acesso. Quem esquece a senha fica sem entrar: não há recuperação, e o administrador não
consegue redefinir a senha pelo sistema.

## Objetivo

A pessoa ganha a página Minha conta, com os próprios dados e a troca de senha. O administrador da unidade pode
gerar uma senha temporária para quem esqueceu, que obriga a troca no próximo acesso.

## Histórias de usuário

- Como **qualquer usuário**, quero ver meu nome, e-mail, perfil, times e setor, e trocar minha senha quando
  quiser.
- Como **administrador da unidade**, quero redefinir a senha de alguém que esqueceu, para que volte a entrar.
- Como **usuário que esqueceu a senha**, quero saber na tela de login o que fazer.

## Regras de negócio

- RN-01: O menu da conta ganha os itens Minha conta e Configurações.
- RN-02: Minha conta mostra nome, e-mail, perfil, setor e times, e a ação Trocar senha. Esses dados não são
  editáveis pela própria pessoa: quem cadastra continua sendo o administrador ou o gerente (spec 006).
- RN-03: Trocar a senha pede a senha atual e a nova, segue as regras atuais (ADR 0023) e encerra as outras
  sessões abertas da pessoa (ADR 0020).
- RN-04: O administrador da unidade tem, na tela de usuários, a ação Redefinir senha. Ela gera uma senha
  temporária, mostrada uma única vez para ser repassada, e marca a conta para trocar a senha no próximo acesso.
- RN-05: Redefinir encerra todas as sessões abertas da pessoa.
- RN-06: A tela de login mostra "Esqueceu a senha? Fale com o administrador da sua unidade".
- RN-07: O administrador não pode redefinir a própria senha por essa ação: ele usa Trocar senha.

## Critérios de aceite

- **CA-01:** Dado um dev logado, quando abre Minha conta, então vê nome, e-mail, perfil, setor e times.
- **CA-02:** Dado a senha atual correta, quando a pessoa troca a senha, então o próximo login só funciona com a
  nova.
- **CA-03:** Dado um usuário que esqueceu a senha, quando o admin usa Redefinir senha, então a senha temporária é
  mostrada uma vez e o próximo login dessa pessoa vai para a troca obrigatória.
- **CA-04:** Dado a pessoa logada em outro navegador, quando o admin redefine a senha dela, então a outra sessão
  deixa de funcionar.
- **CA-05 (falha):** Dado uma senha atual errada, quando a pessoa tenta trocar, então a troca é recusada e a senha
  não muda.
- **CA-06 (falha):** Dado um gerente ou KP, quando tenta redefinir a senha de alguém, então a ação não aparece e
  uma tentativa direta é recusada.
- **CA-07 (falha):** Dado um usuário de outra unidade, quando o admin tenta redefinir a senha dele, então é
  recusado como usuário inexistente.

## Fora de escopo

- Recuperação de senha por e-mail ("esqueci a senha" automático).
- Foto de perfil e edição do próprio nome ou e-mail.
- Login pela API corporativa (ADR 0014).

## Dúvidas em aberto

- O gerente também deve poder redefinir a senha das pessoas que ele cadastrou (ADR 0024)?
- A recuperação por e-mail fica para depois da integração com a API corporativa?
