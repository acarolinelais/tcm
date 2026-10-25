# 015. Descrição do modelo no seletor de projetos: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0006, 0007, 0008, 0009, 0010, 0030
- **ADRs novos propostos:** nenhum

## Abordagem

A rota `GET /api/modelos-dispositivo/opcoes` passa a devolver `descricao` junto de `id` e `nome`. A
permissão e o filtro de modelos ativos continuam os da spec 014. No frontend, o componente compartilhado
`MultiSelectCombobox` aceita uma `description` opcional em cada opção e a mostra na mesma linha, depois
do nome, separada por um ` · ` decorativo e em `text-muted-foreground` (mais escura na linha destacada). As etiquetas dos itens selecionados e a busca
continuam usando só o `label` (o nome). A tela de Projetos passa a enviar a descrição ao montar as opções.
Quem já usa o componente sem `description` não muda.

## Modelo de dados

Sem mudança de banco. Só o contrato da rota `/opcoes` muda.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/modelos-dispositivo/opcoes` | `page`, `page_size` (≤100), `busca?` | 200 `PagedResult<{ id, nome, descricao }>`, só ativos | 401, 403 sem `projetos.gerenciar` nem `modelos_dispositivo.gerenciar` |

`descricao` vem `null` quando o modelo não tem descrição.

## Backend: arquivos

- `src/application/schemas/modelo_dispositivo.py`: `descricao` em `ModeloDispositivoOpcaoResponse` e em
  `to_opcao_response`.
- `tests/unit/application/services/test_modelo_dispositivo_service.py` e
  `tests/functional/test_modelos_dispositivo_api.py`: as opções trazem a descrição, e o 403 do dev continua.

## Frontend: arquivos

- `src/shared/ui/multi-select-combobox.tsx`: `description?: string | null` na `Option`, exibida depois do
  nome só na lista de opções.
- `src/shared/ui/multi-select-combobox.test.tsx` (novo): a opção com descrição mostra os dois textos; a
  sem descrição não mostra o separador; a etiqueta selecionada mostra só o nome.
- `src/modules/projetos/model/projeto.ts`: `descricao` em `OpcaoModeloDispositivo`.
- `src/modules/projetos/ProjetosPage.tsx` e `ProjetosPage.test.tsx`: `description: model.descricao` nas
  opções.
- `src/core/mock/database.ts` e `database.test.ts`: `listarOpcoes` devolve a descrição.
- `e2e/projetos-fixtures.ts`: a fixture de `/opcoes` passa a ter `descricao`.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Funcional + Vitest | `test_gerente_lista_opcoes_ativas` (com descrição); `multi-select-combobox.test.tsx` e `ProjetosPage.test.tsx` (opção com descrição) |
| CA-02 | Vitest | `multi-select-combobox.test.tsx` (opção sem descrição, sem separador) |
| CA-03 | Vitest | `multi-select-combobox.test.tsx` (etiqueta só com o nome) |
| CA-04 | Unidade + funcional (falha) | `test_dev_nao_lista_opcoes`, `test_dev_recebe_403_nas_opcoes` (já existem) |

## Riscos e decisões pendentes

- O nome acessível da opção passa a incluir a descrição. O separador `·` é só visual (`aria-hidden`), então
  o leitor de tela anuncia "SM-9292 Galaxy S27 Ultra". Testes e e2e que procuram a opção pelo nome exato
  precisam incluir a descrição.
- Nome e descrição longos quebram a linha em vez de serem cortados, para continuarem legíveis no popup,
  que tem a largura do campo.
