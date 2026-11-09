# 061. Sessão entre abas: Spec

- **Status:** Concluída
- **Data:** 2026-11-05
- **ADRs:** 0020, 0047, 0048

## Problema
Cada aba do navegador tem a própria sessão. Quem abre uma tela em outra aba (Ctrl+clique em Usuários
estando em Projetos, por exemplo) cai na tela de login e precisa entrar de novo. Isso atinge todo
mundo que trabalha com mais de uma tela aberta ao mesmo tempo.

## Objetivo
Depois do login, qualquer aba nova do mesmo navegador abre já autenticada, enquanto a sessão for
válida. Sair do sistema continua encerrando a sessão.

## Histórias de usuário
- Como **pessoa usuária logada**, quero abrir telas em outras abas sem fazer login de novo, para
  comparar e alternar entre telas.
- Como **pessoa usuária**, quero que sair do sistema encerre a sessão também para as abas novas, para
  que ninguém continue logado no meu navegador depois.

## Regras de negócio
- RN-01: A sessão vale para todas as abas do mesmo navegador e dura 10 horas a partir do login. O
  prazo é fixo: usar o sistema não estende a sessão (ADR 0048).
- RN-02: A credencial de renovação da sessão não fica acessível ao código da página (ADR 0047).
- RN-03: Sair do sistema encerra a sessão. Abas novas pedem login na hora. Abas que já estavam
  abertas pedem login em até 15 minutos.
- RN-04: As regras de revogação de acesso continuam iguais: usuário desativado, senha trocada ou
  perfil alterado invalidam a sessão (ADRs 0019 e 0020).

## Critérios de aceite
- **CA-01:** Dado que estou logado na tela de Projetos, quando abro a tela de Usuários em outra aba
  (Ctrl+clique), então a aba nova mostra Usuários sem pedir login.
- **CA-02:** Dado que fiz login e fechei o navegador, quando reabro o sistema antes de completar 10
  horas do login, então entro sem pedir login.
- **CA-03:** Dado duas abas logadas que ficaram mais de 15 minutos paradas, quando uso as duas ao
  mesmo tempo, então nenhuma delas pede login.
- **CA-04:** Dado que acabei de trocar a senha inicial obrigatória, quando abro outra aba, então ela
  abre logada.
- **CA-05 (falha):** Dado que saí do sistema numa aba, quando abro uma aba nova, então ela pede login.
- **CA-06 (falha):** Dado que saí do sistema numa aba e outra aba continua aberta, quando uso essa
  outra aba depois de 15 minutos, então ela pede login.
- **CA-07 (falha):** Dado uma sessão com mais de 10 horas desde o login, ou revogada (usuário
  desativado, senha trocada), quando abro uma aba nova, então ela pede login.
- **CA-08 (falha):** Dado que nunca fiz login neste navegador, quando abro uma tela interna pelo
  endereço, então o sistema pede login.

## Fora de escopo
- Derrubar na hora todas as abas abertas quando a pessoa sai do sistema.
- Opção "lembrar de mim" ou duração de sessão configurável.
- Expirar a sessão por inatividade.
- Integração com a autenticação corporativa.
- Frontend e API em domínios diferentes.

## Dúvidas em aberto
- Nenhuma.
