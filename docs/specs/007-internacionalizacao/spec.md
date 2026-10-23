# 007. Internacionalização do frontend: Spec

- **Status:** Em andamento
- **Data:** 2026-10-23
- **ADRs relacionados:** 0002, 0004, 0006, 0025
- **Specs relacionadas:** 002, 003, 004, 005, 006

## Problema

O frontend mistura textos em português e inglês, e o indicador de idioma no navbar é apenas
decorativo. A experiência precisa oferecer a interface completa em inglês, português brasileiro e
coreano, com escolha persistente por conta para que cada pessoa mantenha seu idioma em diferentes
dispositivos.

## Objetivo

Padronizar os textos e formatos apresentados pelo frontend em três idiomas: inglês (`en`), português
brasileiro (`pt-BR`) e coreano (`ko`). Inglês é o idioma inicial para contas novas e para sessões sem
preferência salva. Uma pessoa autenticada pode trocar o idioma no navbar e manter sua escolha na
conta.

## Histórias de usuário

- Como pessoa usuária, quero usar o sistema em inglês por padrão para ter uma interface consistente.
- Como pessoa usuária, quero trocar para português ou coreano para usar o sistema no idioma que
  prefiro.
- Como pessoa usuária autenticada, quero que meu idioma me acompanhe em outros dispositivos.
- Como pessoa sem sessão, quero escolher o idioma da tela de login antes de autenticar.

## Regras de negócio

- RN-01: Os idiomas suportados pelo frontend são inglês (`en`), português brasileiro (`pt-BR`) e
  coreano (`ko`). Os nomes do seletor são apresentados em inglês: **English**, **Portuguese** e
  **Korean**.
- RN-02: Inglês é o idioma padrão para contas novas, contas existentes sem preferência definida e
  telas anteriores à autenticação.
- RN-03: A preferência de idioma é vinculada à conta autenticada e carregada em qualquer dispositivo
  depois do login. A troca pelo navbar salva a preferência no backend.
- RN-04: A escolha feita antes do login vale para a sessão não autenticada e atualiza os textos da
  tela de login. Depois da autenticação, prevalece a preferência salva na conta.
- RN-05: Todo texto fixo e produzido pela interface deve vir do catálogo do idioma ativo: navegação,
  títulos, ações, formulários, filtros, paginação, estados vazios e de carregamento, confirmações,
  notificações, validações e mensagens de erro.
- RN-06: Rótulos acessíveis, nomes de controles, textos alternativos e mensagens para leitores de tela
  também acompanham o idioma ativo.
- RN-07: Datas, horas e números formatados pela interface usam as convenções do idioma ativo. Valores
  e nomes informados por pessoas usuárias permanecem como foram cadastrados.
- RN-08: Textos de sistema armazenados em catálogo, como módulos/permissões e perfis seedados, são
  exibidos no idioma ativo por códigos estáveis de tradução. Nomes definidos pela unidade para perfis
  customizados permanecem como foram cadastrados.
- RN-09: Erros da API exibidos pela interface são apresentados no idioma ativo por meio de códigos
  estáveis ou mapeamento de contexto; a interface não exibe diretamente detalhes localizados em um
  idioma diferente.
- RN-10: Se uma tradução estiver ausente, a interface usa o texto em inglês da mesma chave e registra
  a chave faltante em desenvolvimento. Não deve exibir a chave interna ao usuário.
- RN-11: O seletor de idioma está disponível no navbar para pessoas autenticadas e na tela de login
  para pessoas não autenticadas. Atualizar o idioma não encerra a sessão nem altera permissões.

## Critérios de aceite

- **CA-01:** Dada uma conta sem preferência de idioma, quando entra no sistema, então todas as telas
  exibem textos em inglês.
- **CA-02:** Dada uma pessoa no navbar, quando escolhe Portuguese ou Korean, então a interface troca
  todos os textos fixos para `pt-BR` ou `ko` sem recarregar a página.
- **CA-03:** Dada uma pessoa autenticada que trocou o idioma, quando entra em outro dispositivo, então
  sua preferência é carregada da conta.
- **CA-04:** Dada uma pessoa sem sessão, quando escolhe outro idioma na tela de login, então os textos
  de autenticação e os erros desse fluxo aparecem no idioma escolhido.
- **CA-05:** Dada uma pessoa que escolheu idioma antes do login, quando autentica em uma conta com
  preferência salva, então a preferência da conta passa a ser usada.
- **CA-06:** Dado qualquer formulário, tabela, modal, toast ou estado vazio, quando a interface está
  em cada idioma suportado, então rótulos, ações, validações e mensagens do componente aparecem nesse
  idioma.
- **CA-07:** Dada uma mensagem de erro da API, quando ela aparece para a pessoa usuária, então o texto
  está no idioma ativo, ainda que o backend retorne detalhe em outro idioma.
- **CA-08:** Dada uma data, hora ou número formatado pela interface, quando o idioma é trocado, então
  sua apresentação segue as convenções correspondentes sem alterar o valor armazenado.
- **CA-09:** Dado um texto de sistema com chave de tradução ausente, quando é exibido, então aparece o
  fallback em inglês e a chave faltante é identificável durante desenvolvimento.
- **CA-10:** Dado um leitor de tela, quando a interface troca de idioma, então nomes acessíveis e
  mensagens anunciadas usam o idioma ativo.
- **CA-11:** Dado que o idioma é trocado, quando uma operação protegida é executada, então as mesmas
  permissões e regras de autorização continuam vigentes.

## Fora de escopo

- Traduzir conteúdo escrito por pessoas usuárias, como nomes de setores, times e perfis customizados.
- Traduzir respostas de negócio da API que não são texto de interface ou catálogo do sistema.
- Alterar regras de autenticação, autorização ou permissões.
- Adicionar idiomas além de inglês, português brasileiro e coreano.

## Dúvidas em aberto

- Nenhuma sobre idioma padrão, persistência na conta ou apresentação dos nomes no seletor. A
  arquitetura técnica e a abrangência dos catálogos serão detalhadas no plano após aprovação.
