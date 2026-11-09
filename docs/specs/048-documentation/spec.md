# 048. Documentação de uso dentro do sistema: Spec

- **Status:** Concluída
- **Data:** 2026-10-30 (revisada em 2026-11-07)

## Problema

A opção Documentation da navegação lateral mostra "Em breve". Quem chega ao sistema não tem onde aprender o ciclo
de Status, o formato da planilha e do relatório SDF ou como funcionam as rodadas de Form Factor, e as mesmas
dúvidas voltam para a gestão. Também não há material pronto para apresentar o sistema a um time novo.

## Objetivo

Documentation vira uma central de ajuda com guias curtos por tarefa. Cada perfil vê primeiro o que é relevante
para ele, e cada guia tem uma versão em slides que pode ser baixada para treinamento.

## Histórias de usuário

- Como **dev novo**, quero entender o ciclo de Status e o que se espera de mim em cada etapa.
- Como **KP**, quero conferir o formato da planilha e do relatório SDF antes de importar.
- Como **gerente**, quero entender como uma rodada de Form Factor muda o Status dos casos.
- Como **gerente**, quero baixar os slides de um guia para apresentar o sistema a um time novo.

## Regras de negócio

- RN-01: A página lista os guias, nesta ordem:
  1. Primeiros passos: login, troca de senha, idioma e tema, o que cada item da navegação faz;
  2. Ciclo de Status do Test Case: as etapas, quem move cada uma, quando o sistema move sozinho e as datas
     Code done e End date (spec 065);
  3. Status e Situation: a diferença entre os dois campos;
  4. Importar projeto por planilha: colunas, formatos aceitos e erros comuns;
  5. Relatório SDF: formato do arquivo, efeito no Status (specs 060 e 066) e como desfazer a última
     importação (spec 067);
  6. General Results e Form Factor: rodadas, resultados por device e o que cada perfil vê (spec 068);
  7. Projetos encerrados: quando um projeto pode ser concluído e como exibir os encerrados (spec 069);
  8. Board e Timeline: filtros e leitura;
  9. Perfis e permissões: o que cada um dos quatro papéis pode fazer (ADR 0015);
  10. Exportar tabelas para Excel;
  11. Auditoria;
  12. Glossário: TC, KP, SDF, Form Factor, Backup, Pass Rate.
- RN-02: Os guias destacados no topo dependem do perfil: o dev vê primeiro Ciclo de Status e Status e
  Situation; o KP, Importar projeto e Relatório SDF; o gerente, General Results e Form Factor e Projetos
  encerrados; o admin, Perfis e permissões e Auditoria.
- RN-03: O texto dos guias segue o idioma da interface (spec 007). A primeira versão sai em inglês; um guia
  ainda sem tradução aparece em inglês, com um aviso.
- RN-04: Cada guia tem um endereço próprio, que pode ser compartilhado.
- RN-05: Há um campo para filtrar os guias pelo título.
- RN-06: Qualquer pessoa logada, de qualquer perfil, lê todos os guias e baixa todos os slides. Os guias não
  mostram dados do sistema.
- RN-07: Cada guia tem o botão "Download slides", que baixa um PDF com o mesmo conteúdo em formato de
  apresentação. Um guia sem PDF no idioma atual oferece o PDF em inglês; sem nenhum PDF, o botão não aparece.
- RN-08: Os slides seguem a identidade visual da empresa (azul #0024A5 dominante, verde #00DC00 só em detalhes,
  sem preto) e cabem em até 10 slides por guia.

## Critérios de aceite

- **CA-01:** Dado um dev logado, quando abre Documentation, então Ciclo de Status aparece em destaque.
- **CA-02:** Dado a interface em coreano e um guia traduzido, quando a pessoa abre o guia, então o texto está em
  coreano.
- **CA-03:** Dado o endereço do guia Importar projeto, quando alguém o abre, então o guia aparece direto.
- **CA-04:** Dado um guia com slides, quando a pessoa clica em "Download slides", então o navegador baixa o PDF
  do guia.
- **CA-05 (falha):** Dado o endereço de um guia inexistente, quando alguém o abre, então vê "Guia não
  encontrado" e um atalho para a lista.
- **CA-06 (falha):** Dado um filtro sem correspondência, quando a pessoa digita, então aparece "Nenhum guia
  encontrado".

## Fora de escopo

- Edição dos guias pelo próprio sistema (o conteúdo muda por PR, junto com a spec que altera o comportamento).
- Vídeos e tutoriais interativos.
- Busca no conteúdo dos guias pela busca global (spec 041).
- Slides em .pptx para download (só PDF, que abre em qualquer máquina).

## Decisões

- Os guias ficam versionados no repositório, dentro do módulo do frontend, um arquivo por idioma. Não há
  backend nem banco: o conteúdo é estático (RN-06).
- Os slides são produzidos como Artifact de slides, exportados em PDF e versionados em `frontend/public/docs/`.
  Uma wiki externa foi descartada porque o conteúdo muda junto com as specs.

## Dúvidas em aberto

- Nenhuma. O conteúdo técnico de cada guia é revisado no PR que o adiciona.
