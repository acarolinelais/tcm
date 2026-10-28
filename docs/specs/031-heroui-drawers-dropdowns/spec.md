# 031. Painéis laterais e listas de seleção no padrão HeroUI (Setores, Usuários, Modelos e Projetos): Spec

- **Status:** Em andamento
- **Data:** 2026-10-28
- **ADRs relacionados:** 0010, 0022, 0037
- **Evolui:** specs 006, 011, 014 e 022 (telas de Setores, Usuários, Modelos de dispositivo e Projetos)

## Problema

As telas de Teams e de Test Cases já usam o padrão novo de painel lateral e de lista de seleção (spec 022).
As telas de Setores, Usuários, Modelos de dispositivo e Projetos ainda abrem painéis e listas no padrão
antigo, que tem cabeçalho, rodapé, espaçamentos e comportamento de teclado diferentes. Algumas páginas
misturam os dois padrões, então a mesma ação parece e se comporta de um jeito em uma tela e de outro na
tela vizinha. No cadastro de projeto ainda há dois campos chamados "Time" na mesma tela, e leitores de tela
(e os testes automáticos) não sabem qual é qual.

## Objetivo

Todos os painéis laterais e listas de seleção dessas quatro telas, e o formulário de cadastro de projeto,
passam a seguir o padrão de Teams e Test Cases, sem mudar o que cada um faz: os mesmos campos, regras,
mensagens, permissões e dados salvos.

## Histórias de usuário

- Como **administrador da unidade**, quero que os painéis de Setores, Usuários e Modelos funcionem como os de
  Teams para não reaprender cada tela.
- Como **gerente ou KP**, quero escolher time, gerente e modelos com o mesmo tipo de lista em todo o sistema,
  usando mouse ou teclado.
- Como **pessoa que usa leitor de tela**, quero que cada campo tenha um nome único para saber onde estou.

## Regras de negócio

- RN-01: Os painéis em escopo são: **Setores** (novo setor; setor e seus gerentes), **Usuários** (novo
  usuário; editar usuário; responsável do usuário), **Modelos de dispositivo** (novo e editar modelo) e
  **Projetos** (editar projeto).
- RN-02: Todo painel em escopo segue o padrão dos painéis de Teams: abre pela direita, com o título no topo,
  o corpo rolável e o rodapé com **Cancelar** e a ação principal. Ele fecha por Cancelar, pelo X, por Esc e
  por clique fora, sem salvar. Ao fechar, o foco volta ao botão que o abriu.
- RN-03: Campos, validações, mensagens, permissões e o que é salvo **não mudam**. A ação principal envia o
  formulário, também pelo Enter num campo de texto, e não envia duas vezes enquanto salva.
- RN-04: As listas de seleção em escopo são: **Time** (novo e editar projeto), **Gerente** (novo setor e
  gerentes do setor), **Responsável** (responsável do usuário) e **Perfil** (novo e editar usuário). Elas
  seguem o padrão das listas de Teams e Test Cases: abrem por clique ou teclado (Enter, Espaço, setas),
  mostram a opção atual marcada, e o Esc fecha só a lista, sem fechar o painel.
- RN-05: A opção que hoje significa "nenhum" continua com o mesmo texto e o mesmo efeito: **Sem
  responsável** (setor e responsável do usuário), **Selecionar gerente** e **Selecionar time** (nada
  escolhido) e **Desenvolvedor** (perfil padrão do novo usuário).
- RN-06: Uma opção que hoje aparece mas não pode ser escolhida (ex.: o perfil atual fora do escopo, no
  editar usuário) continua visível e indisponível.
- RN-07: A escolha de **Modelos de dispositivo** (novo e editar projeto) continua com seleção múltipla e
  busca por nome. Os modelos escolhidos aparecem como etiquetas que podem ser removidas uma a uma, e uma
  busca sem resultado mostra uma mensagem.
- RN-08: Cada campo de uma tela tem um nome acessível único. No cadastro de projeto, só o modo escolhido
  (importação ou cadastro manual) fica na tela, então há um único campo Time por vez.
- RN-09: O visual (largura, espaçamentos, tipografia e botões) é o mesmo dos painéis e listas que já estão
  no padrão novo.
- RN-10: Os campos de texto, rótulos e botões **dentro** dos painéis da RN-01 também seguem o padrão novo.
- RN-11: O **cadastro de projeto** (manual e por planilha, com a prévia e os erros da planilha) segue o
  padrão novo por inteiro: campos, listas, botões, tabela da prévia e paginação. O comportamento continua o
  mesmo, inclusive a paginação da prévia e a lista de erros agrupada por linha.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01:** Dado a tela de Setores, quando o administrador clica em Novo setor, então abre à direita o
  painel "Novo setor", com o nome, a lista Gerente em "Sem responsável" e o rodapé Cancelar / Criar setor.
