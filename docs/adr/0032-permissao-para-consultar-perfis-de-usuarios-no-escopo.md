# 0032. Permissão para consultar perfis de usuários no escopo

- **Status:** Aceito
- **Data:** 2026-10-23
- **ADRs relacionados:** 0015, 0020, 0024, 0031

## Contexto

`usuarios.consultar` autoriza a listagem de contas dentro do escopo da pessoa. A API também passou a
retornar o perfil atribuído a cada conta, mas não havia uma permissão explícita para essa informação.
Consultar pessoas e consultar o perfil de acesso delas são capacidades distintas; a segunda não deve
conceder acesso ao catálogo ou à administração de perfis.

## Decisão

Adicionamos a permissão `usuarios.perfil.consultar`. Ela autoriza a API a retornar nome e código do
perfil atual somente para usuários que a pessoa já pode consultar. Ela não amplia o escopo de
`usuarios.consultar` nem concede acesso ao catálogo de perfis, às permissões dos perfis ou à sua
atribuição/edição. O administrador e o perfil seedado `GERENTE` recebem essa permissão inicialmente;
administradores podem configurá-la em outros perfis.

## Alternativas consideradas

- **Usar `usuarios.consultar` para ambas as capacidades:** concede a todos que listam usuários também
  o conhecimento do perfil de acesso, sem uma escolha explícita na configuração do perfil.
- **Usar `perfis.gerenciar`:** acopla a leitura de uma informação de conta à administração do
  catálogo e impede concessão independente.

## Consequências

- ✅ A tela e a API podem distinguir quem lista usuários de quem vê o perfil atribuído a eles.
- ✅ O escopo da consulta continua vindo da autorização existente de usuários, times e
  responsabilidade direta.
- ⚠️ Perfis customizados não recebem a nova permissão automaticamente; um administrador precisa
  atribuí-la onde for necessária.
