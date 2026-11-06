# 063. Overview com gráficos para KP e dev: Spec

- **Status:** Aprovada
- **Data:** 2026-11-05
- **Substitui em parte:** spec 039 (os cards e os 2 gráficos atuais mudam; o escopo por perfil, a RN-01, continua)
- **Continua em:** spec 064 (gerente e admin da unidade)

## Problema

A Overview mostra os mesmos 4 cards e os mesmos 2 gráficos para todos os perfis. O KP não vê se o time está
no ritmo planejado nem como cada pessoa está indo. O dev não vê o próprio ritmo de entrega. O gerente não vê o
andamento de cada time. Cada um abre outras telas e faz a conta de cabeça.

## Objetivo

Cada perfil abre a Overview e encontra os gráficos que respondem às perguntas do seu dia a dia, com os dados do
seu escopo. Esta spec cobre o KP e o dev; o gerente e o admin ficam na spec 064, que reaproveita as
regras gerais daqui. O visual segue o protótipo do Figma (cards, cores e fontes):
https://www.figma.com/design/Klnf2iLbJVqC3X09ammwyL/Test-Case-Manager?node-id=2580-4911

## Histórias de usuário

- Como **KP**, quero comparar o planejado com o executado em cada projeto, para saber se o time está atrasado.
- Como **KP**, quero ver quanto cada dev do time concluiu, para equilibrar a distribuição dos Test Cases.
- Como **dev**, quero ver quanto entreguei por dia e por semana, para acompanhar o meu ritmo.

## Regras de negócio

**Gerais**
- RN-01: O escopo de cada perfil não muda (spec 039, RN-01). Test Cases `Excluded` não entram em nenhum gráfico.
- RN-02: "Finalizado" e "entregue" significam entrar em `Done`. A data de entrega é a da última entrada em
  `Done`, pelo histórico da spec 038.
- RN-03: Os gráficos por dia mostram os últimos 30 dias, e os por semana, as últimas 12 semanas (de segunda a
  domingo), sempre contando o dia ou a semana de hoje.
- RN-04: Nos gráficos de um projeto só (burndown e Pass Rate), a pessoa escolhe o projeto. A tela abre no primeiro
  projeto ativo do escopo, em ordem alfabética.
- RN-05: Cada gráfico tem título, mostra o valor de cada ponto ao passar o mouse ou focar pelo teclado, e tem um
  resumo em texto para leitor de tela. Um gráfico sem dados mostra o seu próprio estado vazio, sem esconder os
  outros.
- RN-06: Sem nenhum Test Case no escopo, a página inteira mostra o estado vazio (spec 039, RN-05). O modo de
  demonstração continua com dados de exemplo.

**KP**
- RN-07: Burndown do projeto escolhido: a linha de executado mostra, a cada dia, quantos Test Cases do projeto
  ainda não estão `Done`. A linha de planejado começa no mesmo valor do primeiro dia e cai 2 Test Cases por dia
  útil (de segunda a sexta, sem feriados), até zero. A meta de 2 por dia vale para todos os projetos até existir o planejamento por projeto.
- RN-08: Pass Rate por modelo: na rodada de Form Factor mais recente do projeto escolhido, a porcentagem de
  resultados `PASS` de cada modelo de dispositivo.
- RN-09: Média de criação por dia: para cada projeto do escopo, os Test Cases criados nos últimos 30 dias,
  divididos por 30.
- RN-10: Finalizados por dev: para cada pessoa do time com o perfil Developer (ajuste de 2026-11-06: KP e
  gerente ficam fora), quantos Test Cases em que ela é a responsável principal
  estão `Done`, desde sempre.
- RN-11: Finalizados por semana: quantos Test Cases do escopo entraram em `Done` em cada uma das últimas 12 semanas.
- RN-12: Done por projeto: uma barra para cada projeto do escopo, com a porcentagem dos seus Test Cases que está
  `Done`.

