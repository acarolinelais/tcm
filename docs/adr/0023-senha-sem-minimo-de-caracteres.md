# 0023. Troca de senha sem mínimo de caracteres

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui parcialmente:** [0019](0019-senha-inicial-e-troca-obrigatoria.md)

## Contexto

A primeira versão do fluxo de troca de senha exigia pelo menos 12 caracteres. Essa exigência aparecia
na interface e na validação da API, podendo impedir a continuidade do usuário quando sua senha pessoal
não atingisse esse comprimento.

## Decisão

A troca da senha inicial não exige comprimento mínimo específico. A senha deve conter ao menos um
caractere e pode ter no máximo 128 caracteres. O frontend e o backend aplicam o mesmo limite. O fluxo
de troca obrigatória, a configuração da senha inicial, o armazenamento em hash e a invalidação de
sessões definidos no ADR 0019 continuam válidos.

## Alternativas consideradas

- **Manter o mínimo de 12 caracteres:** preserva uma regra de comprimento que bloqueia senhas pessoais
  mais curtas.
- **Remover também o limite máximo:** não foi escolhido para manter um limite de entrada explícito e
  comum entre interface e API.

## Consequências

- ✅ O usuário pode definir uma senha pessoal sem a exigência de 12 caracteres.
- ✅ Interface e API deixam de divergir sobre o comprimento mínimo.
- ⚠️ Senhas vazias continuam inválidas; o limite máximo permanece em 128 caracteres.