- **CA-02:** Dado o painel Novo setor com nome e um gerente escolhido, quando a pessoa cria o setor, então ele
  é salvo com esse gerente, o painel fecha e uma notificação de sucesso aparece.
- **CA-03 (falha):** Dado o painel Novo setor sem nome, quando a pessoa tenta criar, então a mensagem aparece
  junto ao campo, nada é salvo e o painel continua aberto.
- **CA-04:** Dado o painel de gerentes de um setor, quando a pessoa escolhe um gerente na lista e adiciona,
  então ele entra na lista de gerentes do setor.
- **CA-05 (falha):** Dado o painel de gerentes, quando a API recusa a inclusão, então o erro aparece e o painel
  continua aberto com a escolha feita.
- **CA-06:** Dado a tela de Usuários, quando o administrador abre Novo usuário, então o painel abre com o
  perfil em "Desenvolvedor", e escolher outro perfil e salvar cria o usuário com esse perfil.
- **CA-07 (falha):** Dado o painel de usuário, quando o e-mail é inválido ou o User ID já existe, então a
  mensagem aparece junto ao campo, nada é salvo e o painel continua aberto.
- **CA-08:** Dado o editar usuário de alguém com perfil fora do escopo de quem edita, quando a lista Perfil é
  aberta, então o perfil atual aparece marcado e indisponível.
- **CA-09:** Dado o painel de responsável de um usuário, quando a pessoa escolhe um gerente (ou "Sem
  responsável") e salva, então o responsável é gravado (ou removido) e o painel fecha.
- **CA-10 (falha):** Dado o painel de responsável, quando a API recusa a alteração, então o erro aparece e o
  painel continua aberto.
- **CA-11:** Dado a tela de Modelos de dispositivo, quando o KP cria ou edita um modelo pelo painel, então o
  modelo é salvo, o painel fecha e a tabela mostra o valor novo.
- **CA-12 (falha):** Dado o painel de modelo, quando o nome já existe ou passa do limite, então a mensagem
  aparece junto ao campo e nada é salvo.
- **CA-13:** Dado o editar projeto, quando a pessoa troca o time e os modelos e salva, então o projeto é
  atualizado e o painel fecha.
- **CA-14 (falha):** Dado o editar projeto, quando a API recusa a troca de time (há responsáveis fora do time
  de destino), então o erro aparece e o painel continua aberto com os valores escolhidos.
- **CA-15:** Dado a escolha de modelos no cadastro ou no editar projeto, quando a pessoa busca por parte do
  nome, escolhe dois modelos e remove um pela etiqueta, então fica só o outro escolhido.
- **CA-16 (falha):** Dado a escolha de modelos, quando a busca não encontra nenhum modelo, então aparece a
  mensagem de nenhum resultado e nenhum modelo é escolhido.
- **CA-17:** Dado o cadastro de projeto, quando um leitor de tela percorre os campos, então encontra um único
  campo Time, o do modo escolhido.
- **CA-18:** Dado qualquer painel da RN-01 aberto com alterações, quando a pessoa aperta Esc, clica fora,
  no X ou em Cancelar, então o painel fecha sem salvar e o foco volta ao botão que o abriu.
- **CA-19:** Dado uma lista da RN-04 com o foco, quando a pessoa usa Enter, as setas e Enter de novo, então a
  opção é escolhida; e o Esc com a lista aberta fecha só a lista.
- **CA-20:** Dado o cadastro de projeto por planilha, quando a planilha é lida, então a prévia mostra os casos
  com a mesma paginação de hoje (20 por página) e o projeto é criado como antes.
- **CA-21 (falha):** Dado uma planilha com problemas, quando ela é lida, então os erros aparecem agrupados por
  linha, paginados como hoje, e o botão de criar o projeto não envia.

## Fora de escopo

- Os modais centrais (confirmações e o editor de permissões de Perfis): não são painéis laterais.
- Redesenho de telas, colunas ou textos; qualquer mudança de regra, permissão ou dado salvo.
- Botões, campos e tabelas **fora** dos painéis e do cadastro de projeto (ex.: login, troca de senha, editor
  de Perfis e a confirmação de ativar/inativar usuário).
- Telas que já estão no padrão novo (Teams, Test Cases, Form Factor, Resultados gerais).

## Dúvidas em aberto

Nenhuma. Decisões de 2026-10-28: os campos dentro dos painéis (RN-10) e o cadastro de projeto inteiro
(RN-11) passam ao padrão novo. A prévia e os erros da planilha migram nesta spec (justificativa no
`plan.md`).
