# 0046. Resultados Gerais com no máximo 5 datas

- **Status:** Aceito
- **Data:** 2026-11-04
- **Relacionado:** spec 059, ADR 0039
- **Substitui em parte:** [0039](0039-resultados-gerais-com-paginacao.md), só o limite de 7 datas

## Contexto

O ADR 0039 diz que a General Results mostra no máximo 7 colunas de data, calculadas sobre todos os casos
filtrados. O redesign da spec 059 põe mais colunas fixas antes das datas: TC ID, Assignee, Form Factor e SDF ID.
Com 7 datas, a tabela passa da largura da tela já num notebook, e a pessoa tem que rolar para os lados para ver
a coluna Actions. O design novo mostra 5 datas, e a usuária confirmou esse número em 2026-11-04.

## Decisão

- A General Results mostra no máximo as **5 datas** mais recentes com execução, da mais nova à esquerda.
- O resto do ADR 0039 continua: as datas são calculadas sobre todos os casos filtrados (não só os da página),
  a paginação de Test Cases continua, e as datas mais antigas só aparecem pelo filtro de dia ou semana.
- O limite fica num lugar só, no service, e o repositório recebe o número:

```python
LIMITE_DATAS_RESULTADOS_GERAIS = 5
datas = await self._historico_repo.listar_datas(
    unidade_id, projeto.id, filtros, fuso_horario, limite=LIMITE_DATAS_RESULTADOS_GERAIS
)
```

## Alternativas consideradas

- **Manter 7 datas com rolagem horizontal:** a coluna Actions e as últimas datas ficariam fora da tela na
  maior parte das janelas, e o design novo não prevê essa rolagem.
- **Calcular o número de datas pela largura da janela:** a mesma consulta daria respostas diferentes em
  telas diferentes, a exportação deixaria de bater com o que a pessoa viu, e o cálculo exigiria medir a tela
  antes de consultar a API.

## Consequências

- ✅ A tabela cabe na largura da tela com as colunas novas, sem rolagem lateral na maior parte das janelas.
- ✅ A resposta da API fica um pouco menor (menos datas por caso).
- ⚠️ Quem acompanhava uma semana inteira na tabela vê só 5 dias de execução. Para ver mais, precisa usar o
  filtro de dia ou semana.
- ⚠️ Os testes que contam 7 datas (specs 032 e 033) precisam mudar para 5.
