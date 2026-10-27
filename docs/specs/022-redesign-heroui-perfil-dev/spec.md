# 022. Redesign das telas de Projects e Teams no padrão HeroUI: Spec

- **Status:** Concluída (e2e com API real pendentes, ver backlog do `tasks.md`)
- **Data:** 2026-10-26
- **ADRs relacionados:** 0015, 0022, 0034, 0037
- **Evolui:** specs 011, 012, 017, 018 e 020 (telas de Projects e Teams)
- **Figma:** TCM, nodes `2070-1476` (Projects - Test Cases, Dev), `2310-157` (Projects vazio, Dev),
  `2311-213` (Teams, Dev), `2311-652` (visualizar Team, Dev)

## Problema

Os protótipos novos do Figma redesenham as telas que o dev usa (Projects com Test Cases, Projects vazio,
Teams e visualizar Team). Hoje essas telas usam outro padrão visual: cabeçalho azul em caixa alta, menu
"…" nas ações, numeração de linha e paginação com "Página X de Y". O dev ainda transfere Test Cases ao
backup um por vez. As mesmas telas atendem gerente, KP e administrador, só com mais ações.

## Objetivo

As quatro telas seguem o Figma em cores, fontes, pesos, ícones (cor e espessura do traço) e fundos da
listagem, para todos os perfis. O padrão novo de listagem passa a ser o padrão do sistema, e o dev pode
selecionar vários Test Cases e transferi-los ao backup de uma vez.

## Histórias de usuário

- Como **dev**, quero ver meus Test Cases no visual do Figma para reconhecer status e situação de relance.
- Como **dev**, quero selecionar vários Test Cases e transferi-los ao backup de uma vez para não repetir a
  mesma ação linha por linha.
- Como **gerente, KP ou administrador**, quero as mesmas telas no padrão novo, com as ações do meu papel.

## Regras de negócio

- RN-01: As permissões não mudam (ADR 0015). Cada perfil vê as mesmas colunas e ações de hoje. Só muda a
  aparência, exceto pelo que dizem as RN-07 a RN-10.
- RN-02: Toda listagem das quatro telas tem uma moldura cinza com o corpo branco dentro. O cabeçalho das
  colunas fica sobre a moldura, sem caixa alta, com divisórias verticais entre as colunas. A paginação
  fica embaixo do corpo, também sobre a moldura.
- RN-03: O filtro de cada coluna continua no cabeçalho, indicado pela seta ao lado do nome.
- RN-04: A paginação mostra o total de itens à esquerda e, à direita, "Anterior", os números das páginas
  com a atual destacada e "Próxima". O seletor de itens por página continua (10, 20, 50 e 100, com 20 por
  padrão, ADR 0034), discreto, ao lado do total.
- RN-05: Status, situação e ativo/inativo aparecem como etiquetas arredondadas de fundo claro, com a cor
  de cada valor (ver "Referência visual"). O texto do valor sempre aparece junto da cor.
- RN-06: Um campo que o usuário pode editar na linha mostra uma seta cinza ao lado da etiqueta. Quem não
  pode editar vê só a etiqueta. Os campos editáveis por perfil continuam os de hoje: o responsável edita
  Status, Difficulty e Category; gerente e KP também editam TC Situation, Assignee e Backup.
- RN-07: A coluna de numeração da linha (01, 02...) sai da listagem de Test Cases.
- RN-08: As ações da linha aparecem como botões redondos de ícone, lado a lado, sempre visíveis, para
  todos os perfis. O menu "…" deixa de existir nessas telas. Cada botão tem um nome acessível com a ação
  e a linha (ex.: "Transferir ao backup Clock_000001"). Ações destrutivas ficam por último.
- RN-09: A listagem de Test Cases tem uma caixa de seleção em cada linha e uma no cabeçalho, que marca ou
  desmarca todas as linhas selecionáveis da página. Uma linha é selecionável quando o usuário é o
  responsável pelo Test Case e ele tem backup. Nas demais, a caixa aparece desabilitada, com o motivo
  ao passar o mouse ou focar. Se nenhuma linha da página for selecionável, a coluna some.
- RN-10: Com pelo menos uma linha selecionada, aparece a ação "Transferir ao backup (N)". Ela pede
  confirmação, informando quantos Test Cases serão transferidos. Confirmada, transfere cada um ao seu
  backup, como a transferência individual faz hoje. No fim, informa quantos foram transferidos e quantos
  falharam, com o TC ID dos que falharam. A seleção é limpa ao trocar de página, de filtro, de semana ou
  de aba e depois da transferência.
- RN-11: Projects vazio: quando o dev não tem projeto nem Test Case associado, a área da página mostra só
  a moldura cinza com o ícone de caixa de entrada, o título "Nenhum projeto ou Test Case associado" e a
  explicação.
- RN-12: Visualizar Team: acima do nome do time aparece "Visão geral do time". A linha de dados mostra
  setor, status e quantidade de membros, separados por "·", com uma divisória embaixo. O caminho de volta
  para Teams fica só no topo da página, como no Figma.
- RN-13: Todo texto novo existe em inglês, português e coreano.

## Referência visual (valores do Figma)

