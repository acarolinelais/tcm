# 038. Histórico de alterações do Test Case: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

Quando o Status, o responsável ou o Backup de um Test Case muda, o valor anterior se perde. A gestão não
sabe quem moveu um caso para `Done`, quem o excluiu (fora de escopo na spec 026) nem quanto tempo ele ficou
em cada etapa. Sem esse registro, também não dá para medir desempenho (Overview) nem montar uma linha do
tempo do projeto.

## Objetivo

Cada mudança relevante em um Test Case passa a ficar registrada com autor, data e hora e os valores antes e
depois. Quem pode ver o caso consegue ler esse histórico no painel de detalhes.

## Histórias de usuário

- Como **gerente ou KP**, quero ver quem mudou o Status de um caso e quando, para entender o andamento.
- Como **dev**, quero ver o histórico dos casos que acompanho, para saber o que aconteceu enquanto estive fora.
- Como **administrador da unidade**, quero saber quem excluiu um caso, para tirar dúvidas sobre a decisão.

## Regras de negócio

- RN-01: Geram um registro no histórico: mudança de Status, troca do responsável principal, troca do Backup,
  transferência para o Backup, exclusão (com a justificativa da spec 026), inclusão e remoção de link de PR
  e criação do caso (manual ou por planilha).
- RN-02: Cada registro guarda o tipo da mudança, o valor anterior, o novo valor, quem fez e a data e hora.
- RN-03: A mudança e o registro acontecem juntos: se a mudança falhar, nenhum registro é criado, e não
  existe mudança sem registro.
- RN-04: Mudanças feitas pelo sistema (por exemplo, o Status que muda por um resultado de Form Factor, spec
  022) são registradas com a origem "Form Factor" e com a pessoa que lançou o resultado.
- RN-05: O histórico não pode ser editado nem apagado por nenhum perfil.
- RN-06: Pode ler o histórico quem pode ver o caso (ADR 0015). O histórico de um caso de outra unidade nunca
  é exibido.
- RN-07: O painel de detalhes ganha a seção Histórico, com os registros do mais recente para o mais antigo.
- RN-08: Os casos que já existem começam com o histórico vazio. Não há reconstrução do passado.

## Critérios de aceite

- **CA-01:** Dado um caso em `In Progress`, quando o dev principal o move para `In Review`, então o histórico
  mostra "In Progress → In Review", o nome do dev e a data e hora.
- **CA-02:** Dado um caso excluído com a justificativa "Sem hardware", quando um gerente abre o histórico, então
  vê quem excluiu, quando e a justificativa.
- **CA-03:** Dado um resultado FAIL lançado numa rodada, quando o caso vai para `In Fixes`, então o histórico
  registra a mudança com a origem Form Factor e o autor do lançamento.
- **CA-04:** Dado um caso com Backup, quando o caso é transferido para o Backup, então o histórico mostra o
  responsável anterior e o novo.
- **CA-05 (falha):** Dado uma mudança de Status recusada (dev que não é dono do caso), quando a operação falha,
  então nenhum registro novo aparece no histórico.
- **CA-06 (falha):** Dado um usuário de outra unidade, quando ele tenta ler o histórico do caso, então o acesso
  é recusado como caso inexistente.
- **CA-07 (falha):** Dado qualquer perfil, quando tenta alterar ou apagar um registro do histórico, então não
  existe forma de fazer isso.

## Fora de escopo

- Histórico de projetos, rodadas, usuários, times e modelos.
- Registrar a edição dos textos do caso (entra junto com a spec 040, se aprovada).
- Linha do tempo agregada por projeto ou time (Timeline, ainda indefinida).
- Exportar o histórico.

## Dúvidas em aberto

- Mudanças de Category, Difficulty, TC Situation e Automation Level também entram no histórico?
- Há prazo de retenção ou o histórico é guardado para sempre?
