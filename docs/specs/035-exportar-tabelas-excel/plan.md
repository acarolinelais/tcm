# 035. Exportar tabelas para Excel: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0004, 0009, 0010, 0022, 0030, 0034, 0037, 0039, 0041
- **ADRs novos propostos:** [0042](../../adr/0042-exportacao-de-tabelas-para-excel-no-navegador.md)

## Abordagem
Tudo no frontend (ADR 0042). Uma peça compartilhada em `shared/` faz o trabalho pesado: monta a planilha a partir
das colunas com `exportar`, busca todas as páginas de um endpoint paginado e controla o estado da ação. A `DataTable`
desenha o botão no rodapé com as colunas e os itens que já recebe; cada tela só declara `exportar` nas colunas e passa
`exportacao={{ listagem, todosOsItens }}`, onde `todosOsItens` é uma função que busca uma página com os filtros atuais
(a mesma `api.listar` que a tela já usa). Tabelas paginadas em memória (Perfis, Membros do time)
passam a lista filtrada inteira. O backend não muda.

## Modelo de dados
Sem mudança.

## Contrato da API
Sem rota nova. "Todos os itens" chama os endpoints de listagem existentes com `page_size=100`.

## Backend: arquivos
Nenhum.

## Frontend: arquivos
**Shared (novos)**
- `shared/lib/exportar-planilha.ts`: `gerarPlanilha({ arquivo, colunas, linhas })` (lazy `@e965/xlsx`, `writeFile`),
  `nomeArquivoExportacao(listagem, data)` e `buscarTodasAsPaginas(buscarPagina)` (100 por página, sequencial,
  rejeita se qualquer página falhar).
- `shared/lib/use-exportar-tabela.ts`: recebe `listagem`, `colunas`, `itensPagina`, `buscarPagina` ou
  `todosOsItens`; expõe `exportarPagina`, `exportarTodos`, `exportando`, `disponivel`; erro → toast.
- `shared/ui/data-table-export.tsx`: botão HeroUI "Exportar" (rodapé) + `Dropdown` com "Página atual" e "Todos os itens";
  desabilitado sem itens; spinner e bloqueio enquanto exporta.

**Shared (alterados)**
- `shared/ui/data-table.tsx`: `DataTableColumn.exportar?` e prop `exportacao?` (botão no rodapé, à esquerda da paginação).
- `core/i18n/resources.ts`: `export`, `exportCurrentPage`, `exportAllItems`, `exporting`, `exportError` (en, pt, ko).

**Telas (alteradas: colunas com `exportar` + prop `exportacao` na `DataTable`)**
| Listagem | Arquivo | Nome do arquivo | Paginação |
|---|---|---|---|
| Usuários | `usuarios/components/UsuariosTable.tsx`, `usuarios/pages/UsuariosPage.tsx` | `usuarios` | servidor |
| Setores | `setores/pages/SetoresPage.tsx` | `setores` | servidor |
| Times | `times/pages/TimesPage.tsx` | `times` | servidor |
| Membros do time | `times/pages/TimeDetalhePage.tsx` | `membros-time` | memória |
| Perfis | `perfis/pages/PerfisPage.tsx` | `perfis` | memória |
| Modelos de dispositivo | `modelos-dispositivo/pages/ModelosDispositivoPage.tsx` | `modelos-dispositivo` | servidor |
| Projetos | `projetos/pages/ProjetosPage.tsx` | `projetos` | servidor |
| Test Cases | `projetos/pages/ProjetoDetalhePage.tsx` | `test-cases` | servidor |
| Form Factor | `projetos/components/form-factor/FormFactorTabela.tsx` | `form-factor` | servidor |
| Resultados Form Factor | `projetos/components/form-factor/FormFactorResultadosTabela.tsx` | `form-factor-resultados` | servidor |
| Resultados Gerais | `projetos/components/resultados-gerais/HistoricoProjetoTabela.tsx` | `resultados-gerais` | servidor |

As colunas dinâmicas (modelos do Form Factor, datas dos Resultados Gerais) vêm da resposta e são as mesmas em
todas as páginas (ADR 0039), então valem para "Todos os itens".

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `exportar-planilha.test.ts`: gera e relê a planilha, linhas iguais às da página na ordem |
| CA-02 | Unidade | `buscarTodasAsPaginas` com 245 itens faz 3 chamadas e junta tudo |
| CA-03 | Unidade + e2e | `use-exportar-tabela.test.ts` repassa os filtros a `buscarPagina`; `usuarios.spec.ts` exporta filtrado |
| CA-04 | Unidade | colunas sem `exportar` ficam fora; títulos vêm de `t()` em inglês |
| CA-05 | Unidade + e2e | `nomeArquivoExportacao("usuarios", 2026-10-29)`; e2e confere `download.suggestedFilename()` |
| CA-06 | Componente | um teste por tela: botão "Exportar" visível com os dois itens no menu |
| CA-07 | Componente | `data-table-export.test.tsx`: sem itens, botão desabilitado |
| CA-08 | Unidade | `buscarTodasAsPaginas` com falha na página 2 rejeita; o hook não chama `gerarPlanilha` e mostra toast |
| CA-09 | Componente | durante `exportarTodos`, botão desabilitado e segunda chamada ignorada |
| CA-10 | Unidade | o hook usa só a `buscarPagina` da tela (mesmo endpoint, que já aplica o escopo); sem endpoint novo |

## Riscos e decisões pendentes
- **Posição do botão sem Figma:** rodapé da tabela, à esquerda do total (ADR 0042, decidido na implementação porque as
  colunas de várias tabelas vivem em componentes filhos). Se vier um design, ajusta só a `DataTable`/`DataTableExport`.
- **Volume:** milhares de itens = dezenas de requisições sequenciais. Aceito nesta spec, sem limite (decisão da
  revisão da spec). Se ficar lento, paralelizar em lotes é uma mudança só no `buscarTodasAsPaginas`.
- **Tamanho do bundle:** `@e965/xlsx` entra só no `import()` da exportação, como na importação.
- **Modo mock (ADR 0030):** os endpoints mockados já paginam; o e2e usa os mesmos fixtures.
