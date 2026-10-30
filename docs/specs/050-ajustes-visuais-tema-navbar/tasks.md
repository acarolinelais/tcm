# 050. Ajustes visuais: tema escuro, Navbar, calendário e Sidebar: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez. Só frontend: os comandos rodam em
> `frontend/`.

## Fase 1: painel do caso só na página do projeto

- [x] **T01. TC ID como texto em General Results**
  - Arquivos: `src/modules/projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` e teste,
    `src/modules/projetos/pages/ResultadosGeraisPage.tsx` e teste, `e2e/resultados-gerais.spec.ts`.
  - Cobre: CA-01, CA-02 (General Results), RN-01.
  - Verificação: `npx vitest run src/modules/projetos/components/resultados-gerais src/modules/projetos/pages/ResultadosGeraisPage.test.tsx` →
    o TC ID não é botão nem link e clicar nele não abre painel; a ação Resumo de execuções continua abrindo o
    resumo; a página não monta o `DetalhesCasoTesteDrawer`.
- [x] **T02. O painel continua na página do projeto e a spec 030 registra a exceção**
  - Arquivos: `src/modules/projetos/pages/ProjetoDetalhePage.test.tsx`, `docs/specs/030-links-pr-test-case/spec.md`.
  - Cobre: CA-02 (página do projeto).
  - Verificação: `npx vitest run src/modules/projetos/pages/ProjetoDetalhePage.test.tsx && npx playwright test e2e/resultados-gerais.spec.ts` →
    o TC ID abre o painel nas abas Test Cases e Form Factor; o e2e de General Results não espera mais o painel.

## Fase 2: tokens do tema escuro, borda e fonte

- [x] **T03. Tokens do escuro e os tokens novos `--edge` e `--table-body`**
  - Arquivos: `src/core/global.css`, `src/core/theme/contraste-tema-escuro.test.ts` (novo),
    `src/core/theme/contraste-avatar.test.ts`.
  - Cobre: CA-03 (valores), CA-04, CA-05, RN-02 a RN-05.
  - Verificação: `npx vitest run src/core/theme` → os tokens da tabela do plan têm os valores novos; todos os pares
    do escuro ficam em 4,5:1 ou mais (e o teste falha com um par abaixo); `--edge` é `#eeeeee` no claro e os demais
    tokens do claro não mudam; o teste do avatar usa os fundos novos e continua verde.
- [x] **T04. Corpo da tabela, bordas dos cartões e fonte Inter**
  - Arquivos: `src/shared/ui/data-table.tsx` e teste, `src/shared/ui/page-card.tsx`, `src/core/global.css`
    (`--font-sans` no `@theme` e no `body`).
  - Cobre: CA-03 (tabela e cartões), CA-06 (base), RN-06.
  - Verificação: `npx vitest run src/shared/ui/data-table.test.tsx && npm run lint` → o corpo usa `bg-table-body` e
    o cartão usa `border-edge`; `grep -rn "border-separator" src/shared/ui/page-card.tsx` vazio.
- [x] **T05. Revisão do escuro nas telas que o Figma não mostra**
  - Arquivos: só os tokens de `src/core/global.css` que precisarem de ajuste (nenhuma tela recebe hex).
  - Cobre: RN-05.
  - Verificação: `npm run dev`; percorrer Projetos, Test Cases, Form Factor, General Results, Kanban, Overview,
    Usuários, Times, Setores, Perfis, Modelos, drawers e menus no escuro e no claro → nenhum texto ilegível nem
    fundo que some; o que mudar entra na tabela de tokens do plan; `npx vitest run src/core/theme` continua verde.

## Fase 3: Navbar e botão de tema

