# 031. Painéis laterais e listas de seleção no padrão HeroUI (Setores, Usuários, Modelos e Projetos): Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009, 0010, 0022, 0030, 0034, 0037
- **ADRs novos propostos:** nenhum (a troca já é decidida pelo ADR 0037; sair do `@base-ui/react` só cumpre o
  "uma base de UI" dele)

## Abordagem

Só frontend; nenhuma API, modelo ou permissão muda. Cada tela migra para os componentes HeroUI que já
existem em `shared/ui` e para os primitivos de `@heroui/react`, sem componente shadcn novo.

- **Painéis:** todo painel da RN-01 vira `SideDrawer` (variante `panel`) com `DrawerFormActions` no rodapé
  e `onSubmit` no próprio `SideDrawer`, como `NovoTimeDrawer`/`EditarTimeDrawer`. O estado do formulário fica
  num componente de painel por ação (padrão de `times/`), e não na página, para cada tecla não redesenhar a
  listagem. Os formulários com react-hook-form + zod (`UsuarioForm`, `ModeloDispositivoForm`) continuam com
  eles: os campos controlados entram por `Controller`, e o `onSubmit` do `SideDrawer` chama
  `handleSubmit(...)()`. O foco volta ao gatilho pelo próprio React Aria (CA-18).
- **Campos:** `TextInputField`, `TextAreaField` e `SelectField` de `shared/ui/form-field.tsx` (HeroUI). O
  `TextInputField` ganha `type` (e-mail do usuário) e `name`/`autoComplete` opcionais; nada mais muda nele.
- **Opção "nenhum" (substitui o `SELECT_EMPTY_VALUE`):** o `SelectField` ganha `emptyOption?: string`. Com
  ele, a lista mostra um primeiro item com esse texto e id interno `OPCAO_NENHUMA = "__nenhum__"`; escolher
  esse item chama `onChange("")`, e `value === ""` aparece como esse item marcado. Assim "Sem responsável" e
  "Desenvolvedor" continuam opções reais da lista (RN-05). Onde hoje a opção vazia só convida a escolher
  ("Selecionar gerente", "Selecionar time"), usa-se o mesmo `emptyOption`, para manter a possibilidade de
  voltar ao vazio. O id interno nunca sai do componente.
- **Opção indisponível (RN-06):** `SelectOption` ganha `isDisabled?: boolean`, repassado ao
  `ListBox.Item`.
- **Seleção múltipla de modelos (RN-07):** `shared/ui/multi-select-combobox.tsx` é reescrito sobre o
  `Autocomplete` do HeroUI com `selectionMode="multiple"` (filtro com `SearchField` + `ListBox` no popover,
  como já faz o `DataTableMultiFilter`) e os escolhidos como `TagGroup` com remoção. A API do componente
  (`label`, `placeholder`, `options`, `value`, `onValueChange`, `emptyLabel`, `removeLabel`) não muda, então
  os consumidores não mudam. **Decisão:** trocar, e não manter o `@base-ui/react`: era a terceira base de UI,
  e o HeroUI 3.2.6 instalado já tem seleção múltipla com busca. O `week-picker.tsx` (também `@base-ui`) não
  tem consumidor (o sistema usa o `week-picker-hero`), então sai junto e a dependência pode ser removida.
- **Prévia e erros da planilha:** migram nesta spec. **Justificativa:** ficam dentro do cadastro de projeto
  (RN-11), que passa a ser só HeroUI, e são pequenos (uma tabela paginada no cliente e uma paginação). A
  `PreviaPlanilha` passa para `DataTable` + `DataTablePagination` (regras da skill `table-rules`: 20 por
  página, ADR 0034), e a `ErrosPlanilha` troca só a `TablePagination` pela `DataTablePagination`. Com isso
  `shared/ui/table.tsx` perde os consumidores e sai, levando o último uso do `Select` shadcn.
- **Nomes únicos (RN-08):** no cadastro de projeto os dois campos Time ganham rótulos acessíveis distintos
  ("Time" no manual e "Time da planilha"/"Time do projeto importado" na importação, via i18n), e só o modo
  visível fica no DOM, em vez de esconder o outro.