**Dev** (os gráficos contam só os Test Cases em que é responsável principal; os cards seguem a spec 039)
- RN-13: Os cards ficam Completed, Assigned e In Progress, no estilo do protótipo. O card de total (All) sai.
- RN-14: Total de Done: quantos estão `Done`, contra o total atribuído.
- RN-15: Por dificuldade: quantos Test Cases há em cada dificuldade (Low, Medium e High).
- RN-16: Entregas por dia (últimos 30 dias) e por semana (últimas 12 semanas).

## Critérios de aceite

- **CA-01:** Dado um projeto com 20 Test Cases não `Done` no primeiro dos 30 dias, quando o KP abre o burndown,
  então o planejado começa em 20 e cai 2 por dia útil, e o executado mostra o que faltava em cada dia.
- **CA-02:** Dado dois projetos no time, quando o KP escolhe o segundo, então o burndown e o Pass Rate passam a
  mostrar só esse projeto.
- **CA-03:** Dado uma rodada recente com 4 resultados de um modelo, 3 deles `PASS`, quando o KP abre o Pass Rate,
  então esse modelo mostra 75%. Uma rodada mais antiga não conta.
- **CA-04:** Dado 15 Test Cases criados num projeto nos últimos 30 dias, quando o KP abre a média de criação,
  então o projeto mostra 0,5 por dia.
- **CA-05:** Dado uma dev responsável por 3 Test Cases `Done` e Backup de outro, quando o KP abre Finalizados
  por dev, então ela aparece com 3.
- **CA-06:** Dado 2 Test Cases que entraram em `Done` na semana passada, quando o KP abre Finalizados por semana,
  então a semana passada mostra 2.
- **CA-07:** Dado um projeto com 10 Test Cases, 4 `Done` e 1 `Excluded`, quando o KP abre Done por projeto, então
  o projeto mostra 44% (4 de 9).
- **CA-08:** Dado um dev com 2 Test Cases Low e 1 High, quando abre a Overview, então vê Low 2, Medium 0 e High 1,
  e não vê o card de total.
- **CA-09:** Dado um gráfico na tela, quando a pessoa foca nele pelo teclado, então ouve o título e o resumo e
  consegue percorrer os valores.
- **CA-10 (falha):** Dado um projeto sem nenhuma rodada de Form Factor, quando o KP o escolhe, então o Pass Rate
  mostra o estado vazio e os outros gráficos continuam na tela.
- **CA-11 (falha):** Dado um KP do time A, quando abre a Overview, então nenhum projeto nem pessoa do time B
  aparece, nem como opção do seletor.
- **CA-12 (falha):** Dado a API falhando ao carregar a Overview, quando a pessoa abre a página, então vê a
  mensagem de erro com a opção de tentar de novo.

## Fora de escopo

- Cadastrar o planejamento por projeto (meta diária, datas, feriados). Fica a proposta abaixo para uma spec própria.
- Escolher o período dos gráficos. Fica fixo em 30 dias ou 12 semanas.
- Exportar gráficos ou dados.
- Atualizar os gráficos em tempo real.

## Proposta para o planejamento por projeto (próxima spec)

Cada projeto ganha um planejamento, editado pelo KP do time ou pelo gerente: data de início, data alvo de
fim e os dias sem trabalho (feriados, pausas). A linha de planejado sai do escopo do projeto dividido pelos dias
úteis entre o início e a data alvo. Quando o escopo muda (Test Cases importados ou excluídos), a linha é
recalculada a partir daquele dia, e o burndown marca o ponto da mudança. Sem planejamento cadastrado, vale a
meta padrão de 2 por dia.

## Decisões (2026-11-05)

- Dia útil no burndown é de segunda a sexta, sem feriados (RN-07).
- Finalizados por dev conta todos os `Done`, sem limite de período (RN-10).
- Done por projeto é uma barra por projeto, e não um histograma por faixas (RN-12).
- A spec foi dividida: o gerente e o admin da unidade ficaram na spec 064.
