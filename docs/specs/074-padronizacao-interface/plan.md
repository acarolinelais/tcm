# 074. Padronização da interface: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 e 0037 (frontend modular, HeroUI), 0010 (testes), 0025 (idioma por conta), 0045 (fundação
  visual do redesign)
- **ADRs novos propostos:** [0054](../../adr/0054-termos-em-ingles-na-interface-em-portugues.md) (termos em inglês na
  interface em português) e [0055](../../adr/0055-nome-do-idioma-no-proprio-idioma.md) (nome do idioma no próprio
  idioma)

## Abordagem
Só frontend; backend e API não mudam. A Overview vazia ganha o mesmo cabeçalho do Board vazio (`PageTitle` e
`PageDescription` dentro do `PageCard`), e o `EstadoVazio` deixa de ser o título da página (`h2`). No `Sidebar`, as
condições que hoje mostram Teams e Users soltos viram duas constantes; para o KP, os dois itens entram na lista de
Administration, e a pasta passa a abrir também em `/times` e `/usuarios`. Os rótulos de `languages` passam a ser
Português, English e 한국어. Um teste de `resources` compara pt-BR com en e só aceita texto igual para os termos do ADR
0054 ou sem palavra a traduzir.

## Modelo de dados
Não muda.

## Contrato da API
Não muda.

## Backend: arquivos
Nenhum.

## Frontend: arquivos
| Arquivo | Mudança |
|---|---|
| `src/modules/overview/pages/OverviewPage.tsx` | Cabeçalho com título e frase de apoio no estado vazio |
| `src/core/i18n/resources.ts` | Chave `overviewHint` (en, pt-BR, ko); rótulos de `languages` |
| `src/core/layout/Sidebar.tsx` | Teams e Users do KP dentro de Administration; pasta abre em `/times` e `/usuarios` |
| `src/modules/overview/pages/OverviewPage.test.tsx` | CA-01, CA-02 |
| `src/core/layout/Sidebar.test.tsx` | CA-03 a CA-07 |
| `src/core/i18n/resources.test.ts` | CA-08, CA-09 |
| `src/core/i18n/LanguageSelector.test.tsx`, `src/core/auth/AlterarSenhaPage.test.tsx`, `src/modules/configuracoes/pages/ConfiguracoesPage.test.tsx` | "Portuguese" vira "Português" |
| `e2e/overview.spec.ts` | Cenário vazio confere o título e a frase de apoio |

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `OverviewPage.test`: sem casos, título `h1`, frase de apoio e vazio `h2`; e2e `overview.spec.ts` (falha: vazio) |
| CA-02 | Unidade | `OverviewPage.test`: com casos, sem o título da página vazia |
| CA-03 | Unidade | `Sidebar.test`: KP com time e permissão tem Teams e Users dentro de Administration |
| CA-04 | Unidade | `Sidebar.test`: KP em `/times` e em `/usuarios` com a pasta aberta e o item ativo |
| CA-05 | Unidade | `Sidebar.test`: KP sem time não vê Teams; sem `usuarios.consultar` não vê Users |
| CA-06 | Unidade | `Sidebar.test`: KP sem nenhum item não vê Administration |
| CA-07 | Unidade | `Sidebar.test` (já existe para o gerente; confere que segue solto) |
| CA-08 | Unidade | `resources.test`: texto pt-BR igual ao en só para os termos do ADR 0054 ou sem palavra |
| CA-09 | Unidade | `resources.test` e `LanguageSelector.test`: Português, English e 한국어 |

## Riscos e decisões pendentes
- O e2e da Overview usa a API real para o login; sem o backend no ar, ele não roda localmente.
- A lista do teste de CA-08 é a do ADR 0054. Se o ADR mudar, o teste muda junto.
