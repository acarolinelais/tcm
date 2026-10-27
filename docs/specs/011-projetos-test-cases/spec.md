# 011. Projetos e Test Cases: Spec

- **Status:** Concluída
- **Data:** 2026-10-23
- **ADRs relacionados:** 0003, 0004, 0005, 0006, 0008, 0009, 0010, 0013, 0015, 0018, 0021, 0026

## Problema

Os times ainda não têm um fluxo para organizar projetos de teste, importar ou cadastrar seus Test Cases e atribuí-los às pessoas que vão executá-los. Os dados hoje preparados em planilhas não têm um espaço central para status, responsáveis, versões de One UI e modelos de dispositivo.

## Objetivo

Permitir que gerente ou KP crie projetos vinculados a um time e cadastre Test Cases manualmente ou pela planilha inicial. Após a execução dos casos no SDF, usuários com a permissão correspondente podem importar o relatório exportado pelo sistema para alimentar a aba Form Factor, cruzando cada Test Case com os resultados reportados para cada modelo. Cada caso pertence ao projeto, pode ser atribuído a membros do time e mantém TC Situation, Status de progresso e histórico de criação e atualização.

## Histórias de usuário

- Como **administrador da unidade**, quero criar projetos para qualquer time da minha unidade.
- Como **gerente**, quero criar projetos para os times dos setores sob minha responsabilidade.
- Como **KP**, quero criar projetos para os times dos quais participo.
- Como **gerente ou KP**, quero cadastrar Test Cases manualmente ou importar uma planilha para organizar o trabalho do time.
- Como **usuário com permissão para importar relatórios SDF**, quero importar a planilha exportada pelo SDF para consultar o resultado de cada Test Case em cada modelo na aba Form Factor.
- Como **gerente ou KP**, quero atribuir cada Test Case a uma pessoa responsável e a uma pessoa de backup do time.
- Como **gerente ou KP**, quero gerenciar todos os Test Cases dos times dentro do meu escopo.
- Como **membro do time responsável principal por um Test Case**, quero editar o Status, TC Situation, Category e Difficulty desse caso e transferi-lo para meu backup.

## Regras de negócio

