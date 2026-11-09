# 0048. Sessão de 10 horas a partir do login

- **Status:** Aceito
- **Data:** 2026-11-05
- **Relacionado:** spec 061, ADR 0047
- **Substitui em parte:** [0020](0020-sessoes-jwt-e-refresh-rotativo.md), só a validade do refresh token

## Contexto

O ADR 0020 deu 7 dias ao refresh token. Na prática a sessão nunca chegou a isso: o token ficava no
`sessionStorage` e acabava quando a aba fechava. Com o refresh em cookie (ADR 0047), os 7 dias passam
a valer de verdade, e um navegador esquecido aberto ou reaberto dias depois continuaria logado. O
sistema é usado em horário de trabalho, então a sessão deve durar um dia de trabalho.

## Decisão

- A sessão vale 10 horas a partir do login. O prazo é fixo: a renovação do access token troca o
  refresh token, mas não estende a validade da sessão.
- A troca obrigatória da senha inicial reinicia as 10 horas, como já acontece hoje com o prazo da
  sessão.
- O cookie `sdf_refresh` do ADR 0047 usa o mesmo prazo no `Max-Age`.
- O access token continua com 15 minutos.

```python
ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_HOURS = 10
```

## Alternativas consideradas

- **Manter 7 dias:** com a sessão compartilhada entre abas, deixa o navegador logado por uma semana,
  o que não faz sentido para um sistema usado só em horário de trabalho.
- **8 horas:** quem entra cedo e fica além do expediente cai no login no fim do dia.
- **Expirar por inatividade:** exige estender o prazo a cada uso e manter um teto absoluto ao mesmo
  tempo. São duas regras para manter, e o ganho para um dia de trabalho é pequeno.

## Consequências

- ✅ A sessão acaba no fim do dia, mesmo com o navegador aberto.
- ✅ A regra é um prazo fixo, simples de testar.
- ⚠️ Quem trabalha mais de 10 horas seguidas faz login de novo no meio do dia.
- ⚠️ As sessões com 7 dias criadas antes desta mudança seguem válidas até expirar. O prazo novo vale
  só para os logins feitos depois do deploy.