- [x] **T06. Grade da Navbar sem sobreposição, busca estreita e divisórias**
  - Arquivos: `src/core/layout/Navbar.tsx` e teste, `e2e/navbar.spec.ts` (novo).
  - Cobre: CA-09, RN-09, RN-10.
  - Verificação: `npx vitest run src/core/layout/Navbar.test.tsx && npx playwright test e2e/navbar.spec.ts` →
    em 1280, 1440 e 1920 px, Sidebar aberta e recolhida, en/pt/ko e os dois temas, as caixas da busca, do tema, do
    idioma e do usuário não se cruzam (`boundingBox`, com folga); a busca tem no máximo 362 × 29 px; há duas
    divisórias.
- [x] **T07. Visual novo do botão de tema, no login e na Navbar**
  - Arquivos: `src/core/theme/ThemeToggle.tsx` e teste, `src/core/auth/LoginPage.test.tsx`.
  - Cobre: CA-07 (visual e comportamento), RN-07, RN-14 (botão de tema).
  - Verificação: `npx vitest run src/core/theme src/core/auth/LoginPage.test.tsx` → círculo de 29 px com
    `border-edge` e o ícone do tema em uso; `aria-pressed`, a escolha guardada e o claro como padrão continuam;
    `data-[pressed]:scale-[0.97]` com `motion-reduce`.
- [x] **T08. O botão novo preserva a transição de tema da spec 049**
  - Arquivos: `src/core/theme/ThemeToggle.tsx` e teste (só se a T07 tiver quebrado algo), `e2e/tema.spec.ts`
    (da spec 049, sem mudança).
  - Cobre: CA-07 (transição), RN-08.
  - Verificação: `npx vitest run src/core/theme && npx playwright test e2e/tema.spec.ts` → os testes da spec 049
    continuam verdes: a tela muda junta e aos poucos, o ícone anima só depois de uma troca, e com movimento
    reduzido o ícone não gira.
- [x] **T09. Fonte Inter e densidade da Navbar conferidas no navegador**
  - Arquivos: `e2e/navbar.spec.ts`; ajustes de espaçamento em `src/core/layout/Navbar.tsx`, se a revisão pedir.
  - Cobre: CA-06, CA-03 (Navbar no escuro).
  - Verificação: `npx playwright test e2e/navbar.spec.ts` → a `font-family` computada da busca, do título e de um
    botão contém Inter em en, pt e ko; o fundo e a borda da busca no escuro são `#1b1b1b` e `#2f2f2f`. Revisão com a
    skill `ui-density` registrada no relatório do bloco.

## Fase 4: fim do shadcn

- [x] **T10. Confirmar o inventário e apagar o código morto**
  - Arquivos: `src/shared/ui/table-column-filter.tsx`, `src/shared/ui/table-column-filter.test.tsx`,
    `src/shared/ui/calendar.tsx` (apagados).
  - Cobre: RN-11 (preparação).
  - Verificação: `grep -rE "@radix-ui|class-variance-authority|@/shared/ui/(dialog|confirm-dialog|button|input|label|badge|skeleton|calendar)" src` →
    só os consumidores da tabela do plan (o que aparecer além entra nesta fase); `npx tsc --noEmit` verde.
- [x] **T11. Login e troca de senha no HeroUI**
  - Arquivos: `src/core/auth/LoginPage.tsx` e teste, `src/core/auth/AlterarSenhaPage.tsx` e teste.
  - Cobre: CA-10, CA-11.
  - Verificação: `npx vitest run src/core/auth` → login: credencial errada mostra a mesma mensagem, o botão mostra o
    carregamento, o sucesso redireciona e o botão de tema continua; troca de senha: as validações zod e as mensagens
    de antes, nada enviado com erro.
- [x] **T12. Editor de permissões no `Modal` do HeroUI**
  - Arquivos: `src/modules/perfis/pages/PerfisPage.tsx` e teste.
  - Cobre: CA-12 (permissões).
  - Verificação: `npx vitest run src/modules/perfis` → foco preso, Esc fecha sem salvar, o foco volta ao gatilho,
    salvar grava e erro mantém a janela aberta com a mensagem.
