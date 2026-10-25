# 0021. Escopo de gestão de times definido pelo setor

- **Status:** Aceito; escopo do gerente em projetos, Test Cases, membros e Form Factor ampliado por [0036](0036-escopo-gerente-inclui-times-em-que-participa.md)
- **Data:** 2026-10-23
- **ADRs relacionados:** 0013, 0018, 0020

## Contexto

O modelo atual identifica o gerente de um time por `Time.gerente_id`. Isso não permite delegar a uma
pessoa a gestão de todos os times de um setor antes de esses times existirem. Também não representa
mais de um gerente responsável pelo mesmo setor. A gestão de usuários já usa perfis e permissões
globais à conta, enquanto o alcance da gestão de times precisa permanecer limitado à estrutura
organizacional.

## Decisão

**A autorização de gerente é composta por permissão de perfil e associação ativa ao setor.** Uma
associação `SetorGerente` liga usuários ao setor; tanto setores quanto gerentes podem participar de
várias associações, sempre dentro da mesma unidade.

- Cada unidade recebe um perfil de sistema `GERENTE`, protegido contra edição e atribuível a usuários.
  Esse perfil concede `times.consultar`, `times.criar` e `times.gerenciar`.
- Um usuário com o perfil `GERENTE` só atua nos setores aos quais tem associação ativa. Ter o perfil,
  sozinho, não concede acesso a times.
- Um gerente associado pode criar times no setor e administrar times, membros e papéis desses times.
  Ao criar um time, seu identificador é salvo em `Time.gerente_id` como responsável principal.
- `Time.gerente_id` é informativo e não concede autorização. Outros gerentes associados ao mesmo setor
  também podem administrar seus times. Remover uma associação revoga imediatamente esse escopo,
  mesmo que `Time.gerente_id` continue apontando para a pessoa.
- KP continua sendo `TimeMembro.papel == KP`. Gerentes e KP usam a área de Times, com escopos
  distintos: setores associados para gerente e times com vínculo KP para KP.
- Um setor com times ativos não pode ser inativado. Inativar um setor sem times ativos também
  inativa suas associações ativas de gerentes. Reativar o setor não reativa os vínculos antigos;
  o admin deve associar os gerentes novamente.

O backend calcula escopos a partir do estado persistido atual, junto às permissões do perfil; claims
ou visibilidade no frontend não substituem a autorização. Alterações que mudem acesso invalidam as
sessões conforme ADR 0020.

## Alternativas consideradas

- **Manter `Time.gerente_id` como única fonte de autorização:** não permite delegar gestão a nível de
  setor e exige a existência prévia de um time para alocar um gerente.
- **Criar um papel global de gerente independente do setor:** daria escopo excessivo e conflitaria
  com a separação entre permissões do perfil e escopo organizacional.
- **Substituir `Time.gerente_id` pela associação ao setor:** perderia a indicação de quem é o
  responsável principal por cada time. O campo permanece para essa finalidade, sem efeito de
  autorização.

## Consequências

- ✅ Um gerente pode criar times no setor que recebeu, sem acesso administrativo à unidade.
- ✅ Vários gerentes podem colaborar em um setor; um gerente pode responder por vários setores.
- ✅ A desassociação revoga acesso em todos os times do setor sem atualizar cada time.
- ⚠️ Novo vínculo tenant-scoped precisa de repositório e testes explícitos de isolamento por unidade.
- ⚠️ `times.gerenciar` passa a ser validada junto ao escopo de setor para gerentes; o cheque legado
  baseado em times gerenciados deve ser substituído para não criar fontes de autorização concorrentes.
- ⚠️ O perfil `GERENTE` deve ser seedado em unidades existentes e novas, mantendo seu conjunto fixo
  de permissões durante alterações futuras no catálogo.
