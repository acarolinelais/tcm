# 048. Documentação de uso dentro do sistema: Tasks

- **Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

> Uma task = um objetivo, ~30 min, verificável. Os testes vão junto com o código que eles cobrem.
> Implementar com a skill `implement-task`, um bloco (fase) por vez.

## Fase 1: estrutura do módulo e páginas

- [x] **T01. Modelo e funções dos guias**
  - Arquivos: `frontend/src/modules/documentacao/model/guia.ts`, `conteudo/en.ts` (os 12 guias só com título e
    resumo), `conteudo/pt-BR.ts`, `conteudo/ko.ts` (vazios), `conteudo/guias.ts`, `conteudo/guias.test.ts`
  - Cobre: CA-01, CA-04 (regras de destaque e de fallback dos slides)
  - Verificação: `cd frontend && npx vitest run src/modules/documentacao/conteudo` → verde, com um caso de
    sucesso e um de falha (slug inexistente, perfil desconhecido)
- [x] **T02. Página da lista com destaques e filtro**
  - Arquivos: `pages/DocumentacaoPage.tsx`, `pages/DocumentacaoPage.test.tsx`, `routes.tsx`, `index.ts`,
    `src/core/router.tsx`, `src/core/i18n/resources.ts`
  - Cobre: CA-01, CA-06
  - Verificação: `npx vitest run src/modules/documentacao/pages src/core/i18n` → verde
- [x] **T03. Página do guia com aviso de tradução, slides e "não encontrado"**
  - Arquivos: `pages/GuiaPage.tsx`, `pages/GuiaPage.test.tsx`, `src/core/layout/voltar.ts`,
    `src/core/layout/voltar.test.ts`, `src/core/i18n/resources.ts`
  - Cobre: CA-02, CA-03, CA-05
  - Verificação: `npx vitest run src/modules/documentacao src/core/layout/voltar.test.ts` → verde
- [x] **T04. Remover o EmBreve sem uso e cobrir o fluxo em e2e**
  - Arquivos: `src/core/layout/EmBreve.tsx` (e a ilustração, se ficar sem uso), `frontend/e2e/documentacao.spec.ts`
  - Cobre: CA-01, CA-03
  - Verificação: `npm run lint && npx tsc -b && npx playwright test e2e/documentacao.spec.ts` → verde

## Fase 2: conteúdo dos guias em inglês

> Cada guia sai da leitura das specs e do código que ele descreve. As fontes de cada um ficam listadas abaixo.

- [x] **T05. Primeiros passos, Perfis e permissões, Glossário**
  - Arquivos: `conteudo/en.ts`
  - Fontes: specs 007, 034, 042; ADR 0015 e a tabela de permissões do backend
  - Verificação: `npx vitest run src/modules/documentacao` → verde
- [x] **T06. Ciclo de Status e Status e Situation**
  - Arquivos: `conteudo/en.ts`
  - Fontes: entidade `caso_teste.py`, specs 037, 065, 066
  - Verificação: `npx vitest run src/modules/documentacao` → verde
- [x] **T07. Importar projeto por planilha e Relatório SDF**
  - Arquivos: `conteudo/en.ts`
  - Fontes: specs 016, 025, 028, 060, 062, 066, 067; ADR 0033 (códigos de erro da planilha)
  - Verificação: `npx vitest run src/modules/documentacao` → verde
- [x] **T08. General Results e Form Factor, Projetos encerrados, Board e Timeline**
  - Arquivos: `conteudo/en.ts`
  - Fontes: specs 018, 020 a 024, 032, 054, 056, 057, 059, 068, 069; ADR 0046
  - Verificação: `npx vitest run src/modules/documentacao` → verde
- [x] **T09. Exportar tabelas e Auditoria**
  - Arquivos: `conteudo/en.ts`
  - Fontes: specs 035, 052; ADR 0042
  - Verificação: `npx vitest run src/modules/documentacao` → verde

## Fase 3: slides em PDF

- [x] **T10. Deck piloto: Ciclo de Status**
  - Arquivos: Artifact de slides; `frontend/public/docs/en/status-cycle.pdf`; `model/guia.ts` (`SLIDES`)
  - Cobre: CA-04
  - Verificação: o usuário aprova o piloto; `npx vitest run src/modules/documentacao` → verde (o teste confere
    que o PDF do `SLIDES` existe)
- [x] **T11. Decks dos guias 1, 3, 4 e 5**
  - Arquivos: Artifacts de slides; `public/docs/en/*.pdf`; `SLIDES`
  - Verificação: `npx vitest run src/modules/documentacao` → verde; cada PDF com até 10 slides e até ~2 MB
- [x] **T12. Decks dos guias 6 a 12**
  - Arquivos: Artifacts de slides; `public/docs/en/*.pdf`; `SLIDES`
  - Cobre: CA-04
  - Verificação: `npx vitest run src/modules/documentacao && npx playwright test e2e/documentacao.spec.ts` → verde

## Fase 4: traduções

- [x] **T13. Guias em português**
  - Arquivos: `conteudo/pt-BR.ts`
  - Cobre: CA-02
  - Verificação: `npx vitest run src/modules/documentacao` → verde; nenhum guia em pt-BR mostra o aviso
- [x] **T14. Guias em coreano**
  - Arquivos: `conteudo/ko.ts`
  - Cobre: CA-02
  - Verificação: `npx vitest run src/modules/documentacao` → verde; nenhum guia em ko mostra o aviso

## Backlog

- Slides em português e coreano: hoje só existem os PDFs em inglês, e o botão avisa "(PDF, em inglês)" nas
  outras línguas. Fazer os 12 decks em pt-BR e ko a partir de `conteudo/pt-BR.ts` e `conteudo/ko.ts`, exportar
  para `frontend/public/docs/pt-BR/` e `frontend/public/docs/ko/` com os mesmos slugs e preencher `SLIDES` em
  `model/guia.ts`. O teste de `guias` já confere que cada PDF declarado existe.