- RN-01: Cada projeto pertence a exatamente um time. Administrador da unidade pode escolher qualquer time da própria unidade; gerente só pode escolher um time dentro de setor que gerencia; KP só pode escolher um time do qual participa ativamente.
- RN-02: O nome do projeto é composto pelo nome do App e pela versão de One UI, no formato `<App> <One UI>`, por exemplo `Clock 9.5`.
- RN-03: Cada projeto tem um App e uma versão de One UI, informados como texto livre no cadastro manual (por exemplo, `Clock`, `Weather`, `Calculator` e `9.5`). Na importação, o sistema extrai o primeiro valor preenchido encontrado nas colunas App e One UI para definir o projeto; não valida essas colunas linha por linha. Um Test Case herda os valores do projeto.
- RN-04: Um projeto pode usar um ou mais modelos de dispositivo. Modelos são cadastrados em um catálogo e associados ao projeto; a planilha não precisa conter essa informação.
- RN-05: Um projeto começa com status `Created` e pode ter status `To Do`, `InProgress`, `Completed` ou `Canceled`. Administrador da unidade, gerente ou KP autorizado pode definir manualmente qualquer um desses status; ele não é calculado pelas situações dos Test Cases. O projeto também mantém as datas de criação e atualização.
- RN-06: Cada Test Case pertence a um projeto e tem TC ID, Category, Difficulty, TC Situation, Status, responsável principal e backup, além das datas de criação e atualização.
- RN-07: O TC ID é informado manualmente, seguindo um padrão como `Clock_001`. Uma planilha importada pode fornecer o mesmo identificador.
- RN-08: O projeto pode ser criado manualmente ou pelo fluxo de importação de uma planilha. No fluxo automatizado, o App e a versão One UI são obtidos da planilha e o nome do projeto é composto no formato definido.
- RN-09: A importação recebe um time para o projeto e permite selecionar os modelos de dispositivo durante a criação ou depois da leitura da planilha.
- RN-10: Category aceita somente `A`, `B` ou `C`; Difficulty aceita somente `Low`, `Medium` ou `High`. Ambos são metadados visíveis, podem ser importados da planilha e editados depois.
- RN-11: TC Situation indica a origem do caso em relação a projetos anteriores e aceita somente `New` (caso novo), `New Step` (o caso já existe em outra versão de One UI, mas algum passo de execução mudou) ou `Without Changes` (o caso já existe em outro projeto e muda só a versão de One UI; a rotina de execução é a mesma). É obrigatório no cadastro manual e em cada linha da planilha de Test Cases e só pode ser alterado por quem gerencia o caso (RN-15).
- RN-11a: Status indica o progresso do caso e aceita `To-Do`, `InProgress`, `InReview`, `Pass` ou `Fail`. Um caso novo começa em `To-Do`. O Status não vem da planilha de Test Cases: se ela trouxer uma coluna de Status, a coluna é ignorada.
- RN-11b: Os Test Cases cadastrados antes desta regra recebem TC Situation `New` e mantêm como Status a situação de progresso que já tinham.
- RN-12: Na criação ou atribuição do Test Case, responsável principal e backup são obrigatórios, devem ser pessoas distintas e ambas devem pertencer ao time associado ao projeto. Após a transferência para o backup, o backup pode ficar vazio até uma nova atribuição.
- RN-13: O TC ID não pode se repetir dentro do mesmo projeto. Se já estiver cadastrado, o sistema recusa o cadastro ou a importação duplicada e informa que o identificador já pertence ao projeto.
- RN-14: As datas de criação e atualização são mantidas pelo sistema; uma edição atualiza a data de atualização.
- RN-15: A autorização combina permissão do perfil com o escopo organizacional. Administrador da unidade tem todas as permissões e atua em qualquer time da unidade; gerente atua nos times dos setores que gerencia; KP atua nos times em que tem participação ativa. Esses três perfis podem gerenciar todos os campos e atribuições dos Test Cases dentro do respectivo escopo.
- RN-16: O responsável principal pode editar somente o Status, TC Situation, Category e Difficulty dos Test Cases atribuídos a ele (TC Situation incluída em 2026-10-27). Não pode editar esses campos nos casos de outras pessoas nem gerenciar os demais campos do caso.
- RN-17: O responsável principal pode transferir seu Test Case para o backup associado ao caso. A transferência atualiza o responsável principal para o backup e deixa vazio o campo de backup.
- RN-18: O projeto tem dois fluxos de importação independentes, com finalidades e dados distintos: a planilha de Test Cases cria e gerencia o trabalho do time; uma planilha exportada posteriormente pelo SDF registra os resultados dos Test Cases executados e alimenta a aba Form Factor. Importar resultados não altera os dados de gerenciamento dos Test Cases.
- RN-19: A importação do relatório SDF é permitida a qualquer usuário cujo perfil tenha a permissão específica para importar relatórios no escopo do projeto. Não é restrita por padrão a gerente ou KP.
- RN-20: O relatório SDF associa os resultados ao Test Case pelo TC ID e informa um resultado por modelo. A aba Form Factor exibe o identificador do Test Case, o SDF ID, os resultados por modelo e a data reportada, preservando os valores de resultado fornecidos pelo SDF. Cada importação acrescenta os resultados reportados sem substituir os resultados de importações anteriores. A visualização oferece um filtro por semana no canto superior direito do cabeçalho do card, ao lado do nome do projeto e acima das abas. A versão de One UI permanece como informação na listagem, sem campo de filtro próprio na interface.
- RN-21: Antes de criar o projeto pela planilha de Test Cases, o sistema mostra uma prévia com o nome do projeto, o total de casos lidos e, para cada caso, TC ID, Category, Difficulty, TC Situation, responsável e backup. A prévia é paginada com 20 casos por página e permite navegar entre as páginas sem recarregar o arquivo. A planilha deve suportar pelo menos 1.000 Test Cases.
- RN-22: Quando a planilha de Test Cases está fora do padrão, o sistema explica o problema em linguagem de quem preencheu a planilha, no idioma da interface:
  - um resumo no topo informa quantas linhas têm problemas em relação ao total lido (por exemplo, "4 de 120 linhas precisam de ajuste") e que nada foi criado;
  - os problemas da planilha inteira (arquivo sem as colunas obrigatórias, sem nenhum Test Case, sem valor de App ou One UI) aparecem separados dos problemas por linha e citam as colunas pelo nome usado no cabeçalho da planilha;
  - os problemas por linha são agrupados por número de linha, como aparece no editor de planilhas, e cada problema cita a coluna pelo nome do cabeçalho, o valor encontrado (ou que a célula está vazia) e o que era esperado, por exemplo: Coluna TC Situation: "To-Do" não é válido. Use New, New Step ou Without Changes;
  - um TC ID duplicado informa o identificador e a linha em que ele apareceu primeiro, e um responsável ou backup inválido informa o nome lido e que a pessoa precisa ser membro ativo do time;
  - nenhum identificador técnico interno aparece na mensagem;
  - a lista de linhas com problema é paginada, com 20 linhas por página;
  - com problemas na planilha, a criação fica bloqueada e a ação passa a ser "Conferir planilha": ela verifica também responsável e backup no time escolhido e mostra todos os problemas juntos, sem criar nada.
