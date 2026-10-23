# 011. Projetos e Test Cases: Spec

- **Status:** Em andamento
- **Data:** 2026-10-23
- **ADRs relacionados:** 0003, 0004, 0005, 0006, 0008, 0009, 0010, 0013, 0015, 0018, 0021, 0026

## Problema

Os times ainda não têm um fluxo para organizar projetos de teste, importar ou cadastrar seus Test Cases e atribuí-los às pessoas que vão executá-los. Os dados hoje preparados em planilhas não têm um espaço central para status, responsáveis, versões de One UI e modelos de dispositivo.

## Objetivo

Permitir que gerente ou KP crie projetos vinculados a um time e cadastre Test Cases manualmente ou pela planilha inicial. Após a execução dos casos no SDF, usuários com a permissão correspondente podem importar o relatório exportado pelo sistema para alimentar a aba Form Factor, cruzando cada Test Case com os resultados reportados para cada modelo. Cada caso pertence ao projeto, pode ser atribuído a membros do time e mantém situação e histórico de criação e atualização.

## Histórias de usuário

- Como **administrador da unidade**, quero criar projetos para qualquer time da minha unidade.
- Como **gerente**, quero criar projetos para os times dos setores sob minha responsabilidade.
- Como **KP**, quero criar projetos para os times dos quais participo.
- Como **gerente ou KP**, quero cadastrar Test Cases manualmente ou importar uma planilha para organizar o trabalho do time.
- Como **usuário com permissão para importar relatórios SDF**, quero importar a planilha exportada pelo SDF para consultar o resultado de cada Test Case em cada modelo na aba Form Factor.
- Como **gerente ou KP**, quero atribuir cada Test Case a uma pessoa responsável e a uma pessoa de backup do time.
- Como **gerente ou KP**, quero gerenciar todos os Test Cases dos times dentro do meu escopo.
- Como **membro do time responsável principal por um Test Case**, quero editar a situação, Category e Difficulty desse caso e transferi-lo para meu backup.

## Regras de negócio

- RN-01: Cada projeto pertence a exatamente um time. Administrador da unidade pode escolher qualquer time da própria unidade; gerente só pode escolher um time dentro de setor que gerencia; KP só pode escolher um time do qual participa ativamente.
- RN-02: O nome do projeto é composto pelo nome do App e pela versão de One UI, no formato `<App> <One UI>`, por exemplo `Clock 9.5`.
- RN-03: Cada projeto tem um App e uma versão de One UI, informados como texto livre no cadastro manual (por exemplo, `Clock`, `Weather`, `Calculator` e `9.5`). Na importação, o sistema extrai o primeiro valor preenchido encontrado nas colunas App e One UI para definir o projeto; não valida essas colunas linha por linha. Um Test Case herda os valores do projeto.
- RN-04: Um projeto pode usar um ou mais modelos de dispositivo. Modelos são cadastrados em um catálogo e associados ao projeto; a planilha não precisa conter essa informação.
- RN-05: Um projeto começa com status `Created` e pode ter status `To Do`, `InProgress`, `Completed` ou `Canceled`. Administrador da unidade, gerente ou KP autorizado pode definir manualmente qualquer um desses status; ele não é calculado pelas situações dos Test Cases. O projeto também mantém as datas de criação e atualização.
- RN-06: Cada Test Case pertence a um projeto e tem TC ID, Category, Difficulty, TC Situation, responsável principal e backup, além das datas de criação e atualização.
- RN-07: O TC ID é informado manualmente, seguindo um padrão como `Clock_001`. Uma planilha importada pode fornecer o mesmo identificador.
- RN-08: O projeto pode ser criado manualmente ou pelo fluxo de importação de uma planilha. No fluxo automatizado, o App e a versão One UI são obtidos da planilha e o nome do projeto é composto no formato definido.
- RN-09: A importação recebe um time para o projeto e permite selecionar os modelos de dispositivo durante a criação ou depois da leitura da planilha.
- RN-10: Category aceita somente `A`, `B` ou `C`; Difficulty aceita somente `Low`, `Medium` ou `High`. Ambos são metadados visíveis, podem ser importados da planilha e editados depois.
- RN-11: TC Situation aceita `To-Do`, `InProgress`, `InReview`, `Pass` ou `Fail`. Um caso novo começa em `To-Do`.
- RN-12: Na criação ou atribuição do Test Case, responsável principal e backup são obrigatórios, devem ser pessoas distintas e ambas devem pertencer ao time associado ao projeto. Após a transferência para o backup, o backup pode ficar vazio até uma nova atribuição.
- RN-13: O TC ID não pode se repetir dentro do mesmo projeto. Se já estiver cadastrado, o sistema recusa o cadastro ou a importação duplicada e informa que o identificador já pertence ao projeto.
- RN-14: As datas de criação e atualização são mantidas pelo sistema; uma edição atualiza a data de atualização.
- RN-15: A autorização combina permissão do perfil com o escopo organizacional. Administrador da unidade tem todas as permissões e atua em qualquer time da unidade; gerente atua nos times dos setores que gerencia; KP atua nos times em que tem participação ativa. Esses três perfis podem gerenciar todos os campos e atribuições dos Test Cases dentro do respectivo escopo.
- RN-16: O responsável principal pode editar somente a situação, Category e Difficulty dos Test Cases atribuídos a ele. Não pode editar esses campos nos casos de outras pessoas nem gerenciar os demais campos do caso.
- RN-17: O responsável principal pode transferir seu Test Case para o backup associado ao caso. A transferência atualiza o responsável principal para o backup e deixa vazio o campo de backup.
- RN-18: O projeto tem dois fluxos de importação independentes, com finalidades e dados distintos: a planilha de Test Cases cria e gerencia o trabalho do time; uma planilha exportada posteriormente pelo SDF registra os resultados dos Test Cases executados e alimenta a aba Form Factor. Importar resultados não altera os dados de gerenciamento dos Test Cases.
- RN-19: A importação do relatório SDF é permitida a qualquer usuário cujo perfil tenha a permissão específica para importar relatórios no escopo do projeto. Não é restrita por padrão a gerente ou KP.
- RN-20: O relatório SDF associa os resultados ao Test Case pelo TC ID e informa um resultado por modelo. A aba Form Factor exibe o identificador do Test Case, o SDF ID, os resultados por modelo e a data reportada, preservando os valores de resultado fornecidos pelo SDF. Cada importação acrescenta os resultados reportados sem substituir os resultados de importações anteriores. A visualização pode filtrar os resultados por semana e versão de One UI.

