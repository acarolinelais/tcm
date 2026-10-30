# 036. Cor do avatar nas Configurações: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0004, 0005, 0006, 0010, 0012, 0013, 0025, 0030, 0037, 0040, 0041
- **ADRs novos propostos:** [0043](../../adr/0043-cor-do-avatar-por-conta.md) (cor do avatar por conta)

## Abordagem

Seguir o caminho do idioma (spec 007, ADR 0025). A conta ganha `cor_avatar`, com um código da paleta de 8
cores e `azul` como padrão. `GET /api/auth/me` devolve a cor, e `PATCH /api/auth/preferencias` passa a
aceitar atualização parcial (`idioma_preferido` e `cor_avatar` opcionais, pelo menos um obrigatório) e a
responder com as duas preferências salvas. No frontend, um `AvatarUsuario` compartilhado mostra a esfera do HeroUI
da cor escolhida, com o token da cor (ADR 0041) como fundo enquanto ela carrega, e substitui o avatar da `Navbar`, que deixa de usar a imagem padrão da spec
029. A tela de Configurações ganha um seletor de cor em HeroUI (ADR 0037), com atualização otimista do
cache de `/me` e rollback com toast em caso de erro, como o `LanguageSelector`. O modo mock (ADR 0030)
guarda a cor por usuário, como já guarda o idioma.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `Usuario` | `cor_avatar` | `VARCHAR(20)` | `azul`, `indigo`, `roxo`, `vermelho`, `laranja`, `verde`, `cinza` ou `cinza-claro`; não nulo; default `azul`; `CHECK` `ck_usuarios_cor_avatar` |

