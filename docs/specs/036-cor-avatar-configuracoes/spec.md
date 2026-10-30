# 036. Cor do avatar nas Configurações: Spec

- **Status:** Concluída
- **Data:** 2026-10-30

## Problema

Desde a spec 029, todas as pessoas logadas veem o mesmo avatar na barra superior (a imagem padrão, com as
iniciais como fallback). Não há como personalizar o avatar, e quem alterna entre contas ou divide a tela
com colegas não reconhece a própria conta de relance. A spec 029 deixou essa personalização para depois,
pedindo que ela seguisse o mesmo caminho da preferência de idioma: escolhida em Configurações e guardada
na conta.

## Objetivo

O avatar continua sendo a esfera em degradê do HeroUI, sem iniciais, azul para todo mundo no início. Em Configurações, a
pessoa logada troca essa cor por outra da paleta, quando quiser. A escolha vale na hora, fica guardada na
conta e acompanha a pessoa em logins futuros, em qualquer navegador ou dispositivo.

## Histórias de usuário

- Como **pessoa logada**, quero escolher a cor do meu avatar em Configurações para reconhecer a minha conta
  de relance.
- Como **pessoa logada**, quero que a cor escolhida continue a mesma quando eu entrar de novo, inclusive em
  outro computador.

## Regras de negócio

- RN-01: A cor é uma preferência da conta, como o idioma. Cada pessoa altera somente a própria cor, e a
  escolha não muda sessão, perfil nem permissões.
- RN-02: A paleta é fixa, com 8 cores nomeadas, uma para cada esfera em degradê que o HeroUI oferece: azul,
  índigo, roxo, vermelho, laranja, verde, cinza e cinza claro.
- RN-03: Contas existentes e novas começam com **azul**. Não há opção "sem cor": sempre uma das 8 está
  selecionada.
- RN-04: O avatar é a esfera em degradê do HeroUI na cor da conta, sem iniciais (a mesma imagem da spec 029, só
  mudando a cor). Se a imagem não carregar, aparece um círculo liso na mesma cor. O primeiro nome continua em
  texto ao lado do avatar.
- RN-05: A troca vale imediatamente na barra superior, sem recarregar a página nem sair da conta.
- RN-06: Depois do login, a cor salva na conta é a que aparece; nada guardado só no navegador a substitui.
- RN-07: Um valor fora da paleta é recusado e a cor salva continua a anterior.
- RN-08: Se a gravação falhar, a pessoa é avisada e o avatar volta para a cor que estava salva.

## Critérios de aceite

- **CA-01:** Dado uma pessoa logada em Configurações, quando a tela aparece, então há uma seção de cor do
  avatar com as 8 cores, cada uma com nome acessível, e a cor salva aparece marcada.
- **CA-02:** Dado uma conta nova ou existente que nunca escolheu cor, quando a pessoa entra, então o avatar
  é azul e **azul** está marcado em Configurações.
- **CA-03:** Dado uma pessoa logada, quando ela escolhe **verde**, então, sem recarregar a página, o avatar
  da barra superior passa a ser a esfera verde, sem iniciais.
- **CA-04:** Dado uma pessoa que escolheu **verde**, quando ela sai e entra de novo (no mesmo ou em outro
  navegador), então o avatar aparece em verde e **verde** está marcado em Configurações.
- **CA-05:** Dado uma pessoa com **verde** salvo, quando ela escolhe **azul**, então o avatar volta para
  azul e continua assim no próximo login.
- **CA-06:** Dado duas pessoas da mesma unidade, quando a primeira troca a própria cor, então o avatar da
  segunda não muda.
- **CA-07 (falha):** Dado uma requisição de troca com uma cor fora da paleta (ex.: `#ff0000` ou `dourado`),
  quando ela é enviada, então o sistema recusa, informa o motivo, e a cor salva continua a anterior.
- **CA-08 (falha):** Dado uma requisição de troca sem sessão válida, quando ela é enviada, então o sistema
  recusa por falta de autenticação e nenhuma cor é alterada.
- **CA-09 (falha):** Dado uma falha ao gravar a escolha, quando a pessoa troca a cor, então ela vê uma
  mensagem de erro e o avatar e a seleção voltam para a cor salva antes.
- **CA-10:** Dado o tema claro ou o escuro e a imagem da esfera indisponível, quando a pessoa vê a paleta e o
  avatar, então a cor lisa de cada opção se destaca do fundo (contraste mínimo de 3:1).
- **CA-11:** Dado um leitor de tela, quando ele percorre a seção, então anuncia o grupo "Cor do avatar", o
  nome de cada cor e qual está selecionada; com o teclado, dá para escolher qualquer opção.

## Fora de escopo

- Foto de perfil (upload, URL ou serviço externo).
- Cor livre (seletor de cor ou código hexadecimal).
- Avatar colorido em outras telas (tabelas de times, responsáveis de Test Case, administração de usuários).
- Alterar a cor de outra pessoa, inclusive pelo administrador da unidade.
- Escolher a cor antes do login (a tela de login não mostra avatar).
- Mudanças no menu do usuário e nas outras preferências (idioma, tema).

## Decisões da revisão

- O avatar começa em **azul** para todas as contas; não existe a opção **Padrão** com a imagem da spec 029.
- A paleta tem 8 cores (RN-02).
- A troca grava ao clicar, sem botão Salvar, como o idioma (RN-05).
- Depois de ver a tela rodando: o avatar mostra só a esfera do HeroUI na cor escolhida, sem iniciais, e o rosa
  saiu da paleta (o HeroUI não tem esfera rosa) para entrar o cinza claro (RN-02, RN-04, CA-03 e CA-10).
