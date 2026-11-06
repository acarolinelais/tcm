# 030. Links de PR do Test Case e painel de detalhes em todas as tabelas: Spec

- **Status:** Concluída
- **Data:** 2026-10-28

## Problema

Um Test Case passa por vários PRs ao longo do tempo: o PR inicial, as correções depois de um `FAIL` na rodada
(spec 023) e eventuais ajustes. Hoje o sistema não guarda nenhum desses links. Quem revisa ou valida o caso
precisa perguntar ao dev ou procurar no repositório qual PR corresponde a qual TC.

Além disso, o painel de detalhes do Test Case (spec 028) só abre pela tabela de Test Cases. Nas tabelas de
Form Factor e de Resultados gerais o TC ID é texto simples, e quem está validando precisa trocar de aba para ler
o procedimento do caso.

## Objetivo

O painel de detalhes do Test Case ganha uma seção **Pull Requests**, com o histórico de links de PR do caso no
GitHub Enterprise da empresa: qualquer perfil com acesso ao caso adiciona links, e a gestão também os remove. O TC
ID passa a abrir esse painel em todas as tabelas de projetos.

## Histórias de usuário

- Como **dev**, quero registrar o link de cada PR que abri para um TC para que a revisão e a validação o
  encontrem sem me perguntar.
- Como **gestão do projeto** (admin da unidade, gerente ou KP), quero ver o histórico de PRs de um TC para
  acompanhar quantas correções ele teve.
- Como **quem valida no Form Factor**, quero abrir os detalhes do TC direto da tabela de resultados para ler o
  procedimento sem trocar de aba.

## Regras de negócio

- RN-01: Um Test Case tem **zero ou mais** links de PR. Cada link guarda a URL, a data e hora em que foi
  adicionado e quem o adicionou.
- RN-02: A URL é obrigatória, deve começar com `https://`, apontar para o GitHub Enterprise
  **`github.sec.samsung.net`** (exatamente esse endereço, sem diferenciar maiúsculas de minúsculas; outros sites e
  subdomínios são recusados) e ter **até 2.000 caracteres**. Espaços nas pontas são removidos antes de validar.
- RN-03: O mesmo Test Case não aceita a mesma URL duas vezes. A comparação é feita depois de remover os espaços
  das pontas e diferencia o restante do texto (`.../pull/1` e `.../pull/1/` são links diferentes). A mesma URL
  pode estar em Test Cases diferentes.
- RN-04: Qualquer perfil que pode abrir o painel de um caso (spec 028, RN-07) pode **ver e adicionar** os links
  dele. **Remover** é permitido a todos esses perfis **menos o dev**: a gestão (administrador, admin da unidade,
  gerente e KP, cada um no seu escopo) remove qualquer link, inclusive os adicionados por outra pessoa. O dev não
  remove nenhum link, nem os que ele mesmo adicionou.
- RN-05: Remover pede confirmação. Um link removido some do histórico e a mesma URL pode ser adicionada de novo.
- RN-06: Os links não são editáveis: para corrigir uma URL, remove-se e adiciona-se de novo.
- RN-07: A lista mostra os links do **mais recente para o mais antigo**. Cada item mostra a URL como link que abre
  em nova aba, a data e hora em que foi adicionado e o nome de quem adicionou.
- RN-08: A importação da planilha não cria, altera nem apaga links de PR.
- RN-09: O TC ID abre o painel de detalhes, em todos os perfis, nestas tabelas: **Test Cases**, **Form Factor**
  (resumo por modelo), **Form Factor › Resultados** (histórico de rodadas) e as duas de **Resultados gerais**
  (resumo e histórico). O TC ID tem aparência de link e o clique nele não dispara outra ação da linha (edição
  inline, seleção, registrar resultado).
  > **Revogado em parte pela spec 050 (2026-10-30):** em Resultados gerais o TC ID é texto simples e não abre o
  > painel, que fica só na página do projeto (abas Test Cases e Form Factor).
- RN-10: O painel continua abrindo pela direita e fechando pelo X, por Esc, por clique fora e pelos botões do
  rodapé. Os textos da planilha continuam só de leitura (spec 028). Uma URL digitada e não adicionada é
  descartada ao fechar.
- RN-11: Adicionar e remover mostram uma notificação de sucesso ou de erro, no padrão das demais ações do
  sistema.

## Critérios de aceite

> Formato Dado / Quando / Então. Os de falha trazem `(falha)`.

- **CA-01:** Dado um caso sem links, quando o painel é aberto, então a seção Pull Requests mostra
  "Nenhum PR registrado" e o campo para adicionar.
- **CA-02:** Dado o painel de um caso, quando um dev adiciona `https://github.sec.samsung.net/org/repo/pull/12`, então o
  link aparece no topo da lista com a data e hora atuais e o nome do dev, e uma notificação de sucesso é
  exibida.
- **CA-03:** Dado um caso com três links adicionados em momentos diferentes, quando o painel é aberto, então
  eles aparecem do mais recente para o mais antigo.
- **CA-04:** Dado um link na lista, quando o usuário clica nele, então a URL abre em uma nova aba, sem dar à
  página aberta acesso à página do sistema.
