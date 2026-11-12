# 0054. Termos em inglês na interface em português

- **Status:** Aceito
- **Data:** 2026-11-11

## Contexto
A interface tem três idiomas (spec 007), mas o time de validação fala alguns termos em inglês no dia a dia: Test Case,
Form Factor, SDF Failures, Dev Fix. Esses termos foram ficando em inglês na interface em português, uma tela de cada
vez e sem regra escrita. Quem cria uma tela nova não sabe se traduz ou não, e a revisão não tem como apontar o erro.

## Decisão
Na interface em português, estes termos ficam em inglês. Todo o resto é traduzido.

| Termo | Onde aparece |
|---|---|
| Test Case, Test Cases | Projeto, Board, Timeline, Overview |
| Form Factor | Aba do projeto, General Results |
| Status | Colunas e filtros |
| Backup | Responsável substituto do caso |
| App | Projeto |
| Device | Form Factor e SDF |
| Pull Requests | Painel do caso |
| Automation Level | Coluna do caso |
| SDF Failures | Página das falhas do SDF (spec 072) |
| My Fixes | Aba de correções do projeto (spec 073) |
| SDF Result | Resultado da execução |
| Pass Rate | Gráficos da Overview |
| Dev Fix, Dev Owner | SDF Failures (spec 072) |

- Mantenha a grafia da tabela, inclusive maiúsculas.
- Um termo novo em inglês entra na tabela neste ADR antes de ir para a tela.
- O teste de traduções aceita texto igual ao do inglês só para estes termos e para textos sem palavra a traduzir
  (números, siglas como API e TC, `{{variável}}`) ou com palavra que se escreve igual nos dois idiomas (Manual).
- Nomes de tela e de status que têm rótulo em português (Overview, Board, Timeline, Done, In Fixes...) não aparecem
  em inglês no meio de uma frase: use o rótulo da tela ("Concluído", "Em correção", "linha do tempo").

```ts
// pt-BR em resources.ts
devFix: "Dev Fix",                        // na tabela: fica em inglês
changeDevFix: "Mudar Dev Fix",            // o resto da frase é traduzido
```

O coreano não muda com este ADR.

## Alternativas consideradas
- **Traduzir só os cinco mais novos (SDF Failures, Dev Fix, Dev Owner, Automation Level, SDF Result):** rejeitada. O
  time e o relatório do SDF usam esses nomes; traduzir cria dois nomes para a mesma coisa nas conversas.
- **Traduzir tudo, inclusive Test Case e Form Factor:** rejeitada pelo mesmo motivo, e com mais telas e documentação
  para mudar.
- **Não escrever regra e decidir em cada tela:** é o que acontece hoje e o que causou a mistura.

## Consequências
- ✅ Quem cria ou revisa uma tela sabe o que traduzir, e um teste pega texto esquecido em inglês.
- ✅ A interface usa os mesmos nomes que o time fala e que aparecem no relatório do SDF.
- ⚠️ Quem não conhece o vocabulário do time encontra termos em inglês na interface em português.
- ⚠️ Termo novo em inglês exige mudar este ADR.
