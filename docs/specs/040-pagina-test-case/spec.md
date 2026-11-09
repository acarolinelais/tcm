# 040. Página do Test Case com endereço próprio e edição dos textos: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

Um Test Case só pode ser aberto num painel lateral dentro da lista do projeto. Não há como mandar o link de um
caso para um colega: a pessoa precisa dizer o projeto e o TC ID, e o outro procura na tabela. Além disso,
Title, Precondition, Procedure e Expected Result só entram pela planilha e não podem ser corrigidos no
sistema (fora de escopo na spec 028).

## Objetivo

Cada caso ganha um endereço próprio que abre direto nos detalhes dele. Quem pode gerenciar o caso consegue
corrigir os quatro textos ali mesmo.

## Histórias de usuário

- Como **KP**, quero copiar o link de um caso e mandar para o dev, para que ele abra direto no caso.
- Como **gerente**, quero corrigir o Procedure de um caso importado com erro, sem reimportar a planilha.
- Como **dev**, quero abrir o link recebido e ver os detalhes do caso.

## Regras de negócio

- RN-01: Cada caso tem um endereço que abre a página dele com TC ID, Status, responsáveis, os quatro textos,
  os links de PR e, se a spec 038 estiver pronta, o histórico.
- RN-02: O painel lateral e a página têm uma ação "Copiar link". A página tem um atalho de volta para a lista
  do projeto.
- RN-03: Pode abrir a página quem pode ver o caso (ADR 0015 e spec 012). Quem não pode recebe a mesma resposta
  de um caso inexistente.
- RN-04: Admin, gerente e KP no escopo podem editar Title, Precondition, Procedure e Expected Result. Cada texto
  segue os limites de tamanho já definidos na spec 028.
- RN-05: Um Title vazio não é aceito. Os outros três textos podem ficar vazios.

## Critérios de aceite

- **CA-01:** Dado o link de um caso, quando um membro do time o abre, então a página mostra os detalhes do caso.
- **CA-02:** Dado o painel de um caso, quando a pessoa usa "Copiar link", então o endereço da página vai para a
  área de transferência e uma confirmação aparece.
- **CA-03:** Dado um KP no escopo, quando ele altera o Procedure e salva, então o texto novo aparece na página e
  no painel.
- **CA-04 (falha):** Dado um dev sem acesso ao caso, quando ele abre o link, então vê "Test Case não encontrado".
- **CA-05 (falha):** Dado um link de um caso inexistente, quando alguém o abre, então vê "Test Case não
  encontrado" e um atalho para Projetos.
- **CA-06 (falha):** Dado a edição aberta, quando o Title fica vazio ou um texto passa do limite, então salvar é
  recusado e o caso não muda.

## Fora de escopo

- Editar TC ID, Category e os demais campos na página (continuam na lista do projeto).
- Busca pelo conteúdo dos textos.
- Formatação rica (negrito, listas, imagens) nos textos.

## Dúvidas em aberto

- O dev responsável principal também pode editar os textos?
- A edição dos textos entra no histórico da spec 038?
