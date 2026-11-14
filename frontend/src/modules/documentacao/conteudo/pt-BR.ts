import type { ConteudoGuia, SlugGuia } from "../model/guia";

// Guia sem tradução aqui aparece em inglês, com aviso (spec 048, RN-03).
export const ptBR: Partial<Record<SlugGuia, ConteudoGuia>> = {
  "getting-started": {
    titulo: "Primeiros passos",
    resumo: "Entre no sistema, troque a senha, escolha idioma e tema e conheça o menu.",
    secoes: [
      {
        titulo: "Primeiro acesso",
        paragrafos: [
          "O administrador da unidade cria a sua conta com a senha padrão do time. No primeiro acesso, o sistema pede uma senha nova antes de você continuar.",
          "Esqueceu a senha? Fale com o administrador da unidade. Ele volta a senha para a padrão, e você escolhe uma nova no próximo acesso.",
        ],
      },
      {
        titulo: "Sua conta",
        itens: [
          "Trocar senha: em Configurações, Trocar senha. Você digita a senha atual e a nova duas vezes.",
          "Idioma: inglês, português ou coreano, na barra superior ou na tela de login. A escolha fica na sua conta e vale em qualquer computador.",
          "Tema: claro ou escuro, na barra superior. A escolha fica salva neste navegador.",
          "Cor do avatar: em Configurações. A sua cor aparece nos cards e listas onde o seu nome aparece.",
        ],
      },
      {
        titulo: "O menu lateral",
        itens: [
          "Visão geral: gráficos e números do seu trabalho ou, para a gestão, dos times que você acompanha.",
          "Quadro: o Kanban de um projeto, com uma coluna por Status de Test Case.",
          "Linha do tempo: quem mudou qual Test Case e quando, por dia, semana ou mês.",
          "Resultados Gerais: os resultados de Form Factor por device e data.",
          "Projetos: os projetos dos seus times e os Test Cases deles.",
          "Administração: usuários, setores, times, perfis e permissões, auditoria e modelos de dispositivo. Cada item aparece só para os perfis que o usam.",
          "Documentação e Configurações: estes guias e a sua conta.",
        ],
      },
      {
        titulo: "O que você vê",
        paragrafos: [
          "Cada lista mostra só o que o seu perfil e os seus times permitem. Se falta um projeto ou uma pessoa, provavelmente está fora do seu escopo. O guia Perfis e permissões explica cada perfil.",
        ],
      },
    ],
  },
  "status-cycle": {
    titulo: "Ciclo de Status do Test Case",
    resumo: "O que cada Status significa, quem faz o Test Case avançar e quando o sistema o move sozinho.",
    secoes: [
      {
        titulo: "O fluxo esperado",
        itens: [
          "A fazer: todo Test Case novo começa aqui.",
          "Em andamento: o desenvolvedor começou a trabalhar nele.",
          "Em revisão: o pull request foi enviado.",
          "Em validação: o pull request foi aprovado e o caso espera os resultados de Form Factor.",
          "Concluído: todos os devices do projeto passaram.",
          "Em correção: algum device falhou. Depois da correção, o desenvolvedor envia um novo pull request e o caso volta para Em revisão.",
          "Excluído: o caso não pode ser automatizado. Ele mantém os resultados e o histórico.",
        ],
      },
      {
        titulo: "Quem move um Test Case",
        itens: [
          "Administrador, gerente e Pessoa-chave movem qualquer caso dentro do seu escopo.",
          "O responsável principal move os próprios casos, para qualquer Status.",
          "O backup só pode mover o caso para Excluído.",
          "Os demais só consultam.",
          "O Status muda na tabela de Test Cases ou arrastando o card no Quadro. No Quadro, a ação Mover para de cada card faz o mesmo sem mouse.",
        ],
      },
      {
        titulo: "Quando o sistema move sozinho",
        paragrafos: [
          "Um caso Em validação se move sozinho quando chegam resultados de um relatório SDF ou de uma rodada de testes:",
        ],
        itens: [
          "o resultado mais recente de cada device é PASS: o caso vai para Concluído;",
          "o resultado que acabou de chegar é FAIL: o caso vai para Em correção;",
          "qualquer outra situação, como um device ainda sem resultado: o caso continua Em validação.",
          "um caso Concluído recebe FAIL num relatório SDF: o caso volta para Em correção numa nova tentativa, com o mesmo corretor. Só vale quando o FAIL é o resultado mais recente daquele device e o projeto não está encerrado.",
        ],
      },
      {
        titulo: "Excluir um Test Case",
        paragrafos: [
          "Mover um caso para Excluído pede uma justificativa de até 500 caracteres. Quem vê o caso lê a justificativa em Ver justificativa, na coluna Observações. Se o caso sai de Excluído, a justificativa é apagada, e uma nova exclusão pede uma nova.",
        ],
      },
      {
        titulo: "Código finalizado e Data final",
        itens: [
          "Código finalizado: a primeira vez que o caso entrou Em revisão.",
          "Data final: a data da execução que completou PASS em todos os devices do projeto.",
          "O sistema grava as duas datas uma vez só, e ninguém as edita.",
        ],
      },
    ],
  },
  "status-and-situation": {
    titulo: "Status e Situação do TC",
    resumo: "O Status mostra em que ponto está o trabalho. A Situação do TC mostra como o caso se compara com projetos anteriores.",
    secoes: [
      {
        titulo: "Status: em que ponto está o trabalho",
        paragrafos: [
          "O Status acompanha o andamento neste projeto e muda enquanto o time trabalha. O guia Ciclo de Status do Test Case explica cada etapa.",
        ],
      },
      {
        titulo: "Situação do TC: de onde o caso veio",
        paragrafos: ["A Situação do TC compara o caso com projetos anteriores. Ela vem da planilha, quase não muda e não afeta o Status: um caso Novo e um caso Sem alterações começam os dois em A fazer."],
        itens: [
          "Novo: um caso que não existia antes.",
          "Novo passo: o caso existe para outra versão de One UI, mas algum passo de execução mudou.",
          "Sem alterações: o caso existe em outro projeto e só muda a versão de One UI.",
        ],
      },
    ],
  },
  "import-spreadsheet": {
    titulo: "Importar projeto por planilha",
    resumo: "Colunas, formatos aceitos e os erros mais comuns antes de enviar o arquivo.",
    secoes: [
      {
        titulo: "Antes de começar",
        itens: [
          "Quem: administrador, gerente e Pessoa-chave, para os times do seu escopo.",
          "Arquivo: XLS ou XLSX, até 25 MB.",
          "Use Baixar template, na tela de envio, para começar pelas colunas certas.",
        ],
      },
      {
        titulo: "Colunas obrigatórias",
        paragrafos: ["Os nomes das colunas ficam em inglês, como no template."],
        itens: [
          "App e One UI: o primeiro valor preenchido de cada uma dá nome ao projeto, como \"Clock 9.5\". Dá para editar o nome antes de criar.",
          "TC ID: único na planilha e no projeto.",
          "Category: A, B ou C.",
          "Difficulty: Low, Medium ou High.",
          "TC Situation: New, New Step ou Without Changes.",
          "Assignees e Backup: o nome, o e-mail ou o User ID da pessoa. Os dois precisam ser membros ativos do time escolhido e pessoas diferentes.",
        ],
      },
      {
        titulo: "Colunas opcionais",
        itens: [
          "Automation Level: 1, 2 ou 3.",
          "Title(English): até 500 caracteres.",
          "Test Precondition(English), Test Procedure(English) e Expected Result(English): até 10.000 caracteres cada, com as quebras de linha.",
          "Maiúsculas e minúsculas não importam nos nomes das colunas. Uma coluna de Status é ignorada: todo caso começa em A fazer.",
        ],
      },
      {
        titulo: "Prévia e erros",
        paragrafos: [
          "Depois de ler o arquivo, a tela mostra uma prévia com o nome do projeto e todos os casos. Dá para esconder a prévia para ver melhor o formulário.",
          "Se algo estiver errado, nada é criado. Primeiro aparecem os problemas do arquivo inteiro, depois os de cada linha, com o número da linha, a coluna e o valor encontrado. Corrija a planilha, remova o arquivo e envie de novo.",
        ],
      },
      {
        titulo: "Erros comuns",
        itens: [
          "Falta uma coluna obrigatória, ou um cabeçalho aparece duas vezes.",
          "Um valor fora da lista, como \"Hard\" em Difficulty.",
          "Um TC ID repetido em outra linha.",
          "Uma pessoa não encontrada, encontrada mais de uma vez ou que não é membro ativo do time.",
        ],
      },
    ],
  },
  "sdf-report": {
    titulo: "Relatório SDF",
    resumo: "Formato do arquivo, como os resultados mudam o Status e como desfazer a última importação.",
    secoes: [
      {
        titulo: "Quem e onde",
        paragrafos: [
          "Administrador, gerente e Pessoa-chave com a permissão de importar relatório SDF, nos projetos do seu escopo. Use o botão Importar relatório SDF em Resultados Gerais.",
        ],
      },
      {
        titulo: "O que o sistema lê",
        itens: [
          "SDF ID: o nome do arquivo até o primeiro \"_\". 123456-789012_0_Test_1_Detail.xlsx dá 123456-789012. Cada SDF ID pode ser usado uma vez por projeto.",
          "Device: a célula C4. Precisa ser um modelo de dispositivo do projeto.",
          "Data da execução: a célula F4 (Start Time), em ano/mês/dia, como 2026/11/11. A hora é opcional.",
          "Resultados: a tabela com o cabeçalho na linha 7. O Script Name sem .py é o TC ID, o State é o resultado e a Description aparece no detalhe do resultado.",
          "One UI: vem do Test File Path, como OneUI95 para 9.5. Precisa ser a do projeto.",
          "As linhas de HQ_precondition.py e Setup.py são ignoradas.",
        ],
      },
      {
        titulo: "Quando o arquivo é recusado",
        paragrafos: [
          "Qualquer erro recusa o arquivo inteiro e nada é gravado. A mensagem lista os cinco primeiros problemas com a linha ou a célula e diz quantos faltam.",
        ],
      },
      {
        titulo: "Como os resultados mudam o Status",
        itens: [
          "Só os casos Em validação mudam de Status, como explica o guia Ciclo de Status do Test Case. Para os outros, os resultados só vão para o histórico.",
          "O FAIL só conta quando vem neste relatório. Um FAIL antigo de outro device não move o caso.",
          "Valores que não são PASS nem FAIL, como N/A, nunca mudam o Status.",
        ],
      },
      {
        titulo: "Desfazer a última importação",
        paragrafos: [
          "Desfazer última importação remove a importação mais recente do projeto depois da sua confirmação. Os resultados dela saem de todas as telas. Os casos que ela moveu voltam para Em validação, a não ser que alguém os tenha movido depois. A Data final é recalculada e o SDF ID fica livre. Depois, dá para desfazer a importação anterior, uma por vez.",
        ],
      },
    ],
  },
  "general-results-form-factor": {
    titulo: "Resultados Gerais e Form Factor",
    resumo: "Rodadas, resultados por device e o que cada perfil vê.",
    secoes: [
      {
        titulo: "A tabela",
        itens: [
          "Cada projeto é uma aba com o nome do app.",
          "Colunas: TC ID, Responsável, Form Factor (device), ID do SDF, as cinco datas de execução mais recentes e Ações.",
          "A linha recolhida mostra o primeiro device. A seta ao lado do número da linha mostra todos os devices do projeto.",
          "Clique num resultado para ver o detalhe. Ver histórico de execuções, em Ações, lista todas as execuções do caso em todos os devices.",
          "Use o seletor de semana ou o filtro de dia para chegar a datas mais antigas.",
        ],
      },
      {
        titulo: "Quem vê o quê",
        itens: [
          "Administrador, gerente e Pessoa-chave veem todos os casos ativos dos projetos do seu escopo.",
          "O desenvolvedor vê só os casos em que é o responsável ou o backup.",
        ],
      },
      {
        titulo: "Rodadas de testes",
        paragrafos: [
          "Criar rodada de testes captura todos os Test Cases que estão Em validação. Os resultados são registrados por device com Registrar resultado, em Ações, pela gestão ou pelo responsável ou backup do caso. O SDF ID da rodada é opcional, mas não pode se repetir no projeto.",
          "Os resultados registrados movem os casos como explica o guia Ciclo de Status do Test Case.",
        ],
      },
      {
        titulo: "A aba Form Factor do projeto",
        paragrafos: [
          "Dentro de um projeto, a aba Form Factor mostra a mesma tabela só daquele projeto. Os botões Importar relatório SDF e Desfazer última importação ficam em Resultados Gerais.",
        ],
      },
    ],
  },
  "closed-projects": {
    titulo: "Projetos encerrados",
    resumo: "Quando um projeto pode ser encerrado e como voltar a ver os projetos encerrados.",
    secoes: [
      {
        titulo: "Abertos e encerrados",
        paragrafos: [
          "Um projeto está encerrado quando o status é Concluído ou Cancelado. Criado, A fazer e Em andamento são abertos.",
        ],
      },
      {
        titulo: "Concluir um projeto",
        itens: [
          "Um projeto só passa para Concluído quando todos os Test Cases ativos estão em Concluído ou Excluído.",
          "Se algum caso ainda está aberto, o sistema recusa e diz quantos faltam.",
          "Um projeto sem Test Cases pode ser concluído.",
          "Cancelar um projeto não depende dos Test Cases.",
          "Dá para voltar o status depois, na tela Projetos.",
        ],
      },
      {
        titulo: "Onde os projetos encerrados aparecem",
        itens: [
          "Quadro, Linha do tempo e Resultados Gerais listam só os projetos abertos.",
          "Ligue Projetos encerrados nessas telas para ver os encerrados também. O filtro começa desligado sempre que a tela abre.",
          "Projetos lista sempre todos os projetos, porque é lá que o status muda.",
          "Um link direto para um projeto encerrado continua abrindo o projeto.",
        ],
      },
    ],
  },
  "board-and-timeline": {
    titulo: "Quadro e Linha do tempo",
    resumo: "Filtros e como ler as colunas e a grade.",
    secoes: [
      {
        titulo: "Quadro",
        itens: [
          "Com um time só, você vai direto para o Kanban do último projeto. Com mais times, escolha um projeto no card do time.",
          "Há uma coluna por Status, com a quantidade de casos em cada uma.",
          "Cada card mostra o TC ID, a Categoria, a Dificuldade, a Situação do TC e o responsável.",
          "Arraste um card para mudar o Status, ou use Mover para no card. Um card que você não pode mover não pode ser arrastado.",
          "Filtre por responsável, Status, Categoria, Dificuldade e Situação do TC, ou busque pelo TC ID. Os filtros ficam no endereço da página, então um link compartilhado os mantém.",
          "O desenvolvedor vê aqui todos os casos do projeto, não só os dele.",
        ],
      },
      {
        titulo: "Linha do tempo",
        itens: [
          "Escolha um projeto e uma visão: Dia, Semana ou Mês.",
          "Um card agrupa as mudanças de um Test Case num dia, com o responsável atual.",
          "Clique num card para ver cada mudança: campo, antes e depois, quem fez e quando.",
          "Filtre por responsável ou por Test Case. Uma linha vertical marca a hora atual.",
          "A Linha do tempo é só de leitura.",
        ],
      },
    ],
  },
  "roles-and-permissions": {
    titulo: "Perfis e permissões",
    resumo: "O que o administrador, o gerente, a Pessoa-chave e o desenvolvedor podem fazer.",
    secoes: [
      {
        titulo: "Administrador",
        itens: [
          "Vê e altera tudo na unidade.",
          "Gerencia usuários, setores, times e perfis, e redefine senhas.",
          "Abre a tela Auditoria.",
        ],
      },
      {
        titulo: "Gerente",
        itens: [
          "Trabalha com os times dos setores que gerencia e com os times de que participa.",
          "Cria e gerencia projetos, Test Cases, usuários e times nesse escopo.",
          "Cria rodadas de testes e importa relatórios SDF.",
        ],
      },
      {
        titulo: "Pessoa-chave (KP)",
        itens: [
          "Trabalha só com os times de que participa.",
          "Cria e gerencia projetos e Test Cases desses times, e gerencia os membros.",
          "Cria rodadas de testes, importa relatórios SDF e gerencia os modelos de dispositivo.",
        ],
      },
      {
        titulo: "Desenvolvedor",
        itens: [
          "Vê os projetos dos seus times.",
          "Muda o Status dos casos em que é o responsável principal e pode excluir os casos em que é o backup.",
          "Registra resultados de rodada nos casos em que é o responsável ou o backup.",
          "Vê todos os casos no Quadro, mas só os próprios em Projetos e em Resultados Gerais.",
        ],
      },
      {
        titulo: "A sua unidade pode ser diferente",
        paragrafos: [
          "O administrador pode ajustar as permissões de cada perfil na tela Perfis e permissões, então a sua unidade pode ter pequenas diferenças desta lista.",
        ],
      },
    ],
  },
  "export-tables": {
    titulo: "Exportar tabelas para Excel",
    resumo: "Exporte a página atual ou todos os itens, com os filtros aplicados.",
    secoes: [
      {
        titulo: "Como exportar",
        itens: [
          "Use Exportar, no rodapé da tabela.",
          "Página atual: as linhas que você vê, na mesma ordem.",
          "Todos os itens: todas as páginas, com os mesmos filtros.",
        ],
      },
      {
        titulo: "O que vem no arquivo",
        itens: [
          "As mesmas colunas e títulos da tabela, no seu idioma.",
          "Valores legíveis: Status traduzido e nomes em vez de códigos.",
          "Só o que você já pode ver.",
          "O arquivo tem o nome da listagem e a data, como usuarios_2026-10-29.xlsx.",
          "Uma tabela vazia não pode ser exportada.",
        ],
      },
    ],
  },
  audit: {
    titulo: "Auditoria",
    resumo: "Quem mudou o quê num Test Case, e quando.",
    secoes: [
      {
        titulo: "Onde",
        paragrafos: ["Em Administração, Auditoria. A tela é do administrador e é só de leitura."],
      },
      {
        titulo: "Cada linha",
        paragrafos: [
          "Uma linha é uma gravação: data e hora, usuário, perfil, ação, Test Case, projeto, resumo das alterações, origem e tela. A ação é Criação, Alteração, PR incluído ou PR removido. Quando uma gravação muda vários campos, o resumo mostra o primeiro e \"+N\".",
          "Abra uma linha para ver todos os campos alterados, no formato \"campo: antes → depois\".",
        ],
      },
      {
        titulo: "Filtros e exportação",
        itens: [
          "Período, usuário, perfil, ação, Test Case, projeto, origem (API ou Form Factor) e tela.",
          "Os filtros se combinam, e mudar um deles volta para a primeira página.",
          "A exportação funciona como nas outras tabelas, com os filtros aplicados. Veja Exportar tabelas para Excel.",
        ],
      },
    ],
  },
  glossary: {
    titulo: "Glossário",
    resumo: "TC, KP, SDF, Form Factor, Backup, Pass Rate e outros termos.",
    secoes: [
      {
        titulo: "Termos",
        itens: [
          "TC (Test Case): um teste a automatizar. O TC ID, como Clock_0001, é único dentro de um projeto.",
          "Responsável: a pessoa principal de um Test Case.",
          "Backup: a segunda pessoa de um Test Case. Ela pode excluir o caso, e o responsável pode transferir o caso para ela.",
          "KP (Pessoa-chave): quem gerencia o trabalho de um time.",
          "One UI: a versão de software do projeto, como 9.5.",
          "Device (modelo): um modelo de celular ou tablet em que o projeto é testado.",
          "Form Factor: a dimensão dos resultados por device, um resultado por device.",
          "SDF: a ferramenta que executa os testes e exporta o relatório.",
          "SDF ID: o identificador de uma execução do SDF, tirado do nome do arquivo do relatório.",
          "Rodada de testes: um conjunto de Test Cases em validação que espera resultados.",
          "PASS e FAIL: o resultado de uma execução num device.",
          "Pass Rate: na Visão geral, a porcentagem de resultados PASS por device na rodada de testes mais recente de um projeto.",
          "Categoria: A, B ou C.",
          "Dificuldade: Baixa, Média ou Alta.",
          "Situação do TC: Novo, Novo passo ou Sem alterações. Veja o guia Status e Situação do TC.",
          "Automation Level: 1 não automatizável, 2 parcialmente automatizável, 3 totalmente automatizável.",
          "Código finalizado e Data final: veja o guia Ciclo de Status do Test Case.",
        ],
      },
    ],
  },
};