## Critérios de aceite

> Use o formato Dado / Quando / Então. Inclua cenários de falha.

- **CA-01:** Dado um administrador da unidade, quando seleciona um time da unidade, App e versão One UI, então o projeto é criado com esse time e o nome composto no formato definido.
- **CA-02:** Dado um gerente com permissão para criar projetos, quando seleciona um time de um setor gerenciado, App e versão One UI, então o projeto é criado com esse time e o nome composto no formato definido.
- **CA-03:** Dado um KP com permissão para criar projetos, quando seleciona um time em que participa ativamente, App e versão One UI, então o projeto é criado nesse time.
- **CA-04 (falha):** Dado um gerente ou KP, quando tenta criar um projeto em um time fora do seu escopo ou de outra unidade, então a operação é recusada sem criar o projeto.
- **CA-05:** Dado um projeto, quando modelos de dispositivo são associados, então apenas modelos existentes e ativos podem ser vinculados ao projeto.
- **CA-06:** Dado um projeto, quando uma pessoa autorizada cadastra um Test Case manualmente com campos válidos, então o caso é criado com o TC ID informado e situação inicial `To-Do`.
- **CA-07 (falha):** Dado um Test Case, quando o responsável principal ou o backup está ausente, não pertence ao time do projeto ou é a mesma pessoa que o outro responsável, então a atribuição é recusada.
- **CA-08:** Dado um Test Case, quando Category, Difficulty ou TC Situation contém valor fora das opções permitidas, então o caso não é criado ou atualizado e a validação informa o campo inválido.
- **CA-09:** Dado um Test Case atribuído a um membro como responsável principal, quando esse membro altera Category ou Difficulty para um valor permitido, então o novo valor é salvo e exibido.
- **CA-10:** Dado um Test Case atribuído a um membro como responsável principal, quando esse membro altera sua situação, então a nova situação e a data de atualização são persistidas.
- **CA-11:** Dado um projeto ou Test Case existente, quando é atualizado, então sua data de atualização muda e sua data de criação permanece preservada.
- **CA-12:** Dado que uma pessoa autorizada escolhe criar um projeto pela planilha, quando importa um arquivo válido e informa o time, então o primeiro valor preenchido de App e o primeiro valor preenchido de One UI definem o nome do projeto, sem validação linha a linha dessas colunas, e os Test Cases são importados.
- **CA-13 (falha):** Dado um TC ID já cadastrado no projeto, quando uma pessoa tenta cadastrá-lo manualmente ou por importação, então o sistema recusa o duplicado e informa que o identificador já existe naquele projeto.
- **CA-14 (falha):** Dada uma planilha sem valor preenchido de App ou de One UI, ou com linhas inválidas nos demais campos, quando a pessoa tenta criar um projeto por importação, então o sistema informa os campos, linhas e motivos inválidos e não cria registros inválidos.
- **CA-15:** Dado um administrador da unidade, gerente ou KP com escopo sobre o time do projeto, quando gerencia um Test Case, então pode editar seus campos e atribuições.
- **CA-16:** Dado um membro como responsável principal, quando edita um Test Case atribuído a si, então pode alterar somente situação, Category e Difficulty; quando tenta editar outro campo ou caso atribuído a outra pessoa, a operação é recusada.
- **CA-17:** Dado um membro como responsável principal e um backup atribuído ao mesmo caso, quando transfere o caso, então o backup passa a ser o responsável principal e o campo de backup fica vazio.
- **CA-18 (falha):** Dado um usuário sem permissão ou fora do escopo do time, quando tenta consultar, criar, editar ou atribuir Test Cases do projeto, então a operação é recusada sem revelar dados fora do escopo.
- **CA-19:** Dado um projeto com Test Cases, quando um usuário com permissão importa uma planilha de relatório SDF válida, então o sistema cruza os dados pelo TC ID e apresenta na aba Form Factor o SDF ID, os resultados reportados por modelo e a data disponível no relatório, sem alterar os dados de gerenciamento dos Test Cases.
- **CA-20 (falha):** Dado um usuário sem a permissão de importar relatório SDF ou uma linha do relatório cujo TC ID não pertença ao projeto, quando tenta importar o arquivo, então o sistema recusa a operação ou identifica a linha não associada sem alterar resultados de outros Test Cases.

## Fora de escopo

- Registrar execuções repetidas de um mesmo Test Case, evidências, anexos, defeitos ou histórico detalhado de cada tentativa.
- Criar tarefas livres que não sejam Test Cases.
- Sincronizar dados de planilha continuamente após a importação.
- Submeter Test Cases ao SDF, executar ou rotear os casos entre modelos, ou controlar o ciclo de execução do SDF.
- Gerenciar o ciclo de vida de aplicativos ou versões One UI fora dos catálogos necessários para selecionar esses valores.

## Dúvidas em aberto

- Nenhuma decisão bloqueante conhecida para a spec.
