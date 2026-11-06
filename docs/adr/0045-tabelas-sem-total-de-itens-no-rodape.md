# 0045. Tabelas sem o total de itens no rodapé

- **Status:** Aceito
- **Data:** 2026-11-02
- **Relacionado:** spec 055, ADRs [0022](0022-padrao-universal-de-tabelas.md), [0034](0034-paginacao-padrao-vinte-itens.md) e [0042](0042-exportacao-de-tabelas-para-excel-no-navegador.md)

## Contexto

O rodapé de toda tabela mostra, à esquerda, o texto "N total", seguido do seletor de itens por página.
O protótipo do Figma atualizado não tem mais esse texto em nenhuma tabela. Como o rodapé vem do
`DataTablePagination`, que o ADR 0022 define como padrão de todas as listagens, tirar o total de uma tela só
criaria uma exceção visual, e o ADR 0022 exige um ADR para isso.

## Decisão

Nenhuma tabela mostra o total de itens no rodapé, em nenhum perfil.

- O `DataTablePagination` deixa de desenhar o texto do total. O `totalCount` continua como propriedade, porque
  ainda calcula o número de páginas.
- O rodapé fica com o botão Exportar (ADR 0042) e o seletor de itens por página à esquerda, e a paginação à
  direita. O que o ADR 0042 chama de "à esquerda do total" vira "no início do rodapé".
- A chave de tradução `totalItems` sai dos três idiomas.
- Telas que mostram um total fora do rodapé (um cartão de resumo, por exemplo) não mudam.

## Alternativas consideradas

- **Remover só nas telas do protótipo:** deixaria tabelas iguais com rodapés diferentes e contraria o ADR 0022.
- **Esconder o texto só visualmente e deixá-lo para leitores de tela:** o total continuaria na árvore de
  acessibilidade, mas só quem usa leitor saberia dele, e o protótipo não o pede. A página atual e o total de
  páginas já estão na paginação.

## Consequências

- ✅ Rodapé igual ao protótipo em todas as tabelas, com uma mudança só no componente compartilhado.
- ✅ Menos uma região `aria-live` anunciando a cada filtro.
- ⚠️ Quem filtra deixa de ver quantos itens a busca devolveu. Só dá para estimar pelo número de páginas.
- ⚠️ Testes que procuram o texto "N total" (unitários e e2e) precisam ser trocados na mesma spec.
