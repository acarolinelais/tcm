# 048. Documentação de uso dentro do sistema: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

A opção Documentation da navegação lateral mostra "Em breve". Quem chega ao sistema não tem onde aprender o ciclo
de Status, o formato da planilha de importação ou como funcionam as rodadas de Form Factor, e as mesmas dúvidas
voltam para a gestão.

## Objetivo

Documentation vira uma central de ajuda com guias curtos por tema, e cada perfil vê primeiro o que é relevante
para ele.

## Histórias de usuário

- Como **dev novo**, quero entender o ciclo de Status e o que se espera de mim em cada etapa.
- Como **KP**, quero conferir o formato da planilha antes de importar um projeto.
- Como **gerente**, quero entender como uma rodada de Form Factor muda o Status dos casos.

## Regras de negócio

- RN-01: A página lista os guias:
  - Primeiros passos;
  - Ciclo de Status do Test Case;
  - Importar projeto por planilha;
  - Form Factor: rodadas e resultados;
  - Perfis e permissões;
  - Exportar tabelas.
- RN-02: Os guias destacados no topo dependem do perfil: o dev vê primeiro Ciclo de Status; o KP e o gerente,
  Importar projeto e Form Factor; o admin, Perfis e permissões.
- RN-03: Os guias estão disponíveis em inglês, português e coreano, como o resto da interface (spec 007).
- RN-04: Cada guia tem um endereço próprio, que pode ser compartilhado.
- RN-05: Há um campo para filtrar os guias pelo título.
- RN-06: Qualquer pessoa logada lê todos os guias. Os guias não mostram dados do sistema.

## Critérios de aceite

- **CA-01:** Dado um dev logado, quando abre Documentation, então Ciclo de Status aparece em destaque.
- **CA-02:** Dado a interface em coreano, quando a pessoa abre um guia, então o texto está em coreano.
- **CA-03:** Dado o endereço do guia Importar projeto, quando alguém o abre, então o guia aparece direto.
- **CA-04 (falha):** Dado o endereço de um guia inexistente, quando alguém o abre, então vê "Guia não
  encontrado" e um atalho para a lista.
- **CA-05 (falha):** Dado um filtro sem correspondência, quando a pessoa digita, então aparece "Nenhum guia
  encontrado".

## Fora de escopo

- Edição dos guias pelo próprio sistema.
- Vídeos e tutoriais interativos.
- Busca no conteúdo dos guias pela busca global (spec 041).

## Dúvidas em aberto

- Quem escreve e revisa o conteúdo dos guias, e em qual idioma é a primeira versão?
- Um link externo (wiki corporativa) já atenderia, em vez de guias dentro do sistema?
