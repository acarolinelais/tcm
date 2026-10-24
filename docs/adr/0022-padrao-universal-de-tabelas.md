# 0022. Padrão visual universal para tabelas

- **Status:** Aceito; regra de tamanho padrão substituída por [0034](0034-paginacao-padrao-vinte-itens.md)
- **Data:** 2026-10-23
- **Relacionado:** spec 004, spec 006

## Contexto

O sistema possui listagens de usuários, perfis, setores e times. Cada tela vinha montando por conta
própria o espaçamento entre cabeçalho, conteúdo vazio e paginação. Isso produziu diferenças visíveis:
alguns estados vazios encostavam no cabeçalho e não tinham o painel arredondado usado em Usuários.
Novas listagens poderiam repetir a inconsistência.

## Decisão

Toda tabela do sistema, existente ou futura, deve seguir a mesma composição e usar os componentes
compartilhados de `frontend/src/shared/ui/table.tsx`:

- `TableLayout` mantém o espaçamento uniforme entre tabela, estado vazio e paginação.
- `TableEmptyState` é um painel cinza claro, com cantos arredondados, separado do cabeçalho; a
  mensagem e a ação variam conforme o domínio e o motivo do vazio.
- `TablePagination` permanece alinhada à direita, usa 10 itens por página por padrão e oferece as
  opções de tamanho definidas na spec aplicável.
- Cabeçalho, linhas, células e rolagem seguem os estilos compartilhados.
- Colunas e filtros de domínio são fornecidos pela tela, sem alterar o padrão visual. A coluna de
  ações não recebe filtro.
- Uma exceção visual requer um ADR que registre a justificativa e o escopo.

## Alternativas consideradas

- **Cada página decide o próprio layout:** mantém liberdade local, mas repete inconsistências e
  aumenta o custo de ajustes globais.
- **Unificar apenas cabeçalho e paginação:** não resolve a divergência dos estados vazios e dos
  espaçamentos entre as partes da tabela.

## Consequências

- ✅ Novas tabelas têm uma composição conhecida e reutilizável.
- ✅ Ajustes no padrão podem ser feitos nos componentes compartilhados.
- ⚠️ Cada nova listagem deve compor os blocos com `TableLayout`, `TableEmptyState` e
  `TablePagination`, em vez de estilizar essas partes localmente.
