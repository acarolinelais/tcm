# 062. Esconder a prévia da planilha: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0009 (frontend modular), 0010 (testes), 0037 (HeroUI v3)
- **ADRs novos propostos:** nenhum

## Abordagem
Só frontend. O `PreviaPlanilha` ganha um estado `visivel` e um `Button` do HeroUI no cabeçalho, com
`aria-expanded` e o texto "Hide preview" ou "Show preview". Com a prévia escondida, a moldura da tabela não é
renderizada; a página e o tamanho de página ficam no estado do próprio componente, então voltam iguais
(RN-04). Quando chega uma planilha nova pela prop `previa`, `visivel` volta para `true` no próprio render
(RN-01), porque o componente nem sempre remonta entre duas leituras seguidas. A importação usa os casos do
hook de leitura e não o estado do componente, então esconder a prévia não muda o que é importado (RN-05).

## Modelo de dados
Sem mudança.

## Contrato da API
Sem mudança.

## Backend: arquivos
Nenhum.

## Frontend: arquivos
- `modules/projetos/components/importacao/PreviaPlanilha.tsx`: estado `visivel`, botão, reset por planilha.
- `modules/projetos/components/importacao/PreviaPlanilha.test.tsx`: testes dos CA-01 a CA-04.
- `core/i18n/resources.ts`: `hidePreview` e `showPreview` em en, pt-BR e ko.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade | `PreviaPlanilha.test.tsx`: começa visível com "Hide preview" |
| CA-02 | Unidade | `PreviaPlanilha.test.tsx`: esconde a tabela e mantém título, projeto e quantidade |
| CA-03 | Unidade | `PreviaPlanilha.test.tsx`: volta na mesma página e no mesmo tamanho |
| CA-04 | Unidade | `PreviaPlanilha.test.tsx`: planilha nova (rerender) começa visível |
| CA-05 | Unidade | `ProjetosPage.test.tsx` (existente): importa os casos lidos; o estado novo não entra na importação |
| CA-06 | Unidade | `UploadPlanilha.test.tsx` (existente): planilha com erro não mostra a prévia |

## Riscos e decisões pendentes
- Nenhum.
