---
name: adr
description: Cria ou substitui um Architecture Decision Record (ADR) em docs/adr/. Use quando surgir uma decisão técnica nova (biblioteca, padrão, convenção, estrutura), quando um plan.md exigir algo que nenhum ADR cobre, ou quando o usuário pedir para mudar uma decisão existente ("vamos trocar X por Y", "registre essa decisão", "novo ADR").
---

# Skill: adr

## Passos
1. **Verifique se já existe.** Leia `docs/adr/README.md`. Se um ADR já cobre o assunto:
   - se a nova decisão só detalha a existente e o ADR ainda está `Proposto`, edite esse ADR;
   - se o ADR está `Aceito` e a decisão muda, crie um ADR novo que o **substitui**.
2. **Numere.** Use o próximo número livre (o maior existente + 1, com 4 dígitos). Nunca reutilize um número.
3. **Crie** `docs/adr/NNNN-titulo-em-kebab-case.md` a partir de `docs/adr/template.md`:
   - Status: `Proposto`. Data: hoje (AAAA-MM-DD).
   - **Contexto:** o problema real, em 2 a 5 frases.
   - **Decisão:** regras no imperativo, com exemplo de código curto quando a regra for sobre código.
   - **Alternativas consideradas:** no mínimo 2, cada uma com o motivo concreto da rejeição.
   - **Consequências:** pelo menos um ✅ e um ⚠️. Toda decisão tem custo.
4. **Se substitui outro ADR:** no antigo, mude apenas a linha de status para `Substituído por [NNNN](arquivo.md)`.
5. **Atualize o índice** em `docs/adr/README.md` (número, título e status).
6. **Atualize as referências:** se a decisão muda uma regra citada no `CLAUDE.md` ou em uma skill
   (`python-crud`, `react-crud`), atualize esse texto também. Avise o usuário sobre cada arquivo tocado.

## Regras
- Um ADR, uma decisão. Se o texto tiver "e também decidimos...", divida em dois.
- Português, frases diretas, sem jargão desnecessário.
- Só o usuário muda o status para `Aceito` ou `Rejeitado`. Você nunca aceita um ADR por conta própria.
- Ao terminar, mostre ao usuário o resumo da decisão e pergunte se ele aceita.
