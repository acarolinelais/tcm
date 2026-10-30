# 044. Comentários no Test Case: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

As conversas sobre um caso ("o procedure está desatualizado", "falha só no modelo X") acontecem em chat e
e-mail e se perdem. Quem pega o caso depois não tem esse contexto.

## Objetivo

Quem vê um caso pode deixar comentários nele, e o caso guarda essa conversa em ordem cronológica.

## Histórias de usuário

- Como **dev**, quero registrar no caso por que ele falha num modelo, para o próximo responsável saber.
- Como **KP**, quero pedir um ajuste ao dev dentro do próprio caso.

## Regras de negócio

- RN-01: O painel e a página do caso (spec 040) ganham a seção Comentários, do mais antigo para o mais recente,
  com autor, data e hora.
- RN-02: Pode ler e comentar quem pode ver o caso (ADR 0015).
- RN-03: Um comentário tem de 1 a 2000 caracteres, sem contar os espaços nas pontas. Só texto simples. Os links
  viram clicáveis.
- RN-04: Comentários não podem ser editados. O autor pode apagar o próprio comentário, que passa a aparecer
  como "Comentário removido".
- RN-05: A lista de Test Cases mostra quantos comentários cada caso tem.

## Critérios de aceite

- **CA-01:** Dado um dev que vê o caso, quando ele escreve um comentário e envia, então o comentário aparece com
  o nome dele, a data e a hora.
- **CA-02:** Dado o próprio comentário, quando o autor o apaga, então ele aparece como "Comentário removido".
- **CA-03:** Dado um caso com 3 comentários, quando a lista é exibida, então a linha mostra 3.
- **CA-04 (falha):** Dado um texto vazio ou só com espaços, quando a pessoa tenta enviar, então o envio é
  recusado.
- **CA-05 (falha):** Dado um texto com mais de 2000 caracteres, quando a pessoa tenta enviar, então o envio é
  recusado e o caso não muda.
- **CA-06 (falha):** Dado um comentário de outra pessoa, quando alguém tenta apagá-lo, então a ação não
  aparece e uma tentativa direta é recusada.

## Fora de escopo

- Menções (@pessoa) e notificações (spec 046).
- Anexos no comentário (spec 045).
- Editar comentários e reações.

## Dúvidas em aberto

- A gestão (admin ou gerente) pode apagar comentários de outras pessoas, por moderação?
- Os comentários entram na Timeline quando ela for definida?
