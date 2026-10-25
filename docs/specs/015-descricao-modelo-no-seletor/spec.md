# 015. Descrição do modelo no seletor de projetos: Spec

- **Status:** Concluída
- **Data:** 2026-10-25
- **ADRs relacionados:** 0009, 0013, 0015
- **Evolui:** spec 014 (CA-11)

## Problema

Desde a spec 014, cada modelo de dispositivo tem uma descrição. Mas o seletor de modelos do projeto mostra
só o nome. Nomes como `SM-9292` não dizem qual aparelho é, então quem cria o projeto precisa decorar os
códigos ou abrir o catálogo, que o gerente nem acessa.

## Objetivo

O seletor de modelos do projeto mostra o nome e a descrição de cada modelo na mesma linha. Assim, quem
cria ou importa um projeto escolhe o aparelho certo sem sair do formulário.

## Histórias de usuário

- Como **gerente ou KP**, quero ver a descrição de cada modelo no seletor do projeto para escolher o
  aparelho certo pelo nome comercial, mesmo quando o nome do modelo é um código.

## Regras de negócio

- RN-01: Na lista de opções do seletor de modelos, cada opção mostra o nome do modelo e a descrição na
  mesma linha, separados por um ponto (`SM-9292 · Galaxy S27 Ultra`). A descrição aparece em texto mais
  discreto que o nome.
- RN-02: Um modelo sem descrição aparece só com o nome, sem o ponto separador nem traço.
- RN-03: Os modelos já selecionados, exibidos como etiquetas no campo, continuam mostrando só o nome,
  para o campo não crescer.
- RN-04: O seletor continua oferecendo só os modelos ativos da unidade (spec 014, RN-07).
- RN-05: A busca digitada no seletor continua procurando pelo nome.

## Critérios de aceite

- **CA-01:** Dado um modelo ativo `SM-9292` com a descrição `Galaxy S27 Ultra`, quando alguém abre o
  seletor de modelos ao criar ou importar um projeto, então a opção mostra `SM-9292 · Galaxy S27 Ultra`
  numa única linha.
- **CA-02:** Dado um modelo ativo sem descrição, quando o seletor é aberto, então a opção mostra só o
  nome.
- **CA-03:** Dado que `SM-9292` foi selecionado, quando a opção é marcada, então a etiqueta no campo
  mostra só `SM-9292`.
- **CA-04 (falha):** Dado um dev, sem permissão para gerenciar projetos, quando tenta obter as opções de
  modelos, então a operação continua sendo recusada (spec 014, CA-09). A descrição não abre acesso novo.

## Fora de escopo

- Buscar pela descrição no seletor.
- Mostrar a descrição em outros lugares, como no detalhe do projeto ou na aba Form Factor.
- Mudar o tamanho máximo ou outras regras da descrição.

## Dúvidas em aberto

- Nenhuma.
