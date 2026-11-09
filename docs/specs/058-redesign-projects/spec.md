# 058. Redesign de Projects: Spec

- **Status:** Concluída
- **Data:** 2026-11-02
- **Specs relacionadas:** 012 e 022 (Projects do dev), 032 (Resumo de execuções), 055 (fundação visual), 056 e 057
  (botão Filter)
- **Referência visual:** protótipo do Figma, frames 2549-2085 (aba Test Cases) e 2550-3540 (aba Form Factor), perfil
  dev, tema claro. Os vazios (2550-2877 e 2550-3100) já foram feitos na spec 055.

## Problema

A tela de um projeto (abas Test Cases e Form Factor) ainda tem o visual antigo, e dois pontos do protótipo mudam o que a
pessoa vê. A Origem de um resultado aparece como "SDF", que não diz nada a quem não conhece a sigla; o protótipo a chama
de "Spreadsheet". E cada linha de resultado ganha um ícone de histórico que abre as execuções do caso, coisa que hoje só
Admin, Gerente e KP fazem, pela General Results.

## Objetivo

A tela do projeto, em todos os perfis, tem a aparência do protótipo. A Origem passa a se chamar "Spreadsheet", e quem vê
os resultados de Form Factor do projeto, o dev inclusive, abre o histórico de execuções de cada caso.

## Histórias de usuário

- Como **pessoa de qualquer perfil**, quero a tela do projeto com a mesma identidade das outras telas.
- Como **dev**, quero abrir o histórico de execuções de um caso a partir da linha do resultado, para ver os dias e
  os modelos sem sair do projeto.
- Como **quem lê a coluna Origin**, quero ler "Spreadsheet" em vez de "SDF", para entender de onde veio o resultado.

## Regras de negócio

- RN-01: O cabeçalho mostra o nome do projeto à esquerda, com o seletor de projeto de hoje (menu com seta), e o filtro
  de semana à direita. Abaixo ficam as abas Test Cases e Form Factor, com a aba ativa em azul e sublinhada.
- RN-02: Os botões das abas ficam onde estão e só aparecem para quem já os vê: "New Test Case" (quem gerencia casos) e
  "Create test round" e "Import SDF report" (só perfis de gerência).
- RN-03: As tabelas seguem o protótipo: cabeçalho cinza, linhas numeradas, Status e TC Situation em etiquetas,
  resultados em etiquetas verde (Pass) e vermelha (Fail), rodapé sem total (spec 055). As colunas, os filtros, a
  edição na célula e as ações de hoje não mudam. O protótipo mostra um subconjunto das colunas; as demais continuam.
- RN-04: Na aba Form Factor, a Origem mostra **Manual** ou **Spreadsheet**, na coluna, no filtro da coluna e na
  exportação. O valor guardado continua sendo `SDF`; só o nome muda.
- RN-05: Na visão Results da aba Form Factor, cada linha ganha a coluna Actions com o ícone de histórico. Ele abre um
  painel lateral com todas as execuções do caso, em uma grade de modelos por datas, como o Resumo de execuções da
  General Results (spec 032), com o mesmo detalhe ao abrir um resultado.
- RN-06: Pode abrir o histórico quem vê os resultados do projeto na aba Form Factor, para os casos de projetos do
  seu escopo. O dev passa a poder. A General Results mantém as regras de hoje.
- RN-07: Na aba Test Cases, as ações da linha (editar e transferir para o backup) continuam como estão.
- RN-08: Estados vazios, de erro e de carregamento usam o painel da spec 055. O tema escuro não muda nesta spec.

## Critérios de aceite

- **CA-01:** Dado um projeto, quando a pessoa o abre, então vê o nome com o seletor, o filtro de semana e as abas, com a
  ativa em azul e sublinhada.
- **CA-02:** Dado a aba Test Cases do dev, quando ela abre, então a tabela tem o visual do protótipo (linhas numeradas,
  etiquetas, rodapé sem total) e as ações de editar e transferir para o backup funcionam como antes.
- **CA-03 (falha):** Dado um projeto sem casos, ou um filtro sem resultado, quando a tabela aparece, então mostra o
  estado vazio da spec 055, com a opção de limpar o filtro quando há filtro.
- **CA-04:** Dado resultados de origens diferentes, quando a aba Form Factor abre, então a coluna mostra "Manual" e
  "Spreadsheet", e nunca "SDF"; o filtro da coluna oferece os dois nomes e filtra pelas execuções certas; a exportação
  usa os mesmos nomes.
- **CA-05:** Dado a visão Results, quando a pessoa aciona o ícone de histórico de uma linha, então abre o painel com a
  grade de modelos por datas do caso, e abrir um resultado mostra o detalhe.
- **CA-06:** Dado um dev com acesso ao projeto, quando aciona o histórico de um caso, então o painel abre com as
  execuções do caso.
- **CA-07 (falha):** Dado um caso de projeto fora do escopo da pessoa, ou uma pessoa sem permissão de consultar Form
  Factor, quando pede o histórico, então recebe o mesmo erro de caso inexistente (ou de falta de permissão) e nada é
  mostrado.
- **CA-08 (falha):** Dado que a consulta do histórico falha, quando o painel abre, então mostra a mensagem de erro e o
  botão de tentar de novo.
- **CA-09:** Dado um perfil de gerência e um dev, quando abrem a aba Form Factor, então só a gerência vê "Create test
  round" e "Import SDF report".
- **CA-10:** Dado o idioma inglês, português ou coreano, quando a pessoa percorre as duas abas e o painel, então nenhum
  texto fica cortado ou sobreposto.
- **CA-11:** Dado o uso só com o teclado, quando a pessoa percorre as abas, a tabela e o ícone de histórico, então cada
  controle mostra o foco; o painel abre e fecha por teclado e o foco volta ao ícone.
- **CA-12:** Dado o tema escuro, quando a pessoa abre a tela, então as cores são as de antes desta spec.

## Fora de escopo

- Board, Timeline e General Results (a General Results é a spec 059).
- Mudar colunas, filtros, edição na célula, paginação ou permissões dos Test Cases.
- Renomear o valor `SDF` guardado no banco, ou o nome "Import SDF report" do botão.
- A visão Summary do Form Factor além do visual novo.
- A paleta do tema escuro.

## Dúvidas em aberto

- **Título da página.** O frame mostra o nome do projeto em cor de texto, e a spec 055 manda os títulos em azul.
  Proponho seguir o frame: o nome do projeto fica como o título, em cor de texto, e as abas e o botão ativo carregam o azul.
- **Coluna Assignee e visão Summary.** O frame da aba Form Factor não tem Assignee nem o seletor Results/Summary.
  Proponho manter as duas visões e o Assignee para quem gerencia, e esconder o Assignee só do dev, que já enxerga os
  casos do próprio time. Se o Summary deve sair da aba, é outra spec.
- **"Projects > Form Factor" no topo.** Só o frame do Form Factor desenha esse caminho de migalhas. Proponho não criar:
  o frame da aba Test Cases não o tem.
- **Escopo do histórico do dev.** O dev já vê os resultados de todos os casos do projeto do time dele. Proponho o
  histórico com a mesma regra (qualquer caso de projeto do escopo), e não só dos casos em que ele é responsável.
