# 033. Tema claro e escuro: Spec

- **Status:** Concluída
- **Data:** 2026-10-29
- **Specs relacionadas:** 007
- **ADRs relacionados:** 0037, 0039, 0040

## Problema

A interface só existe em tema claro. Quem usa o sistema por longos períodos ou em ambientes com pouca
luz não tem como reduzir o brilho da tela, e não há nenhum controle para escolher a aparência.

## Objetivo

Oferecer um tema escuro completo, além do claro atual, com um toggle no navbar e na tela de login. A
escolha fica guardada no navegador e é reaplicada nas próximas visitas. Sem escolha, vale o tema claro.

## Histórias de usuário

- Como pessoa usuária, quero alternar entre tema claro e escuro para usar o sistema com o brilho que
  me deixa mais confortável.
- Como pessoa usuária, quero que minha escolha continue valendo quando eu voltar ao sistema no mesmo
  navegador, sem precisar escolher de novo.
- Como pessoa sem sessão, quero escolher o tema já na tela de login.

## Regras de negócio

- RN-01: Os temas disponíveis são **claro** e **escuro**. O claro é o padrão para quem nunca escolheu
  um tema, independentemente da preferência do sistema operacional.
- RN-02: A escolha é guardada no navegador, vale para todas as telas e é a mesma antes e depois do
  login. Ela não acompanha a pessoa em outros navegadores ou dispositivos.
- RN-03: O toggle fica no navbar para pessoas autenticadas e na tela de login para pessoas sem sessão.
  Trocar o tema não recarrega a página, não perde dados digitados e não encerra a sessão.
- RN-04: No tema escuro, toda a interface muda: navegação, tabelas, formulários, modais, menus, toasts,
  badges, estados vazios, de carregamento e de erro. Nenhuma área fica presa ao visual claro.
- RN-05: Os dois temas mantêm contraste legível entre texto e fundo e o foco do teclado visível.
- RN-06: O tema guardado é aplicado já no carregamento, sem a tela piscar no tema errado antes.
- RN-07: O toggle tem nome acessível no idioma ativo e indica qual tema está em uso.
- RN-08: O tema é apenas visual: não altera permissões, sessão, idioma nem dados.

## Critérios de aceite

- **CA-01:** Dado um navegador sem tema guardado, quando a pessoa abre o sistema, então a interface
  aparece no tema claro, mesmo que o sistema operacional esteja em modo escuro.
- **CA-02:** Dada uma pessoa autenticada em tema claro, quando aciona o toggle no navbar, então toda a
  interface passa para o tema escuro sem recarregar a página e sem perder o que estava digitado.
- **CA-03:** Dada uma pessoa em tema escuro, quando aciona o toggle de novo, então a interface volta ao
  tema claro.
- **CA-04:** Dada uma pessoa sem sessão, quando aciona o toggle na tela de login, então a tela de login
  muda de tema e, depois de autenticar, o sistema continua no tema escolhido.
- **CA-05:** Dada uma pessoa que escolheu o tema escuro, quando fecha o navegador e volta ao sistema
  (com ou sem sessão), então o tema escuro é aplicado desde o primeiro quadro, sem piscar no claro.
- **CA-06:** Dado o tema escuro, quando a pessoa navega por qualquer tela (listagens, formulários,
  modais, menus, toasts e estados vazio/carregando/erro), então nenhum componente aparece com fundo ou
  texto do tema claro.
- **CA-07:** Dado cada tema, quando os textos e controles são verificados, então o contraste entre
  texto e fundo atende ao nível AA e o indicador de foco do teclado é visível.
- **CA-08:** Dado um leitor de tela, quando foca o toggle, então ouve um nome acessível no idioma
  ativo e o estado atual do tema; o toggle também funciona só pelo teclado.
- **CA-09 (falha):** Dado um navegador com um valor de tema guardado inválido ou corrompido, quando a
  pessoa abre o sistema, então a interface usa o tema claro e o toggle continua funcionando.
- **CA-10 (falha):** Dado um navegador que bloqueia o armazenamento local (por exemplo, modo privado
  restrito), quando a pessoa aciona o toggle, então o tema muda na sessão atual sem erro, e na próxima
  visita volta ao claro.
- **CA-11:** Dado que o tema foi trocado, quando uma operação protegida é executada, então as mesmas
  permissões, sessão e idioma continuam vigentes.

## Fora de escopo

- Guardar o tema na conta ou sincronizar entre dispositivos.
- Opção "seguir o sistema" ou troca automática por horário.
- Temas além de claro e escuro (alto contraste, cores personalizadas por unidade).
- Redesenho de telas: o escuro é a versão escura do visual atual, não um novo layout.
- Qualquer mudança no backend.

## Dúvidas em aberto

- Nenhuma sobre persistência, padrão ou local do toggle. A paleta escura e a forma de aplicar o tema
  sem piscar serão detalhadas no plano após aprovação.
