# 049. Transição suave ao trocar o tema: Spec

- **Status:** Concluída
- **Data:** 2026-10-30

## Problema

Trocar entre o tema claro e o escuro (spec 034) muda a tela inteira de uma vez, de um quadro para o outro.
O salto de brilho incomoda, principalmente do escuro para o claro, e o ícone do toggle troca de sol para
lua sem nenhum sinal de que algo aconteceu.

## Objetivo

Na troca de tema, as cores da tela inteira passam aos poucos de um tema para o outro, e o ícone do toggle se
transforma de um tema para o outro. A tela continua sem mudar de cor em pedaços e continua clicável
durante a troca.

## Histórias de usuário

- Como **qualquer pessoa**, quero que a troca de tema seja suave, para não levar um susto com a mudança de
  brilho.
- Como **pessoa sensível a movimento**, quero que a troca continue sem animações de movimento.

## Regras de negócio

- RN-01: Ao usar o toggle, as cores da tela inteira passam do tema anterior para o novo em cerca de meio
  segundo. Todas as áreas mudam juntas: nenhuma parte da tela termina antes das outras.
- RN-02: O ícone do toggle gira e cresce do ícone anterior para o novo, ao mesmo tempo que a tela.
- RN-03: Clicar de novo durante a transição não espera a animação acabar: o tema troca na hora e as cores
  voltam a partir de onde estão.
- RN-04: Com a preferência do sistema por menos movimento, o ícone não gira. A tela mantém a passagem gradual
  das cores, que não tem movimento e evita o salto de brilho.
- RN-05: Quando o tema muda por causa de outra aba (spec 034), a troca é imediata, sem animação.
- RN-06: A página continua clicável durante a troca. O ícone fica parado quando a página carrega e só anima
  depois de uma troca.
- RN-07: Nada mais muda na spec 034: a escolha continua guardada, o toggle continua acessível pelo teclado
  e a página não pisca no carregamento.

## Critérios de aceite

- **CA-01:** Dado o tema claro, quando a pessoa usa o toggle, então as cores passam aos poucos para o escuro e,
  ao fim, o tema escuro está ativo e guardado.
- **CA-02:** Dado o tema escuro, quando a pessoa usa o toggle, então o ícone passa da lua para o sol, girando,
  junto com a tela.
- **CA-03:** Dado uma transição em andamento, quando a pessoa clica de novo, então o tema volta na hora e o
  estado final é o do último clique.
- **CA-04:** Dado o sistema com menos movimento, quando a pessoa troca o tema, então o ícone troca sem girar.
- **CA-05:** Dado duas abas abertas, quando a outra aba troca o tema, então esta aba muda sem animação.
- **CA-06 (falha):** Dado uma troca em andamento, quando a pessoa clica no toggle ou em outro ponto da tela,
  então o clique não se perde. Ao carregar a página, o ícone não anima.
- **CA-07 (falha):** Dado o armazenamento do navegador bloqueado, quando a pessoa troca o tema com a
  transição, então o tema muda e vale até fechar a página (spec 034).

## Fora de escopo

- Revelação circular ou outras animações de movimento da tela inteira.
- Som ou vibração ao trocar o tema.
- Seguir automaticamente o tema do sistema operacional.

## Dúvidas em aberto

- Nenhuma. A RN-04 ficou como escrita, e a troca de abordagem durante a implementação está no `plan.md`.
