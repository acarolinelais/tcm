# 031. Painéis laterais e listas de seleção no padrão HeroUI (Setores, Usuários, Modelos e Projetos): Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez. Cada bloco termina com
> `cd frontend && npm test && npm run lint` verde, a `simplify` e, nas telas alteradas, as skills
> `better-accessibility` e `better-writing`.

## Fase 1: base dos campos e Setores

- [x] **T01. `SelectField` com opção "nenhum" e opção indisponível; `TextInputField` com `type`**
  - Arquivos: `frontend/src/shared/ui/form-field.tsx`, `frontend/src/shared/ui/form-field.test.tsx` (novo).
  - Cobre: CA-19, RN-04, RN-05, RN-06.
  - Verificação: `cd frontend && npx vitest run src/shared/ui/form-field.test.tsx` →
    - `emptyOption` aparece como primeiro item e marcado com `value=""`; escolhê-lo chama `onChange("")`;
    - Enter, setas e Enter escolhem uma opção; Esc com a lista aberta fecha só a lista;
    - opção com `isDisabled` aparece e não é escolhida;
    - `TextInputField` repassa `type`, `name` e `autoComplete` ao input.
- [x] **T02. Painel "Novo setor"**
  - Arquivos: `frontend/src/modules/setores/components/NovoSetorDrawer.tsx` (novo), `frontend/src/modules/setores/pages/SetoresPage.tsx`, `frontend/src/modules/setores/pages/SetoresPage.test.tsx`.
  - Cobre: CA-01, CA-02, CA-03, CA-18 (setores), RN-02, RN-10.
  - Verificação: `cd frontend && npx vitest run src/modules/setores` → abre à direita com "Novo setor", nome
    e Gerente em "Sem responsável"; criar com gerente chama a API com o gerente, fecha e notifica; nome vazio
    mostra a mensagem e não chama a API; Esc e Cancelar fecham sem salvar e o foco volta a "Novo setor".
- [x] **T03. Painel do setor e seus gerentes**
  - Arquivos: `frontend/src/modules/setores/components/EditarSetorDrawer.tsx` (novo), `frontend/src/modules/setores/pages/SetoresPage.tsx`, `frontend/src/modules/setores/pages/SetoresPage.test.tsx`.
  - Cobre: CA-04, CA-05, CA-18 (setores).
  - Verificação: `cd frontend && npx vitest run src/modules/setores && npm run lint` → escolher gerente e
    associar chama a API e o gerente entra na lista; com a API recusando, o erro aparece e o painel continua
    aberto com a escolha; remover gerente continua com a confirmação de hoje; `SetoresPage.tsx` não importa
    `shared/ui/dialog`, `select`, `button`, `input` nem `label`.

## Fase 2: Usuários

- [x] **T04. `UsuarioDrawer` (novo e editar usuário)**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuarioDrawer.tsx` (novo, absorve `UsuarioForm.tsx`, que sai), `frontend/src/modules/usuarios/components/UsuarioDrawer.test.tsx` (de `UsuarioForm.test.tsx`), `frontend/src/modules/usuarios/pages/UsuariosPage.tsx`.
  - Cobre: CA-06, CA-07, CA-08, CA-18 (usuários), RN-03, RN-05, RN-06, RN-10.
  - Verificação: `cd frontend && npx vitest run src/modules/usuarios` →
    - novo usuário abre com o perfil em "Desenvolvedor"; trocar o perfil e salvar envia esse perfil;
    - e-mail inválido mostra a mensagem do zod; User ID duplicado (409) mostra a mensagem no campo; o
      painel continua aberto e a API não é chamada no caso do zod;
    - no editar, o perfil fora do escopo aparece marcado e indisponível;
    - Esc/Cancelar fecham sem salvar; os casos que já existiam em `UsuarioForm.test.tsx` continuam passando.
- [x] **T05. Painel de responsável do usuário**
  - Arquivos: `frontend/src/modules/usuarios/components/UsuarioResponsavelDrawer.tsx`, `frontend/src/modules/usuarios/components/UsuarioResponsavelDrawer.test.tsx` (novo).
  - Cobre: CA-09, CA-10, CA-18 (usuários).
  - Verificação: `cd frontend && npx vitest run src/modules/usuarios && npm run lint` → escolher gerente e
    salvar grava o responsável; "Sem responsável" grava `null`; API recusando mostra o erro e mantém o painel;
    nenhum arquivo de `modules/usuarios` importa `shared/ui/dialog` nem `select`.

## Fase 3: Modelos de dispositivo

- [x] **T06. `ModeloDispositivoDrawer` (novo e editar modelo)**
  - Arquivos: `frontend/src/modules/modelos-dispositivo/components/ModeloDispositivoDrawer.tsx` (novo, absorve `ModeloDispositivoForm.tsx`, que sai), `frontend/src/modules/modelos-dispositivo/pages/ModelosDispositivoPage.tsx`, `frontend/src/modules/modelos-dispositivo/pages/ModelosDispositivoPage.test.tsx`.
  - Cobre: CA-11, CA-12, CA-18 (modelos), RN-10.
  - Verificação: `cd frontend && npx vitest run src/modules/modelos-dispositivo && npm run lint` → criar e
    editar salvam, fecham o painel e a tabela mostra o valor novo; nome duplicado (409) e acima do limite
    mostram a mensagem no campo e não fecham; Esc/Cancelar fecham sem salvar; o módulo não importa
    `shared/ui/dialog`, `button`, `input` nem `label`.

## Fase 4: Projetos

- [x] **T07. Seleção múltipla de modelos no HeroUI**
  - Arquivos: `frontend/src/shared/ui/multi-select-combobox.tsx`, `frontend/src/shared/ui/multi-select-combobox.test.tsx`.
  - Cobre: CA-15, CA-16, RN-07.
  - Verificação: `cd frontend && npx vitest run src/shared/ui/multi-select-combobox.test.tsx` → buscar por
    parte do nome filtra; escolher dois mostra duas etiquetas; remover uma pela etiqueta deixa a outra; busca
    sem resultado mostra `emptyLabel`; o arquivo não importa `@base-ui/react`.
- [x] **T08. `EditarProjetoDrawer`**
  - Arquivos: `frontend/src/modules/projetos/components/EditarProjetoDrawer.tsx` (novo), `frontend/src/modules/projetos/pages/ProjetosPage.tsx`, `frontend/src/modules/projetos/pages/ProjetosPage.test.tsx`.
  - Cobre: CA-13, CA-14, CA-18 (projetos).
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/pages/ProjetosPage.test.tsx` → trocar
    time e modelos e salvar envia os dois e fecha; a API recusando a troca de time mostra o erro e mantém o
    painel com os valores; enquanto salva o painel não envia de novo; Esc/Cancelar fecham sem salvar.