- RN-23: Ao concluir a importação da planilha de Test Cases, o sistema exibe uma notificação de sucesso informando que a planilha foi importada, o nome do projeto criado e quantos Test Cases foram criados.
- RN-24: A aba Test Cases oferece o mesmo seletor de semana no canto superior direito do cabeçalho do card. Ele considera a Data final já exibida para casos com Status `Pass` e o fuso horário do navegador; casos sem Data final não aparecem enquanto uma semana está selecionada. Limpar o filtro restaura a consulta sem restrição de semana. A seleção de semana é independente da aba Form Factor, combina com os demais filtros e retorna à primeira página.

## Critérios de aceite

> Use o formato Dado / Quando / Então. Inclua cenários de falha.

- **CA-01:** Dado um administrador da unidade, quando seleciona um time da unidade, App e versão One UI, então o projeto é criado com esse time e o nome composto no formato definido.
- **CA-02:** Dado um gerente com permissão para criar projetos, quando seleciona um time de um setor gerenciado, App e versão One UI, então o projeto é criado com esse time e o nome composto no formato definido.
- **CA-03:** Dado um KP com permissão para criar projetos, quando seleciona um time em que participa ativamente, App e versão One UI, então o projeto é criado nesse time.
- **CA-04 (falha):** Dado um gerente ou KP, quando tenta criar um projeto em um time fora do seu escopo ou de outra unidade, então a operação é recusada sem criar o projeto.
- **CA-05:** Dado um projeto, quando modelos de dispositivo são associados, então apenas modelos existentes e ativos podem ser vinculados ao projeto.
- **CA-06:** Dado um projeto, quando uma pessoa autorizada cadastra um Test Case manualmente com campos válidos, então o caso é criado com o TC ID e o TC Situation informados e Status inicial `To-Do`.
- **CA-07 (falha):** Dado um Test Case, quando o responsável principal ou o backup está ausente, não pertence ao time do projeto ou é a mesma pessoa que o outro responsável, então a atribuição é recusada.
- **CA-08:** Dado um Test Case, quando Category, Difficulty, TC Situation ou Status contém valor fora das opções permitidas, então o caso não é criado ou atualizado e a validação informa o campo inválido.
- **CA-09:** Dado um Test Case atribuído a um membro como responsável principal, quando esse membro altera Category ou Difficulty para um valor permitido, então o novo valor é salvo e exibido.
- **CA-10:** Dado um Test Case atribuído a um membro como responsável principal, quando esse membro altera o Status, então o novo Status e a data de atualização são persistidas.
- **CA-11:** Dado um projeto ou Test Case existente, quando é atualizado, então sua data de atualização muda e sua data de criação permanece preservada.
- **CA-12:** Dado que uma pessoa autorizada escolhe criar um projeto pela planilha, quando importa um arquivo válido e informa o time, então o primeiro valor preenchido de App e o primeiro valor preenchido de One UI definem o nome do projeto, sem validação linha a linha dessas colunas, e os Test Cases são importados com o TC Situation de cada linha e Status `To-Do`.
- **CA-13 (falha):** Dado um TC ID já cadastrado no projeto, quando uma pessoa tenta cadastrá-lo manualmente ou por importação, então o sistema recusa o duplicado e informa que o identificador já existe naquele projeto.
- **CA-14 (falha):** Dada uma planilha sem valor preenchido de App ou de One UI, ou com linhas inválidas nos demais campos, quando a pessoa tenta criar um projeto por importação, então o sistema informa os campos, linhas e motivos inválidos e não cria registros inválidos.
- **CA-15:** Dado um administrador da unidade, gerente ou KP com escopo sobre o time do projeto, quando gerencia um Test Case, então pode editar seus campos e atribuições.
- **CA-16:** Dado um membro como responsável principal, quando edita um Test Case atribuído a si, então pode alterar somente Status, TC Situation, Category e Difficulty; quando tenta editar outro campo, como Assignee ou Backup, ou caso atribuído a outra pessoa, a operação é recusada. (Atualizado em 2026-10-27: a TC Situation passou a ser editável pelo responsável.)
- **CA-17:** Dado um membro como responsável principal e um backup atribuído ao mesmo caso, quando transfere o caso, então o backup passa a ser o responsável principal e o campo de backup fica vazio.
- **CA-18 (falha):** Dado um usuário sem permissão ou fora do escopo do time, quando tenta consultar, criar, editar ou atribuir Test Cases do projeto, então a operação é recusada sem revelar dados fora do escopo.
- **CA-19:** Dado um projeto com Test Cases, quando um usuário com permissão importa uma planilha de relatório SDF válida, então o sistema cruza os dados pelo TC ID e apresenta na aba Form Factor o SDF ID, os resultados reportados por modelo e a data disponível no relatório, sem alterar os dados de gerenciamento dos Test Cases.
- **CA-20 (falha):** Dado um usuário sem a permissão de importar relatório SDF ou uma linha do relatório cujo TC ID não pertença ao projeto, quando tenta importar o arquivo, então o sistema recusa a operação ou identifica a linha não associada sem alterar resultados de outros Test Cases.
- **CA-21 (falha):** Dada uma planilha de Test Cases com uma linha cujo TC Situation está vazio ou fora de `New`, `New Step` e `Without Changes`, quando a pessoa tenta importá-la, então o sistema informa a linha e o campo inválidos e não cria o projeto nem os casos.
- **CA-22:** Dada uma planilha de Test Cases que também traz uma coluna de Status, quando é importada, então os casos são criados com Status `To-Do`, independentemente do valor da coluna.
- **CA-23:** Dados Test Cases cadastrados antes da separação entre TC Situation e Status, quando a mudança entra em vigor, então cada caso passa a ter TC Situation `New` e o Status igual à situação de progresso que tinha.
- **CA-24:** Dada uma planilha válida com 1.000 Test Cases, quando a pessoa a seleciona para importação, então a prévia mostra o total de 1.000 casos, exibe 20 casos por página e permite ir para a próxima página, para a anterior, para a primeira e para a última, mostrando a página atual e o total de páginas.
- **CA-25:** Dada uma planilha válida, quando a importação é concluída, então o sistema exibe uma notificação de sucesso dizendo que a planilha foi importada e quantos Test Cases foram criados, por exemplo "Planilha importada com sucesso: 1.000 Test Cases criados em Clock 9.5".
- **CA-26 (falha):** Dada uma planilha com mais de 20 linhas inválidas, quando a pessoa a seleciona, então o sistema mostra quantas linhas têm problema em relação ao total, lista 20 linhas por página com seus problemas agrupados e mantém a criação do projeto bloqueada.
- **CA-27 (falha):** Dada uma linha com TC Situation `To-Do`, Category vazia e responsável que não é membro do time, quando a planilha é lida, então essa linha aparece uma única vez com os três problemas, cada um com o nome da coluna, o valor encontrado e os valores ou condições esperados, sem identificadores técnicos internos.
- **CA-28 (falha):** Dada uma planilha em que o TC ID `Clock_001` aparece nas linhas 2 e 5, quando é lida, então a linha 5 informa que `Clock_001` já apareceu na linha 2.
- **CA-29 (falha):** Dada uma planilha sem nenhuma linha de Test Case, ou sem uma coluna obrigatória, quando é lida, então o sistema mostra um problema geral da planilha, sem atribuí-lo a um número de linha, citando as colunas faltantes pelo nome.
- **CA-30 (falha):** Dada a interface em inglês, português ou coreano, quando a planilha tem problemas, então todas as mensagens aparecem no idioma da interface.
- **CA-31:** Dado um projeto com casos concluídos e pendentes, quando uma semana é selecionada no cabeçalho de Test Cases, então aparecem somente os casos cuja Data final pertence à semana no fuso do navegador, com contagem e paginação correspondentes aos filtros; ao limpar, os casos sem Data final voltam a aparecer.
- **CA-32 (falha):** Dada uma semana ISO inexistente ou um fuso horário inválido, quando a consulta de Test Cases é feita, então a consulta é recusada sem retornar resultados incorretos.
- **CA-33:** Dadas seleções diferentes de semana em Test Cases e Form Factor, quando a pessoa alterna entre as abas, então cada aba mantém sua seleção; quando não há casos na semana selecionada, a tela informa que nenhum caso corresponde aos filtros e permite limpá-los.

