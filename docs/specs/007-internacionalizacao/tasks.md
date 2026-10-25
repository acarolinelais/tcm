# 007. Internacionalização do frontend: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo verificável, em torno de 30 minutos. Implementar junto com os testes da
> área e manter a UI em inglês durante o rollout.

## Fase 1: Preferência de idioma na conta

- [x] **T01. Registrar decisão arquitetural sobre preferência por conta**
  - Arquivos: `docs/adr/0025-idioma-preferido-por-conta.md`, índice de ADRs
  - Cobre: RN-02, RN-03, RN-04
  - Verificação: ADR registra precedência no login, fallback `en` e escolha pré-login temporária
- [x] **T02. Persistir idioma preferido do usuário**
  - Arquivos: entidade, modelo ORM, migration e repositório de usuário
  - Cobre: RN-02, RN-03
  - Verificação: testes de migration confirmam `en` para contas existentes e default para novas; constraint recusa código fora dos suportados
- [x] **T03. Expor preferência no perfil autenticado e endpoint de atualização**
  - Arquivos: schemas, serviço de autenticação, router e testes API
  - Cobre: RN-03, RN-11
  - Verificação: `/me` retorna a preferência; PATCH só altera o usuário autenticado e funciona durante troca obrigatória de senha

## Fase 2: Catálogos e infraestrutura frontend

- [x] **T04. Adicionar i18next e configurar idiomas/fallback**
  - Arquivos: dependências, configuração de i18n e providers
  - Cobre: RN-01, RN-10
  - Verificação: teste confirma `en`, `pt-BR`, `ko` e fallback para inglês sem exibir chaves
- [x] **T05. Criar recursos base em inglês e português**
  - Arquivos: recursos de tradução compartilhados e namespaces
  - Cobre: RN-05, RN-06
  - Verificação: validadores de tipos/chaves confirmam paridade entre `en` e `pt-BR`
- [x] **T06. Criar recursos coreanos e validar paridade**
  - Arquivos: recursos de tradução `ko`
  - Cobre: RN-01, RN-05, RN-10
  - Verificação: todas as chaves inglesas existem em `ko`; fallback não encobre chaves ausentes na validação
- [x] **T07. Implementar seleção pré-login e sincronização com a conta**
  - Arquivos: providers/auth hooks e persistência temporária do browser
  - Cobre: RN-02, RN-03, RN-04
  - Verificação: locale pré-login traduz autenticação; após login, preferência de `/me` substitui locale temporário

## Fase 3: Tradução das telas

- [x] **T08. Traduzir login, troca de senha e navegação global**
  - Arquivos: `LoginPage`, `AlterarSenhaPage`, `Navbar`, `Sidebar`, mensagens globais
  - Cobre: RN-05, RN-06, CA-04
  - Verificação: testes de componente percorrem seleção de idioma, labels e erros nos três idiomas
- [x] **T09. Persistir troca de idioma pelo seletor do navbar**
  - Arquivos: Navbar, API client de auth e testes
  - Cobre: RN-03, RN-11
  - Verificação: troca salva no backend e permanece após carregar novamente o perfil; falha reverte a UI
- [x] **T10. Traduzir usuários, setores, times, perfis e permissões**
  - Arquivos: módulos administrativos e catálogos de tradução por código estável
  - Cobre: RN-05, RN-07, RN-08
  - Verificação: textos de sistema mudam de idioma e conteúdo customizado continua original
- [x] **T11. Traduzir overview e componentes compartilhados**
  - Arquivos: módulo overview, tabelas, filtros, paginação, dialogs, toasts e componentes UI
  - Cobre: RN-05, RN-06, RN-07
  - Verificação: estados vazio/loading, ações, aria labels e erros usam o idioma ativo
- [x] **T12. Localizar mensagens de erro e validações**
  - Arquivos: API client, `ProblemDetails`, formulários e catálogos
  - Cobre: RN-05, RN-09
  - Verificação: nenhuma mensagem do backend em idioma diferente é exibida diretamente

## Fase 4: Validação e regressão

- [x] **T13. Localizar datas, horas e números**
  - Arquivos: helpers de formatação e componentes que exibem valores formatados
  - Cobre: RN-07
  - Verificação: testes cobrem formatação equivalente em `en`, `pt-BR` e `ko`
- [x] **T14. Validar cobertura de traduções e fluxo entre dispositivos**
  - Arquivos: scripts de paridade, testes API, componentes e E2E
  - Cobre: CA-01 a CA-11
  - Verificação: paridade integral dos catálogos; teste de `AppLayout` confirma que a preferência retornada pelo perfil prevalece numa sessão nova
- [x] **T15. Executar validações completas e corrigir regressões**
  - Arquivos: nenhuma alteração funcional planejada; corrigir achados
  - Cobre: todos
  - Verificação: backend (123 testes), Ruff e formatação; frontend (24 testes), build, lint e E2E (5 testes) aprovados