Migration nova com `down_revision = "d030a1b2c3d4"` (head atual, igual na `origin/dev`): adiciona a coluna
com `server_default="azul"` (as contas existentes ficam em azul) e a constraint; o `downgrade` remove as duas.

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/auth/me` | — | 200, inclui `cor_avatar` | 401 |
| PATCH | `/api/auth/preferencias` | `{ idioma_preferido?: "en" \| "pt-BR" \| "ko", cor_avatar?: CorAvatar }` | 200, `{ idioma_preferido, cor_avatar }` com os valores salvos | 401, 422 (cor fora da paleta, idioma inválido ou corpo sem nenhum campo) |

- Campo ausente não é alterado; `null` explícito é recusado com 422.
- A resposta vem do usuário salvo, não do request, para o frontend ter as duas preferências depois de uma
  atualização parcial.
- A rota continua usando `get_usuario_atual_para_troca_senha` e altera só a conta autenticada, no escopo da
  `unidade_id` (ADR 0013).

## Backend: arquivos

- **Novo** `domain/common/cor_avatar.py`: `CorAvatar(StrEnum)` com os 8 códigos.
- `domain/entities/usuario.py`: `cor_avatar = CorAvatar.AZUL` e `definir_cor_avatar()`.
- `infrastructure/data/models/usuario_model.py`: coluna e `CheckConstraint`.
- **Nova** migration `infrastructure/data/migrations/versions/<rev>_cor_avatar_por_conta.py`.
- `infrastructure/repositories/usuario_repository.py`: mapear `cor_avatar` no `to_entity`/`to_model`.
- `application/schemas/auth.py`: `AtualizarPreferenciasRequest` com campos opcionais e um
  `model_validator` que exige pelo menos um; `PreferenciasResponse` e `PerfilAtualResponse` com `cor_avatar`.
- `application/services/interfaces/auth_service.py` e `infrastructure/services/auth_service.py`:
  `atualizar_preferencias` aplica só os campos enviados, dá **um** commit e devolve `PreferenciasResponse`.
- `api/routers/auth.py`: o PATCH devolve o retorno do service; o `/me` lê `cor_avatar` junto com o idioma.
- Testes: `tests/unit/domain/` (padrão azul), `tests/unit/application/services/test_auth_service.py`
  (parcial, só cor, só idioma, usuário inexistente), `tests/integration/` (migration, default e constraint),
  `tests/functional/test_auth_api.py` (contrato, 401 e 422).

## Frontend: arquivos

- `core/global.css`: tokens `--avatar-1` a `--avatar-8` e `--avatar-N-foreground` em `:root` e `.dark`,
  expostos no `@theme inline`. Os valores são escolhidos para o contraste do CA-10. O token `--avatar` atual
  continua existindo enquanto houver uso.
- `core/auth/api.ts`: `CorAvatar` (união dos 8 códigos), `cor_avatar` em `PerfilAtual` e
  `atualizarCorAvatar()` sobre o mesmo `PATCH`.
- `core/mock/database.ts`: `corAvatarPorUsuario`, `cor_avatar` no `buildCurrentUser` (padrão `azul`) e
  `updateAvatarColor()`.
- **Novo** `shared/ui/avatar-usuario.tsx` (+ teste): HeroUI `Avatar` com `Avatar.Image` (esfera do HeroUI da cor)
  e `Avatar.Fallback` na cor do token; sem iniciais. O mapa cor → esfera e token fica em `shared/lib/cor-avatar.ts`.
  A função `iniciais` da spec 029 fica sem uso e sai.
- `core/layout/Navbar.tsx` (+ teste): usa `AvatarUsuario` com `perfil.cor_avatar`; sai a
  `AVATAR_PADRAO_URL`.
- **Novo** `modules/configuracoes/components/SeletorCorAvatar.tsx` (+ teste): `RadioGroup` do HeroUI com 8
  amostras redondas, rótulo "Cor do avatar", nome de cada cor como nome acessível e navegação por setas;
  atualização otimista do cache `["auth", "me", token]`, rollback e `toast.error` em falha.
- `modules/configuracoes/pages/ConfiguracoesPage.tsx` (+ teste): nova linha "Cor do avatar" abaixo do idioma.
- `core/i18n/resources`: chaves `settingsAvatarTitle`, `settingsAvatarHint`, `avatarColorSaveError` e os 8
  nomes de cor, em `en`, `pt-BR` e `ko`.
- **Novo** `e2e/cor-avatar.spec.ts`.

## Critérios de aceite → testes

| CA | Nível | Teste |
|---|---|---|
| CA-01 | Unidade (Vitest) | `SeletorCorAvatar`: renderiza 8 opções com nome acessível e marca a cor do perfil |
| CA-02 | Integração + funcional | migration/default: usuário novo e existente com `azul`; `GET /me` retorna `cor_avatar: "azul"` |
| CA-03 | Unidade (Vitest) + e2e | escolher verde atualiza o avatar da `Navbar` para `AL` sobre verde, sem reload |
| CA-04 | Funcional + e2e | `PATCH` com `verde` e depois `GET /me` retorna `verde`; e2e sai, entra e confere a cor |
| CA-05 | Funcional | trocar de `verde` para `azul` persiste `azul` |
| CA-06 | Integração | duas contas da mesma unidade: a troca de uma não altera a outra |
| CA-07 | Unidade (schema) + funcional | `PATCH` com `#ff0000`, `dourado`, `null` ou `{}` → 422 ProblemDetails; cor salva inalterada |
| CA-08 | Funcional | `PATCH` sem token → 401 e nenhuma chamada ao service |
| CA-09 | Unidade (Vitest) | API rejeita → toast de erro, seleção e avatar voltam para a cor anterior |
| CA-10 | Unidade (Vitest) | teste de contraste sobre os valores dos tokens nos dois temas (≥ 3:1 cor/fundo) e varredura do ADR 0041 passando |
| CA-11 | Unidade (Vitest) + e2e | grupo com rótulo, `aria-checked` na cor salva, troca com as setas e `Space` |

## Riscos e decisões pendentes

- **Atualização parcial do PATCH:** hoje o request exige `idioma_preferido`. Com os campos opcionais, um
  corpo `{}` passaria em silêncio; o `model_validator` recusa com 422. O `LanguageSelector` continua
  enviando só o idioma.
- **Fim da imagem padrão (spec 029):** os testes da `Navbar` que esperam a imagem mudam. O CA-00 da spec 029
  deixa de valer; fica registrado aqui e no ADR 0043.
- **Contraste da paleta:** tons claros somem sobre o fundo branco, por isso a paleta não tem amarelo e o escuro
  usa tons claros. O teste do CA-10 trava os valores.
- **Migration em paralelo:** se outra spec criar migration antes do merge, o `down_revision` muda para o novo
  head; conferir com `uv run alembic heads` antes do PR.
- **Branch:** o worktree está em `oazvedo/octopus`, atrás da `origin/dev` (ADR 0042 e spec 035). A spec deve
  ir para `feat/036-cor-avatar-configuracoes` saindo da `dev` atualizada.
