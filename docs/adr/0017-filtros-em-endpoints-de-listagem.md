# 0017. Filtros explícitos em endpoints de listagem

- **Status:** Aceito
- **Data:** 2026-10-23

## Contexto

O ADR 0004 padroniza paginação e resposta `PagedResult`, mas não define como as listagens recebem e
aplicam filtros. Sem uma convenção, cada endpoint pode escolher nomes, semântica e momento de
filtragem diferentes. Filtrar no cliente também exige baixar dados desnecessários e pode produzir
contagens e páginas incorretas.

## Decisão

- Toda listagem paginada mantém `page` e `page_size` e retorna `PagedResult`.
- Filtros são parâmetros de query explícitos, opcionais, tipados e documentados no OpenAPI e no
  `plan.md` da feature. Cada recurso aceita somente os filtros deliberadamente definidos para ele.
- Filtros são aplicados no backend e combinados por AND. Ausência de um filtro não limita aquele
  atributo.
- Busca textual usa correspondência parcial sem distinção de caixa, salvo quando o contrato do
  recurso documentar outra semântica. Filtros categóricos e booleanos usam igualdade.
- A autorização, o isolamento por unidade e os demais limites de escopo são aplicados
  independentemente dos filtros e antes de calcular `total_count` e selecionar a página. Um filtro
  nunca amplia o escopo de acesso.
- `total_count` representa a quantidade após os filtros e o escopo de autorização, antes de aplicar
  `page` e `page_size`.
- Valores inválidos são rejeitados com 422 ProblemDetails. A API não aceita nomes de campo,
  operadores ou expressões dinâmicas arbitrárias para montar consultas.
- O frontend transmite os filtros ativos como query params, inclui-os na chave do cache e retorna à
  primeira página quando um filtro muda.
- As telas apresentam somente os controles correspondentes aos filtros que o endpoint suporta.

Exemplo de contrato:

```text
GET /api/usuarios?page=1&page_size=10&nome=ana&ativo=true
```

## Alternativas consideradas

- **Filtrar no frontend:** baixa dados que podem não caber em uma página e torna a contagem incorreta.
- **Parâmetro genérico `filter` com expressões livres:** dificulta validação, documentação, controle
  de autorização e proteção contra consultas não suportadas.
- **Filtros específicos apenas no nome da rota:** mistura critérios de busca com a identidade do
  recurso e dificulta combinar filtros.

## Consequências

- ✅ Endpoints de listagem têm comportamento previsível e fácil de documentar.
- ✅ Filtros respeitam autorização, multi-tenancy e contagem paginada no servidor.
- ⚠️ Cada novo filtro requer mudanças explícitas no contrato, serviço, repositório e frontend que o
  consome.