- [x] **T13. Ativar e inativar usuário com o `alert-confirm`, e confirmação de setor com textos próprios**
  - Arquivos: `src/modules/usuarios/components/UsuarioToggleAtivo.tsx` e teste,
    `src/modules/setores/pages/SetoresPage.tsx` e teste, `src/core/i18n/resources.ts` e teste.
  - Cobre: CA-12 (usuário e setor), RN-12.
  - Verificação: `npx vitest run src/modules/usuarios src/modules/setores src/core/i18n` → confirmar aplica,
    cancelar e Esc não mudam nada, o foco volta; a confirmação de setor mostra o nome no título e na descrição, com
    as chaves novas em en, pt e ko e sem `sectorUpdateError`.
- [x] **T14. StatusBadge e carregamentos no HeroUI**
  - Arquivos: `src/modules/projetos/components/status/StatusBadge.tsx` e teste, `src/shared/ui/page-skeleton.tsx`
    (novo) e teste, `src/core/layout/AppLayout.tsx`, `src/modules/overview/pages/OverviewPage.tsx`,
    `src/modules/perfis/pages/PerfisPage.tsx`.
  - Cobre: CA-13.
  - Verificação: `npx vitest run src/modules/projetos/components/status src/shared/ui/page-skeleton.test.tsx src/core/layout src/modules/overview` →
    cada status com as suas classes de cor; o carregamento tem `role="status"` e o texto `sr-only`.
- [x] **T15. Apagar o shadcn e as dependências**
  - Arquivos: `src/shared/ui/{dialog,confirm-dialog,button,input,label,badge,skeleton}.tsx` (apagados),
    `package.json`, `package-lock.json`, `docs/specs/031-heroui-drawers-dropdowns/tasks.md`.
  - Cobre: RN-11.
  - Verificação: `npm uninstall @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-slot class-variance-authority && npx tsc --noEmit && npm test && npm run lint` →
    verde; o grep da T10 vazio; o Backlog da 031 com os itens resolvidos marcados.

## Fase 5: botões de filtro e calendário

- [x] **T16. Prova do calendário antes da troca**
  - Arquivos: `src/shared/ui/calendario.test.tsx` (novo, sobre o `react-day-picker` configurado como hoje).
  - Cobre: CA-15, CA-16, CA-17 (prova).
  - Verificação: `npx vitest run src/shared/ui/calendario.test.tsx` → a coluna de semanas aparece; clicar no número
    escolhe a semana ISO; no modo dia ou semana, clicar no dia escolhe o dia; 29/12/2025 → `2026-W01`; as setas
    movem o foco entre os dias. Nada nos consumidores muda nesta task.
- [x] **T17. Componente `calendario.tsx` com os tokens e os três modos**
  - Arquivos: `src/shared/ui/calendario.tsx` (novo) e teste.
  - Cobre: CA-15, CA-16, CA-17, RN-16, RN-17.
  - Verificação: `npx vitest run src/shared/ui/calendario.test.tsx` → os testes da T16 passam sobre o componente;
    modos `dia`, `semana` e `dia-ou-semana`; meses e dias em en, pt e ko; Esc fecha; só tokens (o
    `cores-por-token.test.ts` verde).
- [x] **T18. `WeekPickerHero` em pílula sobre o calendário novo**
  - Arquivos: `src/shared/ui/week-picker-hero.tsx` e teste, `src/core/i18n/resources.ts` ("Day or Week" em en).
  - Cobre: CA-14, CA-15, CA-08 (calendário), RN-13 a RN-15.
  - Verificação: `npx vitest run src/shared/ui/week-picker-hero.test.tsx src/core/i18n` → os testes atuais
    continuam verdes; pílula `h-9`, `border-edge`, `data-[pressed]:scale-[0.97]`; o popover parte do gatilho e,
    com `prefers-reduced-motion`, não se desloca; "This week" no rodapé.
