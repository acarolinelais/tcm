# 0002. Fluxo spec-driven com IA

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
Pedir "implementa o CRUD de X" para a IA gera diffs grandes, difíceis de revisar e de aprender com eles.
O objetivo do repositório é estudar, então cada passo precisa ser pequeno, revisável e verificável.

## Decisão
Toda feature passa por três documentos em `docs/specs/NNN-nome/`, revisados nesta ordem:
1. **`spec.md`**: o quê e por quê. Problema, histórias de usuário, critérios de aceite testáveis
   e o que fica fora de escopo. **Não menciona tecnologia.**
2. **`plan.md`**: como. Abordagem técnica, ADRs aplicados, modelo de dados, contratos da API e riscos.
   Se exigir uma decisão nova, cria um ADR `Proposto`.
3. **`tasks.md`**: checklist de tasks de até ~30 minutos, cada uma com o comando que a verifica.

A IA implementa **um bloco por vez** (uma fase do `tasks.md`, skill `implement-task`): roda a verificação
de cada task, marca `[x]` e para para revisão no fim do bloco.

## Alternativas consideradas
- **Um único `spec.md` por feature:** mais leve, mas mistura o quê com o como e gera tasks grandes demais.
- **Sem specs, só prompts:** rápido, mas não deixa histórico nem critérios de aceite.

## Consequências
- ✅ Diffs pequenos e revisáveis, e cada um ensina algo.
- ✅ Critérios de aceite viram testes.
- ⚠️ Mais arquivos e mais etapas para features triviais (nesses casos, as tasks podem ser poucas).