| Elemento | Valor |
|---|---|
| Fundo da aplicação / cartão da página | `#FBFBFB` / branco, borda `#F2F2F2` 1px, raio 50px |
| Título da página | Inter 500 22px `#454442` (no detalhe do time, `#3672F2`); sobretítulo Inter 500 14px `#71717A` |
| Abas | ativa Inter 500 18px `#2D72E4` com sublinhado 1.5px; inativa Inter 400 18px `#71717A`; base `#ECEFF2` |
| Moldura / corpo da listagem | `#F3F5F7` raio 30px / branco raio 25px, 5px de recuo |
| Cabeçalho das colunas | Inter 500 14px `#71717A`; divisórias `#E4E4E7`; seta 14px, traço 1px `#71717A` |
| Linhas | 40px de altura; Inter 400 14px `#454442`; divisória `#EFEFF0` 1px |
| Etiquetas | 17px de altura, raio pleno, Inter 500 12px |
| Status (fundo / texto) | To Do `#EDFAFF`/`#5B8DD4` · In Progress `#FEF2DE`/`#855F2E` · In Review `#F0F4FF`/`#6A68BE` · In Validation `#F7EFF3`/`#C75DA8` · Done `#DCF7E8`/`#3C8355` |
| Situação / Ativo | `#EDEFF1`/`#777777` / `#DCF7E8`/`#3C8355` |
| Seta de campo editável | 7×4px, traço 1px `#D0D0D0` |
| Caixa de seleção | 14px, raio 3px; da linha `#F3F5F7`; do cabeçalho branca com sombra |
| Botão de ação | círculo 19px `#EFEFF0`, ícone de traço 1px `#454442` |
| Paginação | total Inter 500 12px `#909092`; números e "Próxima" `#454442`; desabilitado `#909092`; página atual em círculo 26px `#EBEBEC` |
| Botão de semana | branco, borda `#F2F2F2`, raio 10px, ícone de calendário, Inter 500 15px `#454442` |
| Dados do time | rótulo Inter 500 14px `#71717A`; valor `#454442`; "Ativo" `#007A55`; "·" `#7E7E7E` |
| Projects vazio | ícone 36×26px `#454442`; título Inter 500 18px `#454442`; texto Inter 400 15px `#777777` |

## Critérios de aceite

- **CA-01:** Dado um dev com Test Cases, quando abre o projeto, então a listagem segue a "Referência
  visual": moldura, cabeçalho sem caixa alta, etiquetas com as cores de cada status e sem coluna de
  numeração.
- **CA-02:** Dado um dev responsável por um Test Case, quando vê a linha, então Status, Difficulty e
  Category mostram a seta de editável, e TC Situation não mostra.
- **CA-03:** Dado um dev com três Test Cases transferíveis, quando seleciona dois e confirma "Transferir ao
  backup (2)", então os dois saem da sua lista, o aviso informa "2 transferidos" e a seleção é limpa.
- **CA-04:** Dado um Test Case sem backup, quando o dev vê a linha, então a caixa de seleção está
  desabilitada e informa que o Test Case não tem backup.
- **CA-05 (falha):** Dado dois Test Cases selecionados, um deles já transferido por outra pessoa, quando o
  dev confirma a transferência, então um é transferido e o aviso informa a falha com o TC ID do outro.
- **CA-06:** Dado a caixa do cabeçalho marcada, quando o dev troca de página, então nenhuma linha fica
  selecionada.
- **CA-07:** Dado um dev sem projetos associados, quando abre Projects, então vê o estado vazio do Figma.
- **CA-08 (falha):** Dado que a busca de projetos falhou, quando o dev abre Projects, então vê a mensagem de
  erro com "Tentar novamente", e não o estado vazio.
- **CA-09:** Dado um dev membro de um time, quando abre Teams, então vê o time com setor, etiqueta "Ativo"
  e o botão redondo "Visualizar time", sem menu "…".
- **CA-10:** Dado um dev em Teams, quando visualiza o time, então vê "Visão geral do time", o nome, a linha
  de setor, status e membros, e a listagem de usuários e perfis.
- **CA-11 (falha):** Dado um time inexistente ou fora do escopo, quando o dev abre o endereço dele, então vê
  "Time não encontrado" no lugar da listagem.
- **CA-12:** Dado um gerente em Teams ou no projeto, quando vê uma linha, então todas as ações do seu papel
  aparecem como botões de ícone lado a lado, com a destrutiva por último.
- **CA-13:** Dado qualquer listagem das quatro telas com mais de 20 itens, quando o usuário vai para a
  página 2 ou troca para 50 itens, então a lista atualiza e o total continua visível à esquerda.

## Fora de escopo

- A lista de projetos do gerente e do KP, e as telas de Usuários, Perfis, Setores, Modelos de dispositivo,
  Overview e Resultados gerais. Elas migram em specs próprias.
- Busca global, idioma e menu do usuário no topo, e a barra lateral: já seguem o Figma e não mudam.
- Mudanças de permissão ou de quais campos cada perfil edita.
- Ações em lote além de "Transferir ao backup".

## Dúvidas resolvidas

- Cores que o Figma não mostra (aprovadas em 2026-10-26): **Fail** `#FDEEEE`/`#C2474B` e **Inativo**
  igual à situação (`#EDEFF1`/`#777777`).
- Escopo (aprovado em 2026-10-26): pelo ADR 0037, uma página migrada não mistura as duas bibliotecas.
  A aba Form Factor, os painéis de criar e editar Test Case e Team e as confirmações dessas telas também
  mudam para o padrão novo, com o comportamento atual.