- **Execução (2026-10-28):** o multi-select ficou no caminho alternativo deste plan (`Popover` + `SearchField` +
  `ListBox` múltipla + `TagGroup`), que o `DataTableMultiFilter` já usa e testa; o `Autocomplete` múltiplo não
  tinha uso no projeto. Os painéis migrados mantêm "Salvando…" durante o envio (`pendingLabel` no
  `DrawerFormActions`; os de Teams seguem com "Aguarde…"). No cadastro de projeto só o modo escolhido fica no DOM
  (em vez de esconder o outro com `inert`), então há um campo Time por vez e nenhum rótulo novo foi preciso; sai a
  transição cruzada entre os dois modos, e a página atual da prévia e dos erros volta para a 1 ao trocar de modo
  (a leitura, os campos e o arquivo recusado continuam, porque o estado fica na página e no `useLeituraPlanilha`). O foco no primeiro campo inválido vem do react-hook-form, pelo `ref`
  repassado ao `TextInputField`.
- **Limpeza:** ao fim, saem `select.tsx`, `table.tsx`, `week-picker.tsx` e os exports `Drawer*` de
  `dialog.tsx`; saem do `package.json` `@radix-ui/react-select` e `@base-ui/react`. Ficam `dialog.tsx`
  (`DialogContent` de Perfis), `confirm-dialog.tsx`, `button.tsx`, `input.tsx` e `label.tsx`, que ainda têm
  consumidores fora do escopo (login, troca de senha, Perfis e `UsuarioToggleAtivo`), e com eles
  `@radix-ui/react-dialog`, `react-label` e `react-slot`. O README de specs deixa de citar
  `shared/ui/table.tsx` como padrão de tabela (o ADR 0037 já trocou por `data-table`).

## Modelo de dados

Nenhuma mudança.

## Contrato da API

Nenhuma mudança. Os testes usam os mesmos endpoints e o modo mock (ADR 0030) segue igual.

## Frontend: arquivos

Por módulo, na ordem das fases (receita `react-crud`, HeroUI pelo ADR 0037):

- `shared/ui/form-field.tsx` + `form-field.test.tsx` (novo): `emptyOption`, `isDisabled` por opção, `type`,
  `name` e `autoComplete` no `TextInputField`.
- **Setores:** `SetoresPage.tsx` → `NovoSetorDrawer.tsx` e `EditarSetorDrawer.tsx` (novos, em
  `modules/setores/components/`); `SetoresPage.test.tsx`.
- **Usuários:** `UsuarioForm.tsx` → `UsuarioDrawer.tsx` (o painel com o formulário; o nome antigo sai),
  `UsuarioResponsavelDrawer.tsx`, `UsuariosPage.tsx`; `UsuarioForm.test.tsx` → `UsuarioDrawer.test.tsx`,
  `UsuarioResponsavelDrawer.test.tsx` (novo).
- **Modelos de dispositivo:** `ModeloDispositivoForm.tsx` → `ModeloDispositivoDrawer.tsx`,
  `ModelosDispositivoPage.tsx`; `ModelosDispositivoPage.test.tsx`.
- **Projetos:** `shared/ui/multi-select-combobox.tsx` + teste; `ProjetosPage.tsx` (cadastro e
  `EditarProjetoDrawer.tsx` novo em `modules/projetos/components/`); `UploadPlanilha.tsx`,
  `PreviaPlanilha.tsx`, `ErrosPlanilha.tsx` e testes; `ProjetosPage.test.tsx`.
- **Limpeza:** `shared/ui/select.tsx`, `table.tsx`, `week-picker.tsx` (apagados); `dialog.tsx` (sem
  `Drawer*`); os testes que importam `DEFAULT_TABLE_PAGE_SIZE` de `@/shared/ui/table` passam a importar de
  `@/shared/lib/paginacao`; `package.json` e `package-lock.json`; `docs/specs/README.md`.
- **e2e:** `administracao-unidade.spec.ts`, `modelos-dispositivo.spec.ts`, `projetos.spec.ts`,
  `projetos-importacao.spec.ts`, `projetos-dev.spec.ts` (seletores do React Aria: `combobox`/`option`,
  `dialog` com nome, `textbox` pelo rótulo).