## Fora de escopo

- Registrar execuções repetidas de um mesmo Test Case, evidências, anexos, defeitos ou histórico detalhado de cada tentativa.
- Criar tarefas livres que não sejam Test Cases.
- Sincronizar dados de planilha continuamente após a importação.
- Submeter Test Cases ao SDF, executar ou rotear os casos entre modelos, ou controlar o ciclo de execução do SDF.
- Gerenciar o ciclo de vida de aplicativos ou versões One UI fora dos catálogos necessários para selecionar esses valores.

## Dúvidas em aberto

- Nenhuma decisão bloqueante conhecida para a spec.

## Ajuste: edição rápida de responsável e backup — 2026-10-25

- Nas colunas Assignee e Backup da tabela Test Cases, administrador da unidade, gerente ou KP com `test_cases.gerenciar` e escopo sobre o time pode trocar diretamente a pessoa atribuída por um dropdown.
- As opções são membros ativos do time do projeto, excluindo a pessoa já escolhida no outro campo. A validação existente do backend continua exigindo pessoas distintas e membros ativos.
- Demais usuários continuam vendo os nomes sem controles de edição. Os resultados Form Factor permanecem históricos e não editam atribuições.

**Critério adicional:** Dado um usuário autorizado a gerenciar Test Cases no escopo do projeto, quando escolhe outro membro ativo em Assignee ou Backup, então a atribuição é salva; usuário sem essa autorização não recebe controles de edição e chamadas sem autorização são recusadas.

