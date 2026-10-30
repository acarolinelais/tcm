# 051. Estilização da tela de redefinição de senha: Spec

- **Status:** Concluída
- **Data:** 2026-10-30

## Problema
Todo usuário recém-criado entra com a senha padrão e, no primeiro login, é levado a uma tela onde precisa
definir uma senha própria. Essa tela funciona, mas é um formulário simples que não segue a identidade
visual da tela de login: o usuário sai de uma tela caprichada e cai numa que parece inacabada. Ela também
não deixa conferir o que foi digitado, não permite trocar o idioma e não oferece um jeito de desistir e
voltar ao login.

## Objetivo
A tela de redefinição de senha passa a ter a mesma identidade visual da tela de login e ganha quatro
conveniências: mostrar/ocultar a senha, trocar o idioma, trocar o tema e sair sem trocar a senha. A regra de troca
de senha continua a mesma.

## Histórias de usuário
- Como **usuário no primeiro acesso**, quero uma tela de redefinição de senha com a mesma cara do login
  para entender que ainda estou no mesmo fluxo de entrada.
- Como **usuário no primeiro acesso**, quero ver o que digitei nos campos de senha para não errar a
  confirmação.
- Como **usuário no primeiro acesso**, quero trocar o idioma da tela para ler as instruções na minha língua.
- Como **usuário no primeiro acesso**, quero sair e voltar ao login para entrar com outra conta ou
  terminar a troca depois.

## Regras de negócio
- RN-01: A tela segue a identidade visual do login: mesmo cartão, ilustração ao lado do formulário em telas
  largas, logo, título em destaque, campos e botão arredondados, mesmas cores, tipografia e texto de
  crédito no rodapé.
- RN-02: Em telas estreitas, a ilustração some e o formulário ocupa a largura disponível, como no login.
- RN-03: Cada campo de senha (nova senha e confirmação) tem o próprio controle de mostrar/ocultar,
  independente do outro. Por padrão, as senhas aparecem ocultas.
- RN-04: O seletor de idioma e o botão de tema claro/escuro ficam na mesma posição do login. Trocar o
  idioma traduz todos os textos da tela sem perder o que já foi digitado, e a tela fica legível nos dois
  temas.
- RN-05: Sair encerra a sessão e leva à tela de login. A senha padrão continua valendo e a troca será
  exigida de novo no próximo login.
- RN-06: As validações e mensagens atuais continuam iguais: os dois campos são obrigatórios, a
  confirmação precisa ser igual à nova senha e a senha tem no máximo 128 caracteres.

## Critérios de aceite
- **CA-01:** Dado um usuário com senha padrão, quando ele faz login, então vê a tela de redefinição de
  senha com logo, título, texto de orientação, os dois campos, o botão de salvar, o seletor de idioma, o
  botão de tema, a opção de sair e o crédito no rodapé, com a mesma identidade visual da tela de login.
- **CA-02:** Dado a tela aberta numa janela larga, então a ilustração aparece ao lado do formulário;
  dado uma janela estreita (celular), então a ilustração não aparece e nada transborda na horizontal.
- **CA-03:** Dado um campo de senha preenchido, quando o usuário aciona o controle de mostrar senha desse
  campo, então o texto fica visível só nesse campo; quando aciona de novo, volta a ficar oculto.
- **CA-04:** Dado os controles de mostrar/ocultar, quando o usuário navega pelo teclado ou usa um leitor
  de tela, então consegue alcançá-los e eles anunciam se a senha está visível ou oculta.
- **CA-05:** Dado campos já preenchidos, quando o usuário troca o idioma, então os textos da tela mudam
  para o idioma escolhido e os valores digitados continuam lá.
- **CA-06:** Dado a tela aberta, quando o usuário escolhe sair, então a sessão é encerrada e ele vai para
  a tela de login; quando entra de novo com a senha padrão, volta para a tela de redefinição.
- **CA-07:** Dado senhas iguais e válidas, quando o usuário salva, então a senha é trocada e ele vai para
  a tela inicial, como hoje.
- **CA-08 (falha):** Dado um ou os dois campos vazios, quando o usuário salva, então o sistema recusa,
  destaca o campo vazio e informa que a senha é obrigatória, no visual novo.
- **CA-09 (falha):** Dado uma confirmação diferente da nova senha, quando o usuário salva, então o sistema
  recusa e informa, junto do campo de confirmação, que as senhas não coincidem.
- **CA-10 (falha):** Dado uma falha do servidor ou da conexão ao salvar, quando o usuário salva, então
  o sistema informa o erro, mantém o usuário na tela e permite tentar de novo.

## Fora de escopo
- Regras de força de senha (tamanho mínimo, caracteres especiais, medidor de força).
- "Esqueci minha senha", redefinição por e-mail ou por um administrador.
- Troca de senha voluntária para quem já está logado, exigir a senha atual, redefinição pelo administrador
  e o aviso "Esqueceu a senha?" no login: tudo isso é da spec 042.
- Migrar a tela de login para HeroUI.
- Qualquer mudança no backend ou na regra que decide quando a troca é obrigatória.

## Dúvidas em aberto
- Nenhuma. (Resolvida: o texto de crédito do rodapé do login também aparece nesta tela.)
