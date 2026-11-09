# 042. Troca de senha e redefinição pelo administrador: Spec

- **Status:** Aprovada
- **Data:** 2026-10-30 (revisada em 2026-11-06)

## Problema

Hoje a pessoa só troca a senha no primeiro acesso. Depois disso não há onde trocar, nem para o
administrador. Quem esquece a senha fica sem entrar: não há recuperação, e o administrador não consegue
redefinir a senha de ninguém pelo sistema.

## Objetivo

Qualquer pessoa logada, administrador incluído, troca a própria senha quando quiser. O administrador da
unidade redefine a senha de quem esqueceu: ela volta para a senha padrão do time e a pessoa escolhe uma
nova no próximo acesso.

## Histórias de usuário

- Como **qualquer usuário**, quero trocar minha senha quando quiser, para manter minha conta segura.
- Como **administrador da unidade**, quero trocar a minha própria senha, porque a inicial é conhecida.
- Como **administrador da unidade**, quero redefinir a senha de alguém que esqueceu, para que volte a entrar.
- Como **usuário que esqueceu a senha**, quero saber na tela de login o que fazer.

## Regras de negócio

- RN-01: A página Configurações tem a ação Trocar senha, para todos os perfis. No começo ela ficava no menu da
  conta e foi movida para Configurações depois da entrega.
- RN-02: Trocar a senha pede a senha atual, a nova e a confirmação da nova. Segue as regras atuais de senha
  e encerra as outras sessões abertas da pessoa; a sessão em uso continua.
- RN-03: O administrador da unidade tem, na lista de usuários, a ação Redefinir senha, com confirmação.
- RN-04: Redefinir volta a senha da pessoa para a senha padrão do time (`tcm@123` no deploy) e a marca para
  trocar a senha no próximo acesso, como no primeiro login.
- RN-05: Redefinir encerra todas as sessões abertas da pessoa.
- RN-06: Ao confirmar, o administrador vê que a senha voltou para a padrão e qual é ela, para repassar.
- RN-07: O administrador não redefine a própria senha por essa ação: ele usa Trocar senha.
- RN-08: A tela de login mostra "Esqueceu a senha? Fale com o administrador da sua unidade".

## Critérios de aceite

- **CA-01:** Dado uma pessoa logada com a senha atual correta, quando troca a senha, então o próximo login só
  funciona com a nova.
- **CA-02:** Dado o administrador logado, quando troca a própria senha, então o próximo login dele só funciona
  com a nova.
- **CA-03:** Dado a pessoa logada em dois navegadores, quando troca a senha em um, então a sessão do outro
  deixa de funcionar e a do primeiro continua.
- **CA-04:** Dado um usuário que esqueceu a senha, quando o admin usa Redefinir senha, então esse usuário entra
  com a senha padrão e é levado à troca obrigatória.
- **CA-05:** Dado o usuário logado em outro navegador, quando o admin redefine a senha dele, então essa sessão
  deixa de funcionar.
- **CA-06 (falha):** Dado uma senha atual errada, quando a pessoa tenta trocar, então a troca é recusada, a
  senha não muda e a tela informa que a senha atual está incorreta.
- **CA-07 (falha):** Dado a nova senha e a confirmação diferentes, quando a pessoa tenta trocar, então a troca
  não é enviada e a tela pede que as duas sejam iguais.
- **CA-08 (falha):** Dado um gerente, KP ou dev, quando abre a lista de usuários, então a ação Redefinir senha
  não aparece, e uma tentativa direta é recusada.
- **CA-09 (falha):** Dado um usuário de outra unidade, quando o admin tenta redefinir a senha dele, então é
  recusado como usuário inexistente.
- **CA-10 (falha):** Dado o admin na própria linha da lista de usuários, então a ação Redefinir senha não
  aparece, e uma tentativa direta é recusada.

## Fora de escopo

- Página Minha conta com os dados da pessoa (nome, perfil, setor e times).
- Recuperação de senha por e-mail ("esqueci a senha" automático).
- Gerente ou KP redefinindo a senha de alguém.
- Senha temporária aleatória: a redefinição usa a senha padrão do time.
- Login pela API corporativa (ADR 0014).