## Ajuste: edição dos dados do projeto — 2026-10-25

- O nome do projeto é um campo próprio, obrigatório e editável (máximo de 150 caracteres). Na criação, começa preenchido com `<App> <One UI>`; depois pode ser alterado sem mudar App ou One UI.
- A edição do projeto permite alterar nome, App, One UI, time e modelos de dispositivo. Status continua editável na listagem; datas permanecem gerenciadas pelo sistema.
- O time de destino deve estar ativo e dentro do escopo do usuário. A troca é recusada se qualquer responsável ou backup de Test Case ativo do projeto não for membro ativo do time de destino.
- Os modelos selecionados devem existir, estar ativos e pertencer à unidade. A atualização substitui as associações atuais em uma única operação.

**Critérios de aceite adicionais:**

- **CA-34:** Dado um projeto, quando uma pessoa autorizada altera o nome, App, One UI, time e modelos válidos, então os dados atualizados são persistidos e o nome não é recalculado quando App ou One UI mudar depois.
- **CA-35 (falha):** Dado um projeto com Test Cases ativos, quando o time de destino não contém todos os responsáveis e backups ativos, então a edição é recusada sem alterar o projeto nem suas associações de modelos.
- **CA-36 (falha):** Dado um modelo inativo, inexistente ou de outra unidade, quando é enviado na edição, então a operação é recusada sem alterar o projeto.
