# 0001. Registrar decisões em ADRs

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
O projeto é desenvolvido com apoio de IA. Sem um registro explícito, a IA (e a gente, meses depois)
reinventa decisões a cada sessão, e o código deriva para padrões inconsistentes. O "porquê" se perde.

## Decisão
Toda decisão técnica relevante (estrutura, biblioteca, padrão, convenção) é registrada em
`docs/adr/NNNN-titulo-em-kebab-case.md`, no formato MADR enxuto, em PT-BR.
Os ADRs são a referência obrigatória para humanos e para a IA (o `CLAUDE.md` aponta para eles).
A skill `adr` cria novos ADRs.

## Alternativas consideradas
- **Wiki externa:** fica fora do repositório, a IA não lê e ela desatualiza.
- **Só comentários no código:** não registra as alternativas nem o contexto.

## Consequências
- ✅ A IA tem regras explícitas e versionadas para seguir.
- ✅ Bom material de estudo: cada ADR explica um trade-off.
- ⚠️ Exige disciplina para escrever o ADR antes de mudar o padrão.