- [x] **T09. Cadastro de projeto no HeroUI (manual e por planilha)**
  - Arquivos: `frontend/src/modules/projetos/pages/ProjetosPage.tsx`, `frontend/src/modules/projetos/components/importacao/UploadPlanilha.tsx`, `frontend/src/modules/projetos/pages/ProjetosPage.test.tsx`, `frontend/src/modules/projetos/components/importacao/UploadPlanilha.test.tsx`, `frontend/src/core/i18n/resources.ts`.
  - Cobre: CA-15 (no cadastro), CA-17, RN-08, RN-11.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos src/core/i18n && npm run lint` → os dois
    só o modo escolhido fica no DOM, com um campo Time só; criar manualmente e importar
    seguem enviando os mesmos dados; `ProjetosPage.tsx` e `UploadPlanilha.tsx` não importam `shared/ui/button`,
    `input`, `label`, `select` nem `dialog`.
- [x] **T10. Prévia e erros da planilha no `DataTable`**
  - Arquivos: `frontend/src/modules/projetos/components/importacao/PreviaPlanilha.tsx`, `ErrosPlanilha.tsx` e os testes.
  - Cobre: CA-20, CA-21, RN-11.
  - Verificação: `cd frontend && npx vitest run src/modules/projetos/components/importacao && npm run lint` →
    a prévia mostra 20 por página e troca de página; os erros aparecem por linha e paginados; com erros, criar
    não envia; nenhum dos dois importa `shared/ui/table`.
- [ ] **T11. e2e de Projetos**
  - Arquivos: `frontend/e2e/projetos.spec.ts`, `frontend/e2e/projetos-importacao.spec.ts`, `frontend/e2e/projetos-dev.spec.ts`.
  - Cobre: CA-13, CA-17, CA-20, CA-21 (fluxo completo).
  - Verificação: `cd frontend && npx playwright test e2e/projetos.spec.ts e2e/projetos-importacao.spec.ts e2e/projetos-dev.spec.ts` →
    verde, inclusive os 4 de `getByLabel("Time")`. Falha sem relação com esta spec: parar e trazer a decisão.
  - Situação (2026-10-28): `projetos.spec.ts` e `projetos-importacao.spec.ts` 16/16 verdes, inclusive os 4 de
    `getByLabel("Time")`. `projetos-dev.spec.ts` (6) falha no login da **API real** (`SDF_E2E_API_URL`,
    `SDF_E2E_ADMIN_PASSWORD`), sem passar por componentes desta spec: decisão pendente com a usuária.

## Fase 5: limpeza e verificação final

- [x] **T12. Apagar o que perdeu consumidor e as dependências**
  - Arquivos: `frontend/src/shared/ui/select.tsx`, `table.tsx`, `week-picker.tsx` (apagados), `frontend/src/shared/ui/dialog.tsx` (sem `Drawer*`), testes que importam `DEFAULT_TABLE_PAGE_SIZE` de `@/shared/ui/table`, `frontend/package.json`, `frontend/package-lock.json`, `docs/specs/README.md`.
  - Cobre: RN-09 (nenhuma página em escopo mistura as bases).
  - Verificação: `cd frontend && npm uninstall @radix-ui/react-select @base-ui/react && npx tsc --noEmit && npm test && npm run lint` →
    verde; `grep -r "@radix-ui/react-select\|@base-ui" src` vazio; `dialog.tsx` sem `Drawer*`.
- [ ] **T13. e2e de administração e modelos, e a suíte inteira**
  - Arquivos: `frontend/e2e/administracao-unidade.spec.ts`, `frontend/e2e/modelos-dispositivo.spec.ts`.
  - Cobre: CA-02, CA-06, CA-11 (fluxo completo), CA-18.
  - Verificação: `cd frontend && npm test && npm run lint && npm run e2e` → tudo verde.
  - Situação (2026-10-28): `npm test` 445/445, `npm run lint` limpo, `npx tsc --noEmit` limpo. `npm run e2e`:
    28 passaram e 9 falharam, todos no login da **API real** (`127.0.0.1:8000/api/auth/login` → 401):
    `projetos-dev.spec.ts` (6), `times.spec.ts` (2) e `form-factor-rodadas.spec.ts` (1). Eles usam
    `e2e/api-fixtures.ts` (`SDF_E2E_API_URL`, `SDF_E2E_ADMIN_PASSWORD`) e não passam por componentes desta spec.
    `administracao-unidade.spec.ts` e `modelos-dispositivo.spec.ts` ficaram verdes (o segundo procurava a aba
    "Criar manualmente", que se chama "Manual" desde antes desta spec). Decisão pendente com a usuária.

## Backlog
- ✅ **Resolvido na spec 050:** modais centrais ainda em shadcn: o editor de permissões de `PerfisPage.tsx` (`DialogContent`) e
  `shared/ui/confirm-dialog.tsx` (usado por `UsuarioToggleAtivo`, na página de Usuários, que segue misturando
  as bases por causa dele). Quando migrarem, `shared/ui/dialog.tsx`, `confirm-dialog.tsx` e
  `@radix-ui/react-dialog` podem sair.
- ✅ **Resolvido na spec 050:** telas de login e troca de senha ainda usam `Button`, `Input` e `Label` shadcn (e `@radix-ui/react-label` e
  `react-slot` por isso).
- Setores: o campo de gerente usa "Selecionar gerente" como rótulo e como opção vazia, e o nome acessível fica
  repetido ("Selecionar gerente Selecionar gerente"). Um rótulo "Gerente" (chave nova em en/pt/ko), mantendo
  "Selecionar gerente" só como opção vazia, resolve; a RN-05 desta spec mantém os textos (achado da revisão da
  fase 1).
- Botões ao lado de uma lista (Associar em Setores, Adicionar nos links de PR) se alinham por `mt-[30px]`; um
  slot `endContent` no `SelectField`/`TextInputField` alinharia pela estrutura, inclusive com zoom (achado da
  revisão da fase 1).
- ✅ **Resolvido na spec 050:** confirmação de inativar setor (`SetoresPage.tsx`): a descrição usa `sectorUpdateError` (mensagem de falha) e o
  título e o botão são montados por concatenação. Chaves próprias com interpolação corrigem (modal central, fora
  do escopo; achado da revisão da fase 1).
- Foco no primeiro campo inválido ao enviar um painel (skill `better-accessibility`): hoje o erro é anunciado
  (`role="alert"`), mas o foco fica no botão. Vale para todos os painéis com `form-field` (achado da revisão da
  fase 1).
- Usuários: o painel só abre com `podeGerenciar` (`UsuariosPage.tsx`), então o caminho somente leitura do
  `UsuarioDrawer` (`isReadOnly`, trocar só o perfil) nunca é alcançado. Decidir entre liberar a abertura para quem
  só atribui perfil (gerente → KP) ou remover esse caminho. Já era assim antes desta spec (achado da revisão da
  fase 2).
- `UsuarioDrawer`: `perfilSelecionado` duplica o `perfil_id` do formulário; um `Controller` + `watch` tiraria o
  estado paralelo, mas muda o corpo enviado no editar (achado da revisão da fase 2, não aplicado).
- Multi-select de modelos e `DataTableMultiFilter`: a busca e a lista são campos separados (Tab do campo de busca
  para a lista). O `Autocomplete.Filter` do HeroUI daria foco virtual (setas e Enter direto da busca), como o
  combobox antigo do `@base-ui`. Vale para os dois componentes (achado da revisão da fase 3).
- Padrão de "reiniciar o painel a cada abertura" está escrito à mão em cada painel (`anterior`/`exibido` em
  Setor, Responsável, Modelo e Projeto; `useEffect` com `isOpen` em Usuário; `abertoAntes` em Times). Um hook em
  `shared` ("valor exibido durante a saída + callback ao abrir") tiraria a repetição (achado da revisão da fase 3).
- Cadastro de projeto: as abas Importar/Manual são feitas à mão (`role="tab"`) sem setas nem roving tabindex; as
  duas entram no Tab. O `Tabs` do HeroUI resolveria (já era assim antes desta spec; achado da revisão da fase 4).
