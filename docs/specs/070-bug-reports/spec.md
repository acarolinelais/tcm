# 070. Bug Reports: Spec

- **Status:** Aprovada
- **Data:** 2026-11-09
- **Specs relacionadas:** 060 (importação do relatório SDF), 065 (resultado mais recente por device), 066 (FAIL
  devolve o caso para In Fixes), 068 (o que o dev enxerga), 069 (projetos encerrados)

## Problema

Quando um caso falha no SDF, o FAIL e o motivo ficam gravados, mas espalhados: é preciso abrir a General Results ou
o próprio caso para ver o que falhou, em qual device e por quê. Não há um lugar com todas as falhas em aberto, e o
KP não tem de onde partir para distribuir as correções para os devs.

## Objetivo

Uma página **Bug Reports** lista as falhas em aberto do SDF: cada caso cujo resultado mais recente em algum device é
FAIL, com o motivo. O KP distribui a correção trocando o responsável do caso ali mesmo, e o caso aparece para o dev
na tabela de Test Cases, como qualquer outro caso dele.

## Histórias de usuário

- Como **KP** ou **gerente**, quero ver numa página só os casos que estão falhando no SDF, com device e motivo,
  para saber o que precisa de correção.
- Como **KP**, quero escolher o dev que vai corrigir cada falha, para distribuir o trabalho sem sair da página.
- Como **dev**, quero ver as falhas dos meus casos com o motivo, para começar a correção sem procurar o relatório.

## Regras de negócio

- RN-01: Uma **falha em aberto** é um par caso + device em que o resultado mais recente desse device é FAIL. O mais
  recente segue a regra da General Results e da End date (specs 059 e 065), e a comparação com FAIL ignora
  maiúsculas, minúsculas e espaços nas pontas. Valores que não são FAIL (PASS, N/A, check, vazio) não entram.
- RN-02: Quando chega um resultado mais novo que não é FAIL para aquele device, a falha sai da página. Não há
  ação de "resolver" à mão.
- RN-03: Cada falha em aberto é uma linha, com: TC ID, título do caso, projeto, device, SDF ID, motivo (a descrição
  do resultado), data da execução, Status do caso e responsável. Um caso com FAIL em dois devices aparece em duas
  linhas.
- RN-04: Casos Done, Excluded ou Cancelled não aparecem, mesmo com FAIL no histórico ou como resultado mais
  recente de algum device. Os outros Status entram.
- RN-05: Projetos encerrados ficam de fora, como no Board e na General Results (spec 069).
- RN-06: Quem vê a página e o que vê segue a General Results: a gestão (admin da unidade, gerente e KP) vê as
  falhas do seu escopo; o **dev** vê só as falhas dos casos em que é o responsável ou o backup (spec 068).
- RN-07: A tabela segue as regras de tabela do projeto: 20 linhas por página, filtros por projeto, device e
  responsável (busca pelo ID do responsável, como na General Results), e os estados de carregando, vazio e erro. A ordem padrão é a data da execução, da mais recente para
  a mais antiga.
- RN-08: Quem já pode mudar o responsável de um caso pela edição do caso (a gestão do time do projeto) pode fazer
  isso pela linha da falha, com as mesmas regras e recusas: o novo responsável é membro ativo do time e não é o
  backup do caso. O dev não tem essa ação.
- RN-09: Trocar o responsável vale para o caso inteiro, não só para aquela falha: se o caso tem FAIL em dois
  devices, as duas linhas passam a mostrar o novo responsável.
- RN-10: A página só lê os resultados. Ela não muda Status, resultado nem motivo.
- RN-11: O TC ID da linha abre o painel de detalhes do caso, como nas tabelas do projeto (specs 028 e 030). A página própria do Test Case (spec 040) ainda é rascunho.

## Critérios de aceite

- **CA-01:** Dado o caso Clock_000002 com FAIL no SM-1234 e motivo "Crash ao girar a tela", quando o KP abre Bug
  Reports, então aparece uma linha com Clock_000002, SM-1234, o SDF ID, o motivo, a data da execução, o Status e o
  responsável.
- **CA-02:** Dado o caso Clock_000003 com FAIL no SM-1234 e, depois, PASS no mesmo device, quando o KP abre a
  página, então Clock_000003 não aparece.
- **CA-03:** Dado o caso Clock_000004 com PASS no SM-1234 e, depois, FAIL no mesmo device, quando o KP abre a
  página, então Clock_000004 aparece com o motivo do FAIL.
- **CA-04:** Dado o caso Clock_000005 com FAIL no SM-1234 e no SM-S948B, quando o KP abre a página, então o caso
  aparece em duas linhas, uma por device.
- **CA-05 (falha):** Dado um caso Done com FAIL no histórico, inclusive como resultado mais recente do SM-1234,
  quando o KP abre a página, então o caso não aparece.
- **CA-06:** Dado 25 falhas em aberto, quando o KP abre a página, então vê 20 e a paginação leva às outras 5.
- **CA-07:** Dado falhas nos projetos Clock e Camera, quando o KP filtra por Clock, então só as falhas de Clock
  aparecem.
- **CA-08:** Dado uma falha do caso Clock_000002, quando o KP muda o responsável dela para Ana, então a linha mostra
  Ana e o caso aparece para Ana na tabela de Test Cases.
- **CA-09:** Dado o caso Clock_000005 com falha em dois devices, quando o KP muda o responsável numa das linhas,
  então as duas linhas mostram o novo responsável.
- **CA-10:** Dado a dev Bia responsável por Clock_000002 e sem relação com Clock_000006, ambos com FAIL, quando Bia
  abre a página, então vê só a falha de Clock_000002 e não tem a ação de mudar responsável.
- **CA-11:** Dado nenhuma falha em aberto no escopo, quando alguém abre a página, então vê o estado vazio dizendo que
  não há falhas no SDF.
- **CA-12 (falha):** Dado um caso Excluded com FAIL no SM-1234, quando o KP abre a página, então o caso não aparece.
- **CA-13 (falha):** Dado um projeto encerrado com casos em FAIL, quando o KP abre a página, então essas falhas não
  aparecem.
- **CA-14 (falha):** Dado um caso de outro time, quando o KP tenta mudar o responsável dele, então o sistema recusa
  com a mesma mensagem da troca de responsável que já existe.
- **CA-15 (falha):** Dado um resultado N/A ou vazio como o mais recente de um device, quando o KP abre a página,
  então esse par caso + device não aparece.

## Fora de escopo

- Planejamento e data de entrega do projeto (fica para a spec seguinte).
- "Sprint de manutenção" como conceito no sistema: a distribuição é só a troca de responsável.
- Mudar o responsável de várias falhas de uma vez (a ação em lote é a spec 043, ainda em rascunho).
- Marcar uma falha como resolvida à mão, comentar ou anexar evidência pela página (o caso já tem comentários e
  evidências).
- Exportar a página para Excel.
- Notificar o dev quando recebe uma falha (além do que a troca de responsável já notifica hoje).

## Decisões (2026-11-09)

- O nome da página no menu é **Bug Reports**.
- Caso Done não aparece, mesmo com FAIL no histórico (RN-04).
