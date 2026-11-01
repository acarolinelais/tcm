# 052. Tela de auditoria: Spec

- **Status:** Concluída
- **Data:** 2026-10-30
- **Depende de:** spec 038 (histórico gravado no banco) e [ADR 0044](../../adr/0044-auditoria-por-triggers-no-postgresql.md)

## Problema

Desde a spec 038, toda mudança em Test Cases e links de PR fica registrada, com autor, perfil, origem e tela.
Mas só dá para ver esses registros caso a caso, no painel de cada Test Case. Quem administra a unidade não
consegue responder perguntas que cruzam casos e projetos: o que uma pessoa mudou ontem, quais casos foram
excluídos neste mês, que mudanças vieram do Form Factor.

## Objetivo

O administrador da unidade ganha a tela Auditoria, em Administration. Ela lista todos os registros da
unidade, com filtros, e abre o detalhe de cada um.

## Histórias de usuário

- Como **administrador da unidade**, quero ver tudo o que uma pessoa alterou num período, para entender um
  problema relatado.
- Como **administrador da unidade**, quero filtrar as exclusões e as mudanças de Status de um projeto, para
  conferir decisões da gestão.
- Como **administrador da unidade**, quero exportar os registros filtrados, para anexar a uma análise.

## Regras de negócio

- RN-01: A tela Auditoria fica em Administration e só aparece para o administrador da unidade. Outros perfis
  não veem o item e não acessam o endereço nem os dados.
- RN-02: A tela mostra os registros da unidade de quem está logado, do mais recente para o mais antigo. Nunca
  aparece registro de outra unidade.
- RN-03: Cada linha é um registro, ou seja, uma gravação. Ela mostra data e hora, usuário, perfil, ação,
  Test Case, projeto, resumo das alterações, origem e tela.
  - A ação é Criação, Alteração, PR incluído ou PR removido.
  - Quando uma gravação muda vários campos, o resumo mostra o primeiro e "+N".
- RN-04: Os valores aparecem como no resto do sistema: Status e demais opções com o rótulo traduzido, e
  responsável e Backup pelo nome. Nome e perfil do autor são os do momento da mudança (spec 038, RN-02).
  Registro sem autor (seed ou script) mostra "—".
- RN-05: Filtros:
  - período (data inicial e final);
  - usuário, com vários valores;
  - perfil;
  - ação;
  - Test Case, por texto;
  - projeto;
  - origem (API ou Form Factor);
  - tela, por texto.

  Combinar filtros mostra só o que atende a todos. Mudar um filtro volta para a primeira página.
- RN-06: A lista é paginada, com 20 registros por página por padrão (ADR 0034).
- RN-07: Ver o detalhe de um registro abre um painel lateral com todos os campos alterados ("campo: antes →
  depois"), autor, perfil, origem, a tela completa e a data e hora exatas. O painel tem um atalho para abrir o
  Test Case.
- RN-08: Exportar gera o Excel dos registros com os filtros aplicados, da página atual ou de todas as páginas,
  como as outras tabelas (spec 035).
- RN-09: A tela só lê. Nada nela altera ou apaga registros (spec 038, RN-05).

## Critérios de aceite

- **CA-01:** Dado o administrador da unidade, quando abre Administration, então vê o item Auditoria e, ao
  abrir, a lista dos registros da unidade do mais recente para o mais antigo.
- **CA-02:** Dado registros de Ana e Bia, quando o administrador filtra o usuário Ana e o período de ontem,
  então vê só as mudanças da Ana feitas ontem.
- **CA-03:** Dado uma gravação que mudou Status e Category, quando a linha aparece, então o resumo mostra a
  primeira mudança e "+1". Ao abrir o detalhe, o painel mostra as duas, com antes e depois.
- **CA-04:** Dado um FAIL lançado numa rodada, quando o administrador filtra a origem Form Factor, então a
  mudança de Status para In Fixes aparece com a origem Form Factor.
- **CA-05:** Dado 45 registros, quando a tela abre, então mostra 20 e o total de 45, e a página 3 mostra 5.
- **CA-06:** Dado filtros aplicados, quando o administrador exporta todas as páginas, então o Excel tem só os
  registros que atendem aos filtros.
- **CA-07 (falha):** Dado um gerente, KP ou dev, quando tenta abrir o endereço da tela ou consultar os
  registros, então o acesso é recusado e o item não aparece no menu.
- **CA-08 (falha):** Dado registros de outra unidade, quando o administrador consulta a auditoria, então eles
  nunca aparecem, nem com filtros.
- **CA-09 (falha):** Dado filtros sem nenhum resultado, quando a lista carrega, então aparece "Nenhum registro
  encontrado" com o botão "Limpar filtros", que volta à lista completa.
- **CA-10 (falha):** Dado uma data final anterior à inicial, quando o administrador aplica o período, então o
  filtro é recusado com uma mensagem e a lista não muda.

## Fora de escopo

- Auditoria de outras entidades (usuários, projetos, times, rodadas). Por enquanto só Test Cases e links de
  PR são auditados. Quando outras tabelas entrarem, a tela ganha uma coluna Entidade.
- Acesso por gerente ou por permissão configurável.
- Alterar, apagar ou anotar registros.
- Alertas e relatórios agendados.
- A seção Histórico no painel do Test Case, que é a Fase 4 da spec 038.

## Dúvidas em aberto

- Nenhuma. A tela mostra uma linha por registro, com o detalhe no painel lateral, e por enquanto cobre só Test
  Cases e links de PR.