- `core/i18n/resources.ts`: só os rótulos novos do RN-08, em en, pt e ko.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01, CA-02 | Unidade + E2E | `SetoresPage.test.tsx`: abre "Novo setor" com "Sem responsável", cria com gerente, fecha e notifica; `administracao-unidade.spec.ts` |
| CA-03 (falha) | Unidade | nome vazio: mensagem no campo, sem chamada à API, painel aberto |
| CA-04, CA-05 (falha) | Unidade | gerentes do setor: escolhe na lista e associa; API recusa → erro e painel aberto |
| CA-06 | Unidade + E2E | `UsuarioDrawer.test.tsx`: novo usuário em "Desenvolvedor", troca de perfil e salva; `administracao-unidade.spec.ts` |
| CA-07 (falha) | Unidade | e-mail inválido e User ID duplicado (409): mensagem no campo, painel aberto |
| CA-08 | Unidade | perfil fora do escopo aparece marcado e indisponível |
| CA-09, CA-10 (falha) | Unidade | `UsuarioResponsavelDrawer.test.tsx`: escolhe gerente / "Sem responsável" e salva; API recusa → erro e painel aberto |
| CA-11, CA-12 (falha) | Unidade + E2E | `ModelosDispositivoPage.test.tsx`: cria e edita; nome duplicado (409) e acima do limite; `modelos-dispositivo.spec.ts` |
| CA-13, CA-14 (falha) | Unidade + E2E | `ProjetosPage.test.tsx`: edita time e modelos; recusa da troca de time mantém o painel; `projetos.spec.ts` |
| CA-15, CA-16 (falha) | Unidade | `multi-select-combobox.test.tsx`: busca, escolhe dois, remove um pela etiqueta; busca vazia mostra a mensagem |
| CA-17 | Unidade + E2E | `ProjetosPage.test.tsx`: os dois Time com nomes distintos; `projetos-importacao.spec.ts` volta a achar o campo por `getByLabel` |
| CA-18 | Unidade | `side-drawer.test.tsx` + um teste por painel: Esc, fora, X e Cancelar fecham sem salvar e o foco volta ao gatilho |
| CA-19 | Unidade | `form-field.test.tsx`: Enter/setas/Enter escolhem; Esc fecha só a lista; `emptyOption` vira `""`; opção indisponível não é escolhida |
| CA-20 | Unidade + E2E | `PreviaPlanilha.test.tsx`: 20 por página e troca de página; `projetos-importacao.spec.ts` |
| CA-21 (falha) | Unidade + E2E | `ErrosPlanilha.test.tsx`: erros por linha paginados; criar não envia; `projetos-importacao.spec.ts` |

## Riscos e decisões pendentes

- **Seletores dos testes.** O markup do React Aria muda nomes e papéis (`combobox` vira botão com
  `aria-haspopup="listbox"`, as opções ficam num popover). Os testes passam a usar papéis e rótulos, nunca
  classes ou ids.
- **e2e já vermelhos na `dev`.** Os 4 de `getByLabel("Time")` devem ficar verdes com a RN-08. Os outros que
  as specs 027 e 028 listaram (`projetos-dev.spec.ts` e `projetos.spec.ts`) serão reavaliados no bloco de
  Projetos. Se a causa não tiver relação com esta spec, paro e trago a decisão antes de dar o `npm run e2e`
  como verde.
- **Mistura que sobra em Usuários.** A confirmação de ativar/inativar (`UsuarioToggleAtivo`) usa o
  `confirm-dialog` shadcn, um modal central fora do escopo. A página de Usuários continua com essa mistura
  até a spec dos modais (Backlog).
- **Autocomplete com seleção múltipla.** É o componente mais novo do HeroUI que entra no projeto. Se algum
  comportamento da RN-07 não for possível com ele (ex.: etiquetas fora do gatilho), a alternativa é um
  `Popover` + `SearchField` + `ListBox` múltipla, o mesmo caminho do `DataTableMultiFilter`. A troca fica
  restrita ao `multi-select-combobox.tsx`.
- **Largura e densidade.** Os painéis passam à largura do `SideDrawer` (`28rem`). Se algum formulário ficar
  apertado (ex.: editar projeto com modelos), rodo a skill `ui-density` no bloco e registro o ajuste.
