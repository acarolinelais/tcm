# 046. Notificações dentro do sistema: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

O dev só descobre que recebeu um caso, que um caso voltou para `In Fixes` ou que alguém comentou quando abre a
lista e procura. Os avisos chegam tarde ou nem chegam.

## Objetivo

A barra superior ganha um sino com as notificações do que mudou nos casos da pessoa, para que ela saiba sem
precisar procurar.

## Histórias de usuário

- Como **dev**, quero ser avisado quando um caso for atribuído a mim ou voltar para `In Fixes`.
- Como **KP**, quero ser avisado quando um caso do meu time chegar a `In Validation`.
- Como **qualquer usuário**, quero ser avisado de comentários nos casos em que sou responsável.

## Regras de negócio

- RN-01: Geram notificação:
  - virar responsável principal ou Backup de um caso;
  - um caso próprio ir para `In Fixes` ou `Done`;
  - um novo comentário num caso próprio (spec 044);
  - para o KP do time, um caso chegar a `In Validation`.
- RN-02: Quem fez a mudança não recebe notificação dela.
- RN-03: O sino mostra quantas notificações não lidas a pessoa tem (com "9+" acima de 9). Ao abrir, aparece a
  lista das mais recentes, com o texto, o caso e o tempo decorrido.
- RN-04: Clicar numa notificação a marca como lida e abre o caso (spec 040). Há a ação "Marcar todas como lidas".
- RN-05: As notificações aparecem sem recarregar a página, com atraso máximo de 1 minuto.
- RN-06: Notificações com mais de 90 dias são descartadas.
- RN-07: A pessoa só recebe notificações de casos que ela pode ver.

## Critérios de aceite

- **CA-01:** Dado a Ana logada, quando um KP a define como responsável de um caso, então em até 1 minuto o sino
  mostra 1 não lida com "Você é a responsável pelo TC-0123".
- **CA-02:** Dado uma notificação não lida, quando a Ana clica nela, então o caso abre e o contador diminui.
- **CA-03:** Dado 5 não lidas, quando a pessoa usa "Marcar todas como lidas", então o contador some.
- **CA-04 (falha):** Dado o KP que muda o Status de um caso dele mesmo, quando a mudança é salva, então ele não
  recebe notificação.
- **CA-05 (falha):** Dado uma notificação de outra pessoa, quando alguém tenta marcá-la como lida pelo endereço
  direto, então é recusado.

## Fora de escopo

- Notificações por e-mail, Teams ou push no navegador.
- Preferências por tipo de notificação.
- Menções em comentários.

## Dúvidas em aberto

- A lista de eventos que notificam (RN-01) está completa? A gestão quer ser avisada de algo?
- Um atraso de até 1 minuto é aceitável, ou precisa ser imediato?
- Depende das specs 038 (eventos), 040 (página do caso) e 044 (comentários).
