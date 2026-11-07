# 066. Status do Test Case pela importação do relatório SDF: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0010, 0013, 0044
- **ADRs novos propostos:** nenhum

## Abordagem

A regra de Status é do domínio: `CasoTeste.aplicar_resultado_sdf(tudo_pass, fail_no_relatorio)` decide a
transição pelas RN-04 a RN-07. Ela só mexe num caso em In Validation; nos outros Status sai sem tocar em nada. O "tudo PASS" depende do resultado mais recente de cada device, então sai do
repositório: o `UPDATE` de `marcar_todos_aprovados` (spec 065) ganha um irmão de leitura,
`listar_todos_aprovados`, e os dois usam a mesma subconsulta. O `ImportacaoSdfServiceImpl`, depois de adicionar
os resultados e antes do único `commit`, define a origem Form Factor na auditoria, pergunta quais casos estão com
tudo PASS, aplica a regra em cada caso do relatório e grava só os que mudaram. O frontend invalida as consultas do
projeto ao fim da importação.

## Modelo de dados

Nenhuma mudança. O Status já tem `Done` e `InFixes` (specs 017 e 047), e o histórico já registra a origem.

## Contrato da API

Nenhuma rota nova. `POST /api/projetos/{id}/form-factor/importar` continua com o mesmo request e a mesma resposta;
muda só o efeito: os casos do relatório podem mudar de Status. Os erros continuam os da spec 060, e um relatório
recusado não muda nada.

## Backend: arquivos

- `src/domain/entities/caso_teste.py`: `aplicar_resultado_sdf`.
- `src/domain/entities/interfaces/caso_teste_repository.py` e
  `src/infrastructure/repositories/caso_teste_repository.py`: `listar_todos_aprovados`; a subconsulta passa a ser
  compartilhada com `marcar_todos_aprovados`.
- `src/application/services/importacao_sdf_service.py`: recebe `ContextoAuditoria`, aplica a regra antes do commit.
- `src/api/dependencies.py`: injeta `ContextoAuditoriaImpl` na importação.

## Frontend: arquivos

- `modules/projetos/hooks/useProjetos.ts`: `useImportarRelatorioSdf` invalida `["projetos", projetoId]`, o que cobre
  a tabela de Test Cases, o Board e as abas de Form Factor, além do histórico da General Results.
- O modo mock não muda: a importação mock não lê o arquivo nem grava resultados.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 a CA-06, CA-09, CA-10, CA-12, CA-14 | Unidade | `tests/unit/domain/test_caso_teste_status_sdf.py` (tabela de transições) |
| CA-07, CA-11 | Unidade | `test_importacao_sdf_service.py`: cada caso com a sua regra; relatório recusado não muda Status |
| CA-01, CA-02, CA-08 | Integração | `test_importacao_sdf_fluxo.py`: Status gravado e histórico com origem `form_factor` |
| CA-01, CA-03, CA-06 | Integração | `test_caso_teste_todos_aprovados.py`: `listar_todos_aprovados` |
| CA-13 | Unidade (Vitest) | `useProjetos.test.tsx`: a importação invalida as consultas do projeto |

## Riscos e decisões pendentes

- `caso_repo.atualizar` faz `merge` do caso inteiro. Ele roda antes do `UPDATE` de `marcar_todos_aprovados`, que dá
  `flush` primeiro; a ordem importa para o `all_passed_em` gravado pelo `UPDATE` não ser sobrescrito.
- Um relatório grande faz um `merge` por caso que muda. São no máximo as linhas do arquivo, uma vez por importação.
