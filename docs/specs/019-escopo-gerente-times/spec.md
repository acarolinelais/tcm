# 019. Escopo do gerente nos times em que participa: Spec

- **Status:** Concluída
- **Data:** 2026-10-25
- **ADR:** [0036](../../adr/0036-escopo-gerente-inclui-times-em-que-participa.md)

## Problema
Um gerente pode trabalhar num time de um setor que ele não gerencia. Hoje ele abre o projeto desse time e
vê os resultados do Form Factor, mas não vê os Test Cases, não sabe quem é responsável por cada caso e não
consegue gerenciar nada. Cada parte da área de Projetos aplica uma regra diferente para o mesmo gerente.

## Objetivo
O gerente tem acesso completo aos projetos dos times dos setores que gerencia **e** dos times em que
participa: vê e gerencia projetos, Test Cases, responsáveis e resultados Form Factor, sempre com a mesma
regra.

## Histórias de usuário
- Como **gerente que participa de um time de outro setor**, quero ver e gerenciar os projetos e Test Cases
  desse time para acompanhar o trabalho em que estou envolvido.
- Como **gerente**, quero ver quem é responsável por cada Test Case, na aba Test Cases e no Form Factor,
  para cobrar e redistribuir o trabalho.

## Regras de negócio
- RN-01: Um time está no escopo do gerente quando pertence a um setor que ele gerencia ou quando o gerente
  é membro ativo do time. As duas formas dão exatamente o mesmo acesso.
- RN-02: Nos times do escopo, o gerente, respeitando as permissões do perfil:
  - lista, abre, cria (manualmente ou pela planilha) e edita projetos;
  - vê e gerencia Test Cases, incluindo responsável e backup;
  - vê os membros do time, que preenchem a coluna Assignee, os filtros e os seletores de responsável;
  - vê e importa resultados Form Factor.
- RN-03: Os times em que o gerente participa aparecem para ele na escolha de time ao criar um projeto.
- RN-04: Participar de um time não permite ao gerente alterar quem faz parte do time nem os papéis dos
  membros. Isso continua exigindo gerenciar o setor (ADR 0021).
- RN-05: Quando o gerente deixa de ser membro do time e não gerencia o setor, ele perde o acesso aos
  projetos desse time.
- RN-06: Administrador da unidade, KP e Developer mantêm as regras atuais.

## Critérios de aceite
- **CA-01:** Dado um gerente membro ativo de um time de setor que ele não gerencia, quando ele lista
  projetos, então os projetos desse time aparecem.
- **CA-02:** Dado esse gerente, quando ele abre a aba Test Cases de um projeto do time, então vê os casos
  com a coluna Assignee preenchida, e o filtro Assignee oferece os membros ativos do time.
- **CA-03:** Dado esse gerente, quando ele cria um Test Case, edita responsável e backup ou altera o Status
  de um caso do projeto, então a alteração é gravada.
- **CA-04:** Dado esse gerente, quando ele abre a aba Form Factor, então a coluna Assignee e o filtro
  mostram os membros do time.
- **CA-05:** Dado esse gerente, quando ele cria um projeto (manualmente ou pela planilha) escolhendo esse
  time, então o time aparece entre as opções e o projeto é criado.
- **CA-06:** Dado um gerente que gerencia o setor do time, sem ser membro, quando ele faz as mesmas ações
  de CA-01 a CA-05, então continua conseguindo, como hoje.
- **CA-07 (falha):** Dado um gerente que não gerencia o setor e não é membro do time (ou deixou de ser),
  quando ele tenta listar, abrir, criar ou alterar projetos e Test Cases desse time, ou consultar seus
  membros e o Form Factor, então o acesso é recusado e o projeto não aparece na listagem.
- **CA-08 (falha):** Dado um gerente que só participa do time, quando ele tenta adicionar ou remover
  membros ou mudar papéis no time, então a operação é recusada.
- **CA-09 (falha):** Dado um gerente membro do time, mas cujo perfil não tem a permissão de gerenciar
  Test Cases, quando ele tenta criar ou editar um caso, então a operação é recusada por falta de
  permissão.
- **CA-10 (falha):** Dado um time de outra unidade, quando um gerente tenta acessá-lo por qualquer caminho,
  então o acesso é recusado como inexistente.

## Fora de escopo
- Mudanças nas permissões dos perfis ou no catálogo de permissões.
- Mudanças para administrador, KP ou Developer.
- Gestão de setores, de times e de membros pelo gerente (continua no ADR 0021).
- Itens que já estavam no backlog da spec 018, como o hook `useImportarRelatorioSdf` sem uso.

## Dúvidas em aberto
- Nenhuma.
