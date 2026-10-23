# 0026. Perfil KP com escopo por participação em times

- **Status:** Aceito
- **Data:** 2026-10-23
- **ADRs relacionados:** 0015, 0021, 0025

## Contexto

A autorização KP era representada pelo papel salvo em cada vínculo de membro com um time. Com a
criação do perfil de conta KP, manter essa segunda seleção exige configurar o mesmo papel duas vezes
e permite divergências entre times. Foi confirmado que uma pessoa com perfil KP exerce a função em
todos os times de que participa.

## Decisão

- O perfil de conta `KP` é a única fonte da capacidade KP. A associação `TimeMembro` representa
  somente a participação no time, sem papel KP/DEV.
- Uma conta com perfil KP pode exercer as permissões próprias de KP em todos os times onde tem
  participação ativa. A participação não concede acesso a times de que a conta não faz parte, nem a
  outra unidade.
- Adicionar uma pessoa a um time não pergunta um papel. A interface mostra o perfil da conta como
  informação do membro.
- Na migração, pessoas com perfil `USUARIO_PADRAO` e pelo menos uma participação KP ativa legada
  recebem o perfil KP da própria unidade. Perfis diferentes não são sobrescritos. Sessões afetadas
  são invalidadas.
- Remover uma participação revoga o acesso ao respectivo time; alterar o perfil da conta revoga as
  capacidades KP em todos os seus times.

## Alternativas consideradas

- **Manter KP/DEV por time além do perfil:** duplica configuração e permite que perfil e papel entrem
  em conflito.
- **Dar a KP acesso a todos os times da unidade:** elimina o isolamento por participação e concede
  escopo excessivo.

## Consequências

- ✅ Uma única atribuição do perfil KP vale em todos os times da pessoa; a participação continua
  isolando o acesso por time.
- ✅ A tela e o contrato de membros ficam mais simples e deixam de editar papéis de equipe.
- ⚠️ Uma pessoa não pode ser KP em um time e DEV em outro; KP é uma capacidade da conta aplicada a
  cada time em que ela participa.
- ⚠️ A migration precisa preservar as contas padrão que já tinham papel KP e invalidar suas sessões.