- [x] **T19. Filtro de data das tabelas no mesmo calendário**
  - Arquivos: `src/shared/ui/data-table-filter.tsx` e teste.
  - Cobre: CA-18, RN-18.
  - Verificação: `npx vitest run src/shared/ui/data-table-filter.test.tsx && npx playwright test e2e/projetos.spec.ts` →
    escolher um dia aplica o filtro e Limpar remove, como antes; o `DataTableFilter` não importa mais o `Calendar`
    do HeroUI.
- [x] **T20. Botão de busca redondo em General Results**
  - Arquivos: `src/modules/projetos/pages/ResultadosGeraisPage.tsx` e teste.
  - Cobre: CA-14 (busca).
  - Verificação: `npx vitest run src/modules/projetos/pages/ResultadosGeraisPage.test.tsx && npm run lint` → a lupa é
    um círculo `size-9` com `border-edge`, nome acessível e o toque da RN-14; abrir a busca funciona como antes.

## Fase 6: Sidebar arredondada

- [x] **T21. Classes comuns dos itens e destaque em pílula**
  - Arquivos: `src/core/layout/Sidebar.tsx` e teste.
  - Cobre: CA-19, RN-14 (itens), RN-19.
  - Verificação: `npx vitest run src/core/layout/Sidebar.test.tsx` → todos os itens (topo, Administração e
    subitens, Times, Usuários) usam a mesma função de classes; ativo e hover com `rounded-full`, aberta e
    recolhida; recolhida, um círculo de 30 px centralizado no ícone; o anel de foco no mesmo raio.
- [ ] **T22. Verificação final da spec**
  - Arquivos: nenhum.
  - Cobre: todos os CAs.
  - Verificação: `npm test && npm run lint && npm run e2e` → tudo verde; o grep da T10 vazio.
  - Situação (2026-10-30): `npm test` 608 verdes, `npm run lint` limpo, grep vazio; `npm run e2e` 52 verdes (todos os
    de API simulada) e 23 vermelhos, todos no login da API real (401: `SDF_E2E_ADMIN_PASSWORD` não bate com o banco
    local). Entre eles, o `tema.spec.ts › contraste AA no tema dark`, que confere o escuro novo numa página real.

## Backlog

- **Teste instável do mock (anterior a esta spec).** `database.test.ts › preserva rodadas Form Factor no histórico`
  falhou 1 vez em 7 execuções, sem mudança no arquivo nem no `database.ts`. Investigar a dependência de data ou de
  ordem.
- **e2e do tema com a API real.** 4 testes de `e2e/tema.spec.ts` (spec 049) entram com `SDF_E2E_ADMIN_PASSWORD`, e
  o padrão `mude-esta-senha` não bate com o banco local (401). Mesma pendência dos e2e com API real da 031.
- **`@internationalized/date` sem uso direto.** Depois da T19, nenhum arquivo de `src` importa o pacote, mas o
  `@heroui/react` 3.2.6 o pede como dependência par: não remover.
- **Classes repetidas da pílula.** O gatilho do `WeekPickerHero` e a lupa de Resultados Gerais repetem cerca de 10
  classes. Com um terceiro botão em pílula, vale um componente ou constante comum.
- **Margem dos itens da Sidebar ao recolher.** O `mx-auto` do círculo recolhido não anima (pula de `ml-3` para
  centralizado). Os subitens ficam num contêiner de bloco, onde `self-center` não vale; um `justify-items-center`
  no contêiner resolveria.
- **Code-review: toque do botão de tema durante a troca.** Nos 450 ms da `.trocando-tema` (spec 049), a transição
  do `scale` é trocada pelas de cor, então um segundo clique rápido no botão de tema não anima o toque. Aceito: é o
  intervalo da troca.
- **Code-review: regex de dia repetida.** `DIA` (`AAAA-MM-DD`) existe em `calendario.tsx` e em
  `week-picker-hero.tsx`. Um helper em `shared/lib/utils`, ao lado do `lerDiaIso`, evitaria divergência.
- **Code-review: Perfis sem teste da confirmação durante a gravação.** O `Modal` não fecha com Esc nem pelo fundo
  enquanto salva; falta um teste com a mutação pendente.

