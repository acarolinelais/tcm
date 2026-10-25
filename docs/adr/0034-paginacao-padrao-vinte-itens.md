# 0034. Paginação padrão de 20 itens

- **Status:** Aceito
- **Data:** 2026-10-24
- **Relacionado:** ADR 0022, spec 012, backlog B01
- **Substitui:** somente a regra de tamanho padrão do ADR 0022; as demais regras visuais permanecem.

## Contexto

O ADR 0022 e o resumo de specs descrevem 10 itens por página, mas a constante compartilhada `DEFAULT_TABLE_PAGE_SIZE` e `docs/tables-rules.md` já usam 20. O planejamento da spec 012 identificou a divergência e preservou o comportamento atual. Precisamos de uma referência documental única para novas telas e testes.

## Decisão

Use `DEFAULT_TABLE_PAGE_SIZE`, com valor 20, como tamanho inicial das tabelas. Mantenha as opções 10, 20, 50 e 100 em `TABLE_PAGE_SIZE_OPTIONS` e reinicie na primeira página ao trocar tamanho ou filtros. Não altere o padrão dos endpoints existentes como parte desta harmonização; a tela envia explicitamente o tamanho selecionado.

Este ADR substitui a regra de tamanho padrão do ADR 0022. O resumo de `docs/specs/README.md` acompanha o padrão de 20 itens, sem mudança no comportamento atual da aplicação.

## Alternativas consideradas

- **Retornar a constante para 10:** altera todas as telas para resolver uma divergência documental e contraria o comportamento preservado no plano aprovado da spec 012.
- **Manter dois padrões documentados:** obriga cada nova entrega a escolher uma referência e favorece testes e telas inconsistentes.

## Consequências

- ✅ Documentação, componentes compartilhados e testes passam a indicar 20 itens como padrão.
- ✅ Não há alteração de dados ou do comportamento atual das tabelas.
- ⚠️ A aceitação exige atualizar as referências documentais, mantendo o histórico do ADR anterior.
