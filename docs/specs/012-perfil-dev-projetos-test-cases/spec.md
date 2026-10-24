# 012. Perfil Dev em Projetos e Test Cases: Spec

- **Status:** Concluída
- **Data:** 2026-10-24
- **Relacionada:** spec 011 — Projetos e Test Cases

## Problema

O acesso por Projects leva à listagem de projetos também para o dev, acrescentando uma etapa antes da consulta aos Test Cases. Quando não há projeto associado ou casos designados, o dev precisa entender por que não encontra trabalho disponível.

## Objetivo

Permitir que o dev acesse diretamente seus Test Cases de um projeto pela opção Projects da navegação lateral. Quando houver múltiplos projetos com casos associados ao dev, abrir o primeiro encontrado; quando não houver projetos ou Test Cases associados, apresentar um estado vazio explicativo.

## Histórias de usuário

- Como **dev**, quero encontrar Projects na navegação lateral e acessar diretamente os Test Cases.
- Como **dev**, quero consultar os Test Cases em que sou responsável principal ou backup para acompanhar minhas responsabilidades no projeto.
- Como **dev com múltiplos projetos associados**, quero trocar de projeto pelo seletor existente na tela de Test Cases para consultar meus casos em cada projeto.
- Como **dev sem projeto associado**, quero entender que ainda não há projeto disponível para mim.
- Como **dev sem Test Cases designados**, quero entender que ainda não há casos atribuídos a mim.

## Regras de negócio

- RN-01: A navegação lateral do dev apresenta a opção Projects, respeitando o idioma selecionado.
- RN-02: Ao selecionar Projects, o dev é encaminhado diretamente à listagem de Test Cases, sem precisar escolher um projeto na listagem de projetos e sem que essa listagem seja exibida durante o encaminhamento.
- RN-03: O dev não acessa a tela de listagem de projetos. Uma tentativa de acesso direto a essa tela também o encaminha ao fluxo de Test Cases.
- RN-04: Quando não há projeto ou Test Case associado ao dev, o destino de Projects apresenta um único estado vazio com o título sugerido “Nenhum projeto ou Test Case associado” e a explicação “Você ainda não tem projetos ou Test Cases associados a você.”
- RN-05: Quando o dev tem exatamente um projeto com Test Cases associados a ele, selecionar Projects abre automaticamente a listagem dos casos dele nesse projeto.
- RN-06: O estado vazio aparece após a conclusão da consulta. Carregamento e falha na consulta têm apresentações próprias; uma falha não pode ser apresentada como ausência de projetos ou de Test Cases.
- RN-07: A navegação lateral permanece disponível no estado vazio. Ele não oferece ações de criação de projetos ou atribuição de casos que o dev não possa executar.
- RN-08: As mensagens do estado vazio acompanham o idioma da interface.
- RN-09: O encaminhamento respeita o escopo de acesso do dev e não revela projetos ou Test Cases fora desse escopo. As regras de edição e transferência da spec 011 continuam aplicáveis.
- RN-10: Quando o dev tem múltiplos projetos com Test Cases associados a ele, selecionar Projects abre automaticamente os casos dele no primeiro projeto encontrado dentre esses projetos. Não há preferência obrigatória por nome, data ou último acesso, nem uma etapa de escolha de projeto. A listagem inicial corresponde a um único projeto, sem unificar casos de projetos diferentes.
- RN-11: Um Test Case é associado ao dev quando ele é o responsável principal ou o backup do caso. Essa definição vale tanto para identificar os projetos elegíveis ao encaminhamento quanto para selecionar os casos exibidos na listagem. Um projeto acessível com pelo menos um caso em qualquer dessas condições é considerado associado ao dev neste fluxo.
- RN-12: Ser backup permite que o caso apareça nessa consulta, mas não concede as permissões de edição ou transferência reservadas ao responsável principal na spec 011.
- RN-13: A troca de projeto usa o seletor de projeto já existente na tela de Test Cases. Para o dev, ele oferece os projetos acessíveis em que há pelo menos um caso associado a ele como responsável principal ou backup. Ao selecionar outro projeto, o dev permanece na tela de Test Cases e passa a ver seus casos desse projeto, sem acessar a tela de listagem de projetos.

