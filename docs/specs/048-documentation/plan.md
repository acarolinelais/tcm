# 048. Documentação de uso dentro do sistema: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 (módulo autossuficiente), 0010 (testes), 0015 (perfis), 0025 (idioma da conta),
  0037 (tela nova só com HeroUI), 0041 (cores só por tokens)
- **ADRs novos propostos:** nenhum

## Abordagem

A feature é só de frontend. Um módulo novo, `documentacao`, troca o `EmBreve` da rota `/documentation` por uma
lista de guias e cria a rota `/documentation/:slug`. O conteúdo dos guias é TypeScript estático: um arquivo por
idioma, com os guias como dados (título, resumo, seções com parágrafos e listas). Assim não entra biblioteca de
Markdown nem chamada à API. O inglês é a fonte, e pt-BR e coreano cobrem só os guias já traduzidos; o que falta
cai no inglês com aviso (RN-03). Os slides em PDF ficam em `frontend/public/docs/<idioma>/<slug>.pdf`, e um
manifesto no código diz quais existem, para o botão não apontar para um arquivo inexistente (RN-07).

## Modelo de dados

Sem banco. Tipos do módulo:

| Tipo | Campo | Tipo | Regras |
|---|---|---|---|
| `SlugGuia` | — | união literal dos 12 slugs | ordem da RN-01 em `ORDEM_GUIAS` |
| `Guia` | `slug` | `SlugGuia` | único |
| | `titulo` | `string` | usado no filtro (RN-05) |
| | `resumo` | `string` | uma frase, aparece no card |
| | `secoes` | `{ titulo: string; paragrafos?: string[]; itens?: string[] }[]` | |
| `DESTAQUES` | perfil → `SlugGuia[]` | `Record<string, SlugGuia[]>` | chaves `USUARIO_PADRAO` (dev), `KP`, `GERENTE`, `ADMIN_UNIDADE` (RN-02) |
| `SLIDES` | idioma → `SlugGuia[]` | `Record<LanguageCode, SlugGuia[]>` | slugs com PDF em `public/docs/<idioma>/` |

## Contrato da API

Nenhuma rota nova. O perfil vem do `usePerfilAtual` (`perfil_codigo`), que já existe.

## Backend: arquivos

Nenhum.

## Frontend: arquivos

Novos, em `frontend/src/modules/documentacao/`:
- `index.ts` e `routes.tsx`: `documentation` e `documentation/:slug`.
- `model/guia.ts`: tipos, `ORDEM_GUIAS`, `DESTAQUES` e `SLIDES`.
- `conteudo/en.ts`, `conteudo/pt-BR.ts` e `conteudo/ko.ts`: os guias por idioma (`en` completo; os outros
  `Partial`).
- `conteudo/guias.ts` (+ teste): `guiasNoIdioma(idioma)` devolve os guias na ordem da RN-01 com a marca
  `traduzido`; `guiaPorSlug`; `destaquesDoPerfil`; `urlSlides(slug, idioma)` com a regra de fallback da RN-07.
- `pages/DocumentacaoPage.tsx` (+ teste): destaques do perfil, campo de filtro e a lista; estado vazio "Nenhum
  guia encontrado".
- `pages/GuiaPage.tsx` (+ teste): o guia, o aviso de tradução, o botão "Download slides" (link `download` para o
  PDF) e o estado "Guia não encontrado" com atalho para a lista.
- `frontend/public/docs/en/*.pdf` (depois `pt-BR/` e `ko/`): os slides exportados do Artifact.
- `frontend/e2e/documentacao.spec.ts`.

Alterados:
- `src/core/router.tsx`: usa `documentacaoRoutes` no lugar do `EmBreve`.
- `src/core/layout/voltar.ts` (+ teste): rótulo e pai de `/documentation/:slug`.
- `src/core/i18n/resources.ts`: textos da interface da página (filtro, destaque, aviso, botão, estados) nos três
  idiomas. O conteúdo dos guias fica fora daqui.
- `src/core/layout/EmBreve.tsx`: apagado se nenhuma outra rota usar (hoje só a Documentation usa), junto com a
  ilustração, se ficar sem uso.

Componentes da tela: HeroUI (Card, SearchField, Button/Link, Chip) com tokens semânticos.

## Slides

Cada guia vira um Artifact do tipo Slides, com no máximo 10 slides na paleta da Sidia (azul #0024A5 dominante,
verde #00DC00 só em detalhes, sem preto). O deck é exportado em PDF pelo próprio Artifact, salvo em
`public/docs/<idioma>/<slug>.pdf`, e o slug entra no `SLIDES`. O primeiro deck, "Ciclo de Status", é o piloto:
o formato só é repetido nos outros depois que o usuário aprovar o piloto.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade + e2e | `guias.test.ts` (destaques do dev); `documentacao.spec.ts` "dev vê Ciclo de Status em destaque" |
| CA-02 | Unidade | `GuiaPage.test.tsx` "mostra o guia em coreano quando traduzido" e "mostra inglês com aviso quando não" |
| CA-03 | e2e | `documentacao.spec.ts` "abre o guia direto pelo endereço" |
| CA-04 | Unidade + e2e | `guias.test.ts` (`urlSlides` e fallback); `documentacao.spec.ts` "baixa o PDF do guia" |
| CA-05 | Unidade | `GuiaPage.test.tsx` "slug inexistente mostra Guia não encontrado e o atalho" |
| CA-06 | Unidade | `DocumentacaoPage.test.tsx` "filtro sem correspondência mostra Nenhum guia encontrado" |

Um teste de unidade garante que todo slug do `SLIDES` tem o PDF em `public/docs/` e que todo slug de
`ORDEM_GUIAS` tem conteúdo em inglês.

## Riscos e decisões pendentes

- O conteúdo pode ficar velho quando uma spec mudar uma regra. Mitigação: as specs de origem de cada guia estão
  nas tasks T05 a T09, e quem mexer na regra atualiza o guia no mesmo PR.
- O texto dos guias sai da leitura do código e das specs. Uma regra mal entendida vira documentação errada, então
  o conteúdo de cada guia passa pela revisão do PR.
- PDFs pesam no repositório. Limite de cerca de 2 MB por arquivo; se passar, comprimir antes do commit.
- Specs ainda em andamento (059, 060, 063, 064 e 066) podem mudar o comportamento depois dos guias escritos.
