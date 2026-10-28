# 028. Detalhes do Test Case (Title, Precondition, Procedure e Expected Result): Spec

- **Status:** Concluída
- **Data:** 2026-10-28

## Problema

A planilha de importação de Test Cases já traz, para cada caso, o **Title(English)**, a **Test
Precondition(English)**, o **Test Procedure(English)** e o **Expected Result(English)**. Desde a spec 027
essas colunas fazem parte do modelo de planilha, mas a importação as ignora. Resultado: quem executa o caso
(principalmente o dev) só vê o TC ID na tabela e precisa voltar à planilha para saber o que testar, em que
condição e o que esperar.

## Objetivo

Os quatro textos passam a ser guardados no Test Case quando a planilha é importada. Na tabela de Test Cases, o
TC ID vira um link que abre um painel lateral, só de leitura, com o título, a pré-condição, o procedimento e o
resultado esperado do caso.

## Histórias de usuário

- Como **dev**, quero abrir os detalhes de um Test Case a partir da tabela para executar o caso sem consultar a
  planilha.
- Como **gestão do projeto**, quero que a importação guarde os textos de cada caso para que o time tenha tudo no
  sistema.

## Regras de negócio

- RN-01: Os quatro textos são **opcionais**. Coluna ausente ou célula vazia deixa o texto vazio, sem erro. As
  colunas obrigatórias de antes continuam obrigatórias.
- RN-02: As colunas são encontradas pelo nome do cabeçalho, sem diferenciar maiúsculas de minúsculas, como as
  demais (spec 027, RN-05).
- RN-03: O texto é guardado como veio da planilha, **preservando as quebras de linha**. Espaços em branco no
  início e no fim são removidos; um texto só com espaços vale como vazio.
- RN-04: Limites de tamanho: **Title até 500 caracteres**; Precondition, Procedure e Expected Result **até
  10.000 caracteres** cada.
- RN-05: Texto acima do limite gera erro que indica a **linha**, a **coluna** e o limite, como os demais erros
  da planilha: nada é importado enquanto houver erro.
- RN-06: Os textos são **só de leitura** no sistema. Não há edição pela tabela, pelo painel de editar Test Case
  nem pelo formulário de criação; o Test Case criado manualmente fica sem textos.
- RN-07: Qualquer perfil que vê a tabela de Test Cases do projeto pode abrir o painel de detalhes de qualquer
  caso listado.
- RN-08: O painel segue o protótipo do Figma: um card flutuante à direita, com o TC ID como título e, nesta
  ordem, **Title**, **Test Precondition(English)**, **Test Procedure(English)** e **Expected Result(English)**
  (o nome indica o idioma do conteúdo, que vem em inglês da planilha). Cada seção tem o nome em destaque,
  seguido do texto como veio da planilha, só com as quebras de linha. Texto vazio aparece como um traço.
- RN-09: O painel é só de leitura. O rodapé tem **Cancel** e **Done**, como no Figma, e os dois apenas fecham o
  painel, porque não há o que confirmar. Ele também fecha com Esc, pelo X ou clicando fora.
- RN-10: O link no TC ID não interfere nas outras ações da linha (edição inline, menu de ações, justificativa
  de exclusão).
- RN-11: A prévia da planilha antes da importação **não** ganha colunas para esses textos.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01:** Dado uma planilha com os quatro textos preenchidos, quando a gestão importa, então cada Test Case
  é criado com os textos da sua linha.
- **CA-02:** Dado um Procedure com várias linhas na célula, quando o caso é importado e o painel é aberto, então
  o texto aparece com as mesmas quebras de linha.
- **CA-03:** Dado uma planilha sem as quatro colunas, ou com células vazias nelas, quando a gestão importa,
  então os casos são criados com os textos vazios e nenhum erro é apontado.
- **CA-04:** Dado uma célula com espaços antes e depois do texto, ou só com espaços, quando o caso é importado,
  então o texto fica sem os espaços das pontas, ou vazio.
- **CA-05:** Dado um Title com exatamente 500 caracteres e um Procedure com exatamente 10.000, quando a gestão
  importa, então a importação conclui.
- **CA-06 (falha):** Dado um Title com 501 caracteres na linha 4, quando a gestão importa, então nenhum caso é
  criado e o erro informa a linha 4, a coluna Title(English) e o limite de 500.
- **CA-07 (falha):** Dado um Expected Result com 10.001 caracteres e outro erro em outra linha, quando a gestão
  importa, então os dois erros são apresentados juntos e nada é importado.
- **CA-08:** Dado a tabela de Test Cases, quando qualquer perfil clica no TC ID de um caso, então abre o painel
  com o TC ID no título e os quatro textos na ordem da RN-08, cada um abaixo do nome da seção em destaque.
- **CA-09:** Dado um caso sem textos (criado antes desta mudança ou manualmente), quando o painel é aberto,
  então cada seção mostra um traço.
- **CA-10:** Dado o painel aberto, quando o usuário clica em Cancel, em Done ou no X, aperta Esc ou clica fora,
  então o painel fecha e a tabela continua no mesmo estado (filtros e página).
- **CA-11:** Dado o painel, quando ele é exibido, então não há campo editável nem ação de salvar.
- **CA-12:** Dado o teclado, quando o usuário navega até o TC ID e aperta Enter, então o painel abre, e ao
  fechar o foco volta para o TC ID.
- **CA-13 (falha):** Dado um caso que deixou de existir ou ficou fora do acesso do usuário depois que a tabela
  carregou, quando ele abre o painel, então vê uma mensagem de que o caso não foi encontrado, sem textos de
  outro caso.
- **CA-14:** Dado o painel de editar Test Case da gestão e o formulário de criação, quando são abertos, então
  não têm campos para os quatro textos.

## Fora de escopo

- Editar os textos no sistema (tabela, painel de edição ou formulário de criação).
- Preencher os textos dos Test Cases que já existem: a importação continua só criando casos, e um TC ID já
  cadastrado continua sendo recusado.
- Textos em outros idiomas além do inglês da planilha, e tradução automática.
- Mostrar os textos na prévia da planilha, nas tabelas de Form Factor ou nos resultados gerais.
- Busca ou filtro pelo conteúdo dos textos.
- Formatação rica (negrito, listas, links) **dentro** dos textos vindos da planilha: eles aparecem como texto
  simples, só com as quebras de linha. Os nomes das seções do painel ficam em destaque (RN-08).

## Dúvidas em aberto

Nenhuma. Decisões de 2026-10-28: o painel abre para todos os perfis (RN-07), os textos são só de leitura
(RN-06) e o Expected Result aparece no painel, mesmo fora do protótipo (RN-08).