## Critérios de aceite

- **CA-01:** Dado um dev autenticado, quando visualiza a navegação lateral, então encontra a opção Projects no idioma selecionado.
- **CA-02:** Dado um dev com exatamente um projeto com Test Cases associados a ele, quando seleciona Projects, então acessa diretamente a listagem dos casos dele nesse projeto, sem visualizar ou interagir com a listagem de projetos.
- **CA-03:** Dado um dev, quando tenta abrir diretamente a tela de listagem de projetos, então é encaminhado ao fluxo de Test Cases e a listagem de projetos não é exibida.
- **CA-04:** Dado um dev sem projetos nem Test Cases associados, quando seleciona Projects, então vê o estado vazio que informa que ainda não tem projetos ou Test Cases associados a ele, mantendo a navegação lateral disponível.
- **CA-05:** Dado um dev que participa de um time com projetos, mas não tem Test Cases associados em nenhum deles, quando seleciona Projects, então vê o mesmo estado vazio, sem passar pela listagem de projetos.
- **CA-06 (falha):** Dada uma falha ao consultar os dados necessários, quando o dev acessa Projects, então recebe uma indicação de falha, sem a informação incorreta de que não tem projetos ou Test Cases.
- **CA-07:** Dada uma consulta em andamento, quando o dev acessa Projects, então vê uma indicação de carregamento até que seja possível apresentar a listagem ou o estado vazio correspondente.
- **CA-08 (falha):** Dado um dev sem acesso a determinado projeto, quando tenta acessá-lo diretamente, então o acesso é recusado sem revelar os dados desse projeto ou de seus Test Cases.
- **CA-09:** Dada a interface em inglês, português ou coreano, quando o dev encontra o estado vazio, então os textos aparecem no idioma selecionado.
- **CA-10:** Dado um dev com Test Cases associados em múltiplos projetos, quando seleciona Projects, então acessa diretamente os casos dele no primeiro projeto encontrado dentre esses projetos, sem uma etapa de escolha e sem reunir casos de outros projetos na mesma listagem.
- **CA-11:** Dado um dev sem casos associados em um projeto e com casos associados em outro projeto acessível, quando seleciona Projects, então abre o projeto com casos associados a ele, em vez de apresentar o estado vazio por causa do projeto sem casos.
- **CA-12:** Dado um dev que é somente backup de um Test Case em seu único projeto associado, quando seleciona Projects, então acessa diretamente a listagem desse projeto com o caso em que é backup, sem receber o estado vazio.
- **CA-13:** Dado um projeto com casos em que o dev é responsável principal, casos em que é backup e casos em que não exerce nenhuma dessas funções, quando acessa sua listagem de Test Cases, então vê os dois primeiros grupos e não vê o terceiro nessa listagem.
- **CA-14 (falha):** Dado um dev que é apenas backup de um caso e não possui autorização de gestão, quando tenta editar ou transferir esse caso antes de assumir a responsabilidade principal, então a operação é recusada conforme as regras da spec 011.
- **CA-15:** Dado um dev com múltiplos projetos associados, quando abre o seletor de projeto na tela de Test Cases e seleciona outro projeto, então o projeto selecionado passa a ser o contexto da tela e são exibidos os casos em que ele é responsável principal ou backup nesse projeto, sem passar pela listagem de projetos.
- **CA-16:** Dado um dev com acesso a projetos com e sem casos associados a ele, quando abre o seletor de projeto na tela de Test Cases, então encontra somente os projetos com pelo menos um caso em que é responsável principal ou backup.

## Fora de escopo

- Alterar o fluxo de projetos de administrador, gerente ou KP.
- Alterar as regras de edição de campos, transferência para backup ou importação de relatórios SDF.
- Criar projetos ou atribuir Test Cases automaticamente ao dev.
- Definir novas permissões de consulta a casos de colegas; o acesso inicial desta spec apresenta os casos associados ao próprio dev.

## Dúvidas em aberto

- Nenhuma dúvida em aberto para este fluxo.