- **CA-05 (falha):** Dado o campo de URL, quando o usuário tenta adicionar `github.sec.samsung.net/org/repo/pull/1`
  (sem protocolo), `http://github.sec.samsung.net/org/repo/pull/1`, `ftp://github.sec.samsung.net/x`, `https://` ou um texto em branco, então o link não é
  adicionado e uma mensagem junto ao campo explica o formato aceito.
- **CA-06 (falha):** Dado o campo de URL, quando o usuário tenta adicionar `https://github.com/org/repo/pull/1` ou
  `https://outro.github.sec.samsung.net/org/repo/pull/1`, então o link não é adicionado e a mensagem informa que
  só são aceitos links do `github.sec.samsung.net`. Já `https://GitHub.sec.samsung.net/org/repo/pull/1` é aceito.
- **CA-07 (falha):** Dado um pedido que chega ao sistema sem passar pela tela, com uma URL inválida, de outro
  domínio ou com mais de 2.000 caracteres, então o sistema recusa e informa o motivo, sem gravar nada.
- **CA-08 (falha):** Dado um caso que já tem `https://github.sec.samsung.net/org/repo/pull/12`, quando alguém
  adiciona a mesma URL (com ou sem espaços nas pontas), então o sistema recusa, informa que o link já está
  registrado e a lista não muda.
- **CA-09:** Dado um link adicionado por outra pessoa, quando um usuário de gestão (administrador, admin da
  unidade, gerente ou KP com acesso ao caso) clica em remover e confirma, então o link sai da lista e uma
  notificação de sucesso é exibida.
- **CA-10 (falha):** Dado um dev com acesso ao caso, quando ele abre o painel, então nenhum link (nem os que ele
  adicionou) tem a opção de remover; e se o pedido de remoção chegar ao sistema sem passar pela tela, o sistema
  recusa por falta de permissão e o link continua registrado.
- **CA-11:** Dado a confirmação de remoção aberta, quando o usuário cancela, então o link continua na lista.
- **CA-12:** Dado um link removido, quando a mesma URL é adicionada de novo ao mesmo caso, então ela é aceita.
- **CA-13 (falha):** Dado um link que outra pessoa já removeu, quando um usuário de gestão tenta removê-lo, então o sistema
  informa que o link não foi encontrado e a lista é atualizada.
- **CA-14 (falha):** Dado um caso que deixou de existir ou está fora do acesso do usuário, quando ele tenta
  listar, adicionar ou remover links desse caso, então o sistema recusa como caso não encontrado, sem revelar
  links de outro caso.
- **CA-15 (falha):** Dado que a lista de links não pôde ser carregada, quando o painel é aberto, então a seção
  mostra uma mensagem de erro com a opção de tentar de novo, e os textos da planilha continuam visíveis.
- **CA-16:** Dado um caso com links, quando uma nova planilha é importada no projeto, então os links do caso
  continuam iguais.
- **CA-17:** Dado cada uma das tabelas da RN-09, em cada perfil que a vê, quando o usuário clica no TC ID (ou
  chega nele pelo teclado e aperta Enter), então abre o painel daquele caso, e ao fechar a tabela continua com
  os mesmos filtros e página.
- **CA-18:** Dado uma linha com edição inline ou com a ação de registrar resultado, quando o usuário clica no TC
  ID, então só o painel abre: nenhum campo entra em edição e nenhuma outra ação é disparada.

## Fora de escopo

- Editar um link já registrado (RN-06).
- Ler dados do PR no GitHub (título, estado, aprovado ou não) ou validar se o PR existe.
- Links de outros sites além do `github.sec.samsung.net` (github.com, GitLab etc.) e exigir que a URL seja de um
  PR (formato `/pull/N`): basta ser do domínio.
- Tornar o domínio configurável por unidade ou pela tela.
- Mudar o Status do caso automaticamente ao adicionar um PR (o ciclo da spec 023 continua manual).
- Mostrar os links na tabela, na prévia da planilha ou em relatórios; importar links pela planilha.
- Histórico de quem removeu um link e quando, visível na tela.
- Mudanças nos textos da planilha ou na forma como a importação os extrai (já cobertos pela spec 028).

## Dúvidas em aberto

Decisões tomadas nesta versão, para confirmar na revisão:

- **Quem remove:** todos os perfis com acesso ao caso, menos o dev, removem qualquer link (RN-04). Decidido em
  2026-10-28.
- **Domínio:** só `github.sec.samsung.net`, exato (RN-02). Decidido em 2026-10-28. Só `https://` é aceito; `http://` é recusado. Decidido em 2026-10-28.
- **Duplicidade:** comparação exata depois de tirar os espaços (RN-03). Não normaliza barra final, maiúsculas
  nem parâmetros da URL.
- **Tabelas:** a prévia da importação fica de fora da RN-09, porque o caso ainda não existe.
- **"Endpoint de atualização do link":** como os links não são editáveis (RN-06), os testes pedidos cobrem
  adicionar (com a validação de URL e a duplicidade) e remover.
