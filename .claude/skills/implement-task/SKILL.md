---
name: implement-task
description: Implementa as tasks abertas de um docs/specs/NNN-nome/tasks.md em blocos (uma fase do tasks.md por vez), roda a verificação de cada task, a simplify e a suíte completa no fim do bloco, e marca como concluídas. Use quando o usuário pedir "implemente a próxima task", "continue a spec NNN", "faça a task X", ou quiser avançar a implementação de uma spec aprovada.
---

# Skill: implement-task

Trabalhe em **blocos**: um bloco é uma fase do `tasks.md` (ex.: "Fase 1: backend"). As tasks do bloco são feitas
em sequência, sem parar entre elas; a simplify, a suíte completa e o relatório acontecem uma vez, no fim do bloco.
Se o usuário pedir uma task específica, o bloco é só essa task.

## Passos
1. **Contexto.** Leia o `spec.md`, o `plan.md` e o `tasks.md` da spec, e também os ADRs citados no plan.
   Se a spec não estiver `Aprovada`, avise o usuário e pergunte se ele quer seguir mesmo assim.
2. **Escolha o bloco.** A fase com a primeira task `- [ ]`, a não ser que o usuário tenha indicado outra.
   Anuncie em uma linha quais tasks vai fazer.
3. **Verifique a coerência.** Se uma task contradiz a spec, o plan ou um ADR, ou depende de algo que não existe,
   **pare** e explique. Não improvise. Decisão que muda o plan também é motivo para parar e perguntar.
4. **Para cada task do bloco, em ordem:**
   - Implemente só essa task. Siga `python-crud` e `react-crud` quando se aplicarem, e as diretrizes da
     skill `andrej-karpathy-skills:karpathy-guidelines` (mudanças cirúrgicas, nada além do pedido).
     Os testes da task fazem parte da task, com o cenário de **sucesso** e o de **falha** (ADR 0010).
   - Rode a verificação **filtrada** da task (ex.: `uv run pytest tests/unit/test_usuario_service.py`,
     `npm test -- usuario-form`). Se falhar, corrija e rode de novo. Nunca marque como concluída uma task
     com verificação vermelha.
   - Marque `- [x]` no `tasks.md` e siga para a próxima, sem relatório intermediário.
5. **Simplifique o bloco (OBRIGATÓRIO).** Rode a skill `simplify` **uma vez** sobre o diff do bloco inteiro.
   Nunca pule este passo nem decida que "não precisa". Aplique o que for do escopo do bloco.
   Achados que exigem mexer fora do bloco (outra entidade, outro ADR, refatoração geral) **não** viram trabalho agora:
   anote-os em `## Backlog` no fim do `tasks.md` (um item por achado, com o motivo) e siga.
6. **Verifique o bloco.** Rode a suíte completa da camada (`uv run pytest` no backend ou
   `cd frontend && npm test && npm run lint` no frontend) depois da simplify.
7. **Reporte** ao usuário em até 10 linhas, uma vez por bloco:
   - as tasks feitas e os arquivos principais;
   - a saída resumida da verificação;
   - o resultado da `simplify` (aplicado e o que foi para o backlog);
   - **o que dá para aprender aqui**: o conceito central do bloco em 1 ou 2 frases;
   - qual é o próximo bloco.
8. **Pare** no fim do bloco. Não emende o próximo bloco sem o usuário pedir.

## Ao concluir a última task da spec
- Rode a skill `code-review` sobre o diff da spec inteira.
- Confira se cada `CA-xx` do `spec.md` é coberto por um teste que passa.
- Mostre o `## Backlog` ao usuário: cada item vira uma task, uma spec nova ou é descartado, conforme ele decidir.
- Mude o status da spec para `Concluída` e atualize o roadmap.
- Sugira registrar o aprendizado com a skill `study-log`.
