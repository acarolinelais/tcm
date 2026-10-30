# 035. Exportar tabelas para Excel: Spec

- **Status:** Concluída
- **Data:** 2026-10-29
- **Specs relacionadas:** 004, 007, 022, 033
- **ADRs relacionados:** 0022, 0034

## Problema

As listagens do sistema só podem ser consultadas na tela, 20 itens por vez. Quem precisa analisar, compartilhar
ou arquivar esses dados (gerente acompanhando Test Cases, administrador revisando usuários) copia página por página
à mão, o que é lento e sujeito a erro.

## Objetivo

Toda listagem passa a oferecer exportação para uma planilha Excel em dois modos: **a página atual** (exatamente o
que está na tela) e **todos os itens** (todas as páginas), sempre respeitando os filtros aplicados.

## Histórias de usuário

- Como **pessoa usuária**, quero exportar a página que estou vendo para trabalhar só com aqueles itens.
- Como **pessoa usuária**, quero exportar todos os itens da listagem, não só a página atual, para analisar o
  conjunto completo fora do sistema.
- Como **pessoa usuária**, quero que a exportação respeite os filtros que apliquei, para não ter que filtrar de novo
  na planilha.

## Regras de negócio

- RN-01: Toda listagem de dados do sistema oferece a exportação: Usuários, Setores, Times, Membros do time, Perfis,
  Modelos de dispositivo, Projetos, Test Cases do projeto, Form Factor, resultados de Form Factor e Resultados Gerais.
- RN-02: Há dois modos: **Página atual** (os itens visíveis, na ordem da tela) e **Todos os itens** (todas as
  páginas, na mesma ordem da listagem).
- RN-03: Os dois modos respeitam os filtros aplicados no momento da exportação.
- RN-04: A planilha tem as mesmas colunas visíveis da tabela, na mesma ordem e com os mesmos títulos, no idioma da
  interface. Colunas só de interação (ações por linha, seleção) não entram.
- RN-05: Os valores saem como texto legível, iguais aos da tela (status traduzido, nomes em vez de identificadores,
  datas no formato exibido). Listas numa célula (ex.: gerentes de um setor) saem separadas por vírgula.
- RN-06: A exportação só contém o que a pessoa já pode ver na listagem; ela não amplia o escopo de permissão.
- RN-07: O arquivo se chama `<listagem>_<AAAA-MM-DD>.xlsx` (ex.: `usuarios_2026-10-29.xlsx`) e tem uma única aba.
- RN-08: Com a listagem vazia (sem dados ou sem resultado para o filtro), a exportação fica indisponível.
- RN-09: Enquanto **Todos os itens** é gerado, a ação mostra que está em andamento e não pode ser disparada de novo.

## Critérios de aceite

- **CA-01:** Dado uma listagem com 45 itens na página 2 de 20, quando a pessoa escolhe "Exportar página atual",
  então baixa uma planilha com os 20 itens da página 2, na ordem da tela.
- **CA-02:** Dado uma listagem com 45 itens, quando a pessoa escolhe "Exportar todos", então baixa uma planilha com
  os 45 itens.
- **CA-03:** Dado um filtro de status "Ativo" que deixa 30 de 45 itens, quando a pessoa escolhe "Exportar todos",
  então a planilha tem só os 30 itens ativos.
- **CA-04:** Dado a interface em inglês, quando a pessoa exporta, então os títulos das colunas e os valores
  traduzidos (status etc.) saem em inglês; a coluna de ações não aparece.
- **CA-05:** Dado uma exportação feita em 29/10/2026 na listagem de usuários, quando o arquivo é baixado, então ele
  se chama `usuarios_2026-10-29.xlsx`.
- **CA-06:** Dado cada listagem da RN-01, quando a tela abre com dados, então a ação de exportar está disponível com
  os dois modos.
- **CA-07 (falha):** Dado uma listagem sem itens (ou um filtro sem resultado), quando a tela é exibida, então a
  ação de exportar fica desabilitada.
- **CA-08 (falha):** Dado que a busca de uma das páginas falha durante "Exportar todos", quando o erro acontece,
  então nenhum arquivo parcial é baixado e a pessoa vê uma mensagem de erro que permite tentar de novo.
- **CA-09 (falha):** Dado "Exportar todos" em andamento, quando a pessoa tenta disparar de novo, então a ação está
  bloqueada até a primeira terminar.
- **CA-10 (falha):** Dado uma pessoa com escopo restrito (ex.: gerente que vê só os times do próprio setor), quando
  exporta todos, então a planilha não traz nenhum item fora do escopo dela.

## Fora de escopo

- Outros formatos (CSV, PDF) e escolha de colunas pela pessoa.
- Prévia e lista de erros da importação de planilha (spec 016): não são listagens de dados salvos.
- Exportação agendada, por e-mail ou em segundo plano.
- Formatação avançada na planilha (cores, fórmulas, várias abas).
- Reimportar a planilha exportada.

## Dúvidas em aberto

- Limite máximo de itens em "Todos os itens"? Proposta: sem limite nesta spec; se uma listagem passar de alguns
  milhares de itens, revisitamos no plan.
- Ordem das colunas de modelos no Form Factor (dinâmicas por projeto): seguir a da tela.
