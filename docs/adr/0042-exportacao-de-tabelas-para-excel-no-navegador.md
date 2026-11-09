# 0042. Exportação de tabelas para Excel gerada no navegador

- **Status:** Aceito
- **Data:** 2026-10-29
- **Relacionado:** ADRs 0004, 0022, 0034, 0037, spec 035

## Contexto
A spec 035 pede que toda listagem exporte para Excel a página atual ou todos os itens, com os filtros aplicados e
os textos no idioma da interface. As listagens paginam no servidor (ADR 0004) com `page_size` de no máximo 100. O
texto de cada célula (status traduzido, nomes no lugar de IDs, datas) já é montado no frontend, e a tradução vive
só no frontend (ADRs 0007/i18n e 0033). O projeto já usa `@e965/xlsx` (SheetJS) no navegador para ler planilhas.

## Decisão
- A planilha é **gerada no navegador** com `@e965/xlsx`, carregado sob demanda (`import()`), sem endpoint novo.
- **Página atual:** exporta os itens já carregados na tela. **Todos os itens:** busca as páginas no mesmo endpoint
  da listagem, com os mesmos filtros e `page_size=100`, uma de cada vez, até completar `total_count`. Se qualquer
  página falhar, nada é baixado. Listagens paginadas em memória exportam a lista filtrada que já têm.
- A coluna declara o que exporta: `DataTableColumn` ganha `exportar?: { titulo: string; valor: (item) => string |
  number | null }`. Coluna sem `exportar` (ações, seleção) fica fora da planilha.
- A ação fica num botão "Exportar" com menu de dois itens (Página atual / Todos os itens), no **rodapé da tabela**, à
  esquerda do total de itens. Quem desenha é a própria `DataTable`, com as colunas e os itens que já recebe; a tela só
  passa `exportacao={{ listagem, todosOsItens }}`. É a mesma posição em todas as tabelas, inclusive dentro de abas e
  em componentes de tabela separados da página (onde o cabeçalho da página não enxerga as colunas).
- Arquivo `<listagem>_<AAAA-MM-DD>.xlsx`, uma aba, primeira linha com os títulos.

## Alternativas consideradas
- **Endpoint de exportação no backend (openpyxl):** um endpoint por listagem, e o backend teria que traduzir títulos
  e valores, duplicando o i18n (mesmo motivo do ADR 0033).
- **Subir o limite de `page_size` para "tudo":** uma resposta sem teto em todas as listagens só para exportar.
- **Botão no cabeçalho da página:** as colunas de Usuários, Form Factor e Resultados Gerais vivem em componentes
  filhos; levar o botão ao cabeçalho exigiria expor as colunas para cima em cada um deles.
- **CSV:** abre com acentuação e separador errados no Excel em pt-BR/ko e não é o formato pedido.

## Consequências
- ✅ Sem mudança no backend; a permissão e o escopo são os da própria listagem.
- ✅ Títulos e valores saem iguais aos da tela, no idioma atual.
- ⚠️ "Todos os itens" faz `ceil(total/100)` requisições; numa listagem com milhares de itens leva alguns segundos.
- ⚠️ Itens criados ou alterados durante a busca das páginas podem sair duplicados ou faltar (sem snapshot).
