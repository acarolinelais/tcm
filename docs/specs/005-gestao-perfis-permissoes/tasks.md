# 005. Gestão de perfis e permissões: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

## Fase 1: Catálogo de permissões

- [x] **T01. Definir metadados tipados para o catálogo de permissões**
  - Arquivos: schema e catálogo central no backend
  - Cobre: CA-02
  - Verificação: `cd backend && uv run pytest tests/functional/test_perfis_api.py` → catálogo tipado, metadados e ordenação
- [x] **T02. Expor controller e ordenação no endpoint do catálogo**
  - Arquivos: `backend/src/api/routers/perfis.py`
  - Cobre: CA-01, CA-02
  - Verificação: testes funcionais confirmam grupos sem taxonomia no frontend

## Fase 2: Editor mais simples

- [x] **T03. Reorganizar navegação e editor em uma área de trabalho única**
  - Arquivos: página e componentes do módulo `perfis`
  - Cobre: CA-01, CA-08, CA-14
  - Critérios: tabela lista perfis no padrão de usuários; menu oferece visualizar e editar permissões conforme proteção; editor usa a largura disponível; novo perfil abre editor vazio
- [x] **T04. Tornar os grupos compactos e escaneáveis**
  - Arquivos: componentes de grupo e permissão
  - Cobre: CA-03, CA-04, CA-05
  - Critérios: grupos recolhidos por padrão; cabeçalho com contagem e resumo das permissões ativas; nomes e descrições legíveis; códigos técnicos fora da visualização comum; checkbox total/parcial acessível
- [x] **T05. Consolidar rascunho e ações de criação/edição**
  - Arquivos: editor, estado local e confirmação de mudanças
  - Cobre: CA-06, CA-07, CA-11
  - Critérios: barra de ação junto ao rodapé do editor; salvar desabilitado sem mudanças; criar, descartar ou permanecer no rascunho novo; salvar, descartar ou permanecer na edição; erros preservam o rascunho

## Fase 3: Criação atômica pela API

- [x] **T06. Expandir o contrato de criação para receber permissões**
  - Arquivos: schema de criação, router e cliente frontend
  - Cobre: CA-08, CA-09
  - Critérios: POST recebe nome, descrição opcional e lista completa de permissões; resposta inclui o perfil criado com a seleção persistida
- [x] **T07. Persistir perfil e associações numa única transação**
  - Arquivos: `backend/src/api/routers/perfis.py`, testes funcionais
  - Cobre: CA-09, CA-10
  - Critérios: IDs inválidos ou conflito não deixam perfil parcial; lista vazia é válida; escopo de unicidade permanece por unidade
- [x] **T08. Integrar a criação ao editor unificado**
  - Arquivos: tela e `frontend/src/modules/perfis/api/perfis.api.ts`
  - Cobre: CA-08 a CA-10
  - Critérios: uma ação cria identidade e permissões; conflito/erro mantém campos e checkboxes; sucesso seleciona o perfil criado

## Fase 4: Proteção e acabamento

- [x] **T09. Manter autorização, isolamento e proteção de perfis de sistema**
  - Arquivos: endpoints e testes funcionais da API
  - Cobre: CA-12, CA-13
  - Critérios: 403 sem permissão; identidade do perfil de sistema protegida e permissões editáveis por administrador; outro tenant não lê nem altera os dados
- [x] **T10. Validar acessibilidade e responsividade do fluxo completo**
  - Arquivos: testes de componente e E2E
  - Cobre: CA-14
  - Verificação: `cd frontend && npm test -- --run src/modules/perfis` e `npm run e2e -- --grep "perfis"` → teclado, foco visível, estado parcial e viewport estreito

## Fase 5: Edição de permissões em perfis seedados

- [x] **T11. Permitir edição administrativa das permissões de todos os perfis da unidade**
  - Arquivos: endpoint de permissões, editor, testes e ADR 0031
  - Cobre: RN-03, RN-13, CA-12, CA-16
  - Verificação: testes de API e componente confirmam edição de ADMIN_UNIDADE, USUARIO_PADRAO,
    GERENTE, KP e perfis personalizados; códigos e identidade dos perfis seedados permanecem estáveis
