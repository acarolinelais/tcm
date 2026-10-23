# 007. Internacionalização do frontend: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0002, 0004, 0006, 0025

## Abordagem

Usar `i18next` e `react-i18next` como catálogo e integração React. O catálogo base será inglês, com
recursos organizados por áreas da interface (`common`, `auth`, `users`, `profiles`, `sectors`,
`teams` e `overview`); `pt-BR` e `ko` cobrirão as mesmas chaves. A integração oficial expõe a função
de tradução e a troca de idioma nos componentes React, com fallback configurável para inglês.
[Documentação oficial do hook](https://react.i18next.com/latest/usetranslation-hook) ·
[guia de instalação/configuração](https://react.i18next.com/getting-started).

Persistir `idioma_preferido` na conta e incluí-lo em `/api/auth/me`. Criar endpoint autenticado
`PATCH /api/auth/preferencias` para alterar somente a preferência da própria pessoa, sem invalidar
sessões ou afetar permissões. Uma migration define `en` para contas existentes e novas. Antes do
login, manter o idioma selecionado apenas na sessão do navegador; após o login, substituir pelo
idioma retornado da conta. Na tela de troca obrigatória de senha, a conta já autenticada continua
podendo mudar seu idioma.

O frontend usa chaves estáveis de tradução para textos de interface, catálogos e nomes de perfis de
sistema. Códigos de módulos, permissões e perfis seedados identificam as traduções; rótulos de perfis
customizados e dados escritos pela unidade continuam no idioma original. As mensagens de erro exibidas
na UI são formatadas a partir do tipo/código HTTP e do contexto da operação, sem apresentar detalhes
da API em outro idioma. Datas e números usam `Intl` com locale derivado do idioma ativo.

## Modelo de dados

| Entidade | Campo | Tipo | Regras |
|---|---|---|---|
| `Usuario` | `idioma_preferido` | `VARCHAR(5)` | `en`, `pt-BR` ou `ko`; default `en`; não nulo |

## Contrato da API

| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/auth/me` | — | Inclui `idioma_preferido` | 401 |
| PATCH | `/api/auth/preferencias` | `{ idioma_preferido: "en" \| "pt-BR" \| "ko" }` | `{ idioma_preferido }` | 401, 422 |

O endpoint aceita apenas códigos suportados e altera somente a conta autenticada. A dependência de
autenticação deve permitir a chamada durante o fluxo de troca obrigatória da senha.

## Backend: arquivos e responsabilidades

- `domain/entities/usuario.py`, `application/schemas/auth.py` — tipo/validação dos idiomas e resposta
  de preferência.
- `infrastructure/data/models/usuario_model.py` e nova migration — coluna não nula, default `en` e
  constraint para os três códigos suportados.
- `domain/entities/interfaces/usuario_repository.py` e `infrastructure/repositories/usuario_repository.py`
  — persistir preferência no escopo da conta/unidade autenticada.
- `application/services/interfaces/auth_service.py`, `infrastructure/services/auth_service.py` e
  `api/routers/auth.py` — atualizar preferência autenticada e disponibilizar idioma em `/me`.
- Testes — migration/seed, códigos inválidos, isolamento por conta, troca de preferência e inclusão
  no perfil autenticado.

## Frontend: arquivos e responsabilidades

- Dependências e `src/core/i18n/` — configuração do i18next, recursos dos três idiomas, fallback
  inglês, locale para `Intl` e integração tipada de chaves.
- `src/main.tsx` e providers — carregar recursos antes de renderizar conteúdo traduzível e evitar
  flash de chaves ou idioma incorreto.
- `core/auth/` — preferência temporária antes do login; depois do login, aplicar `idioma_preferido`
  retornado por `/api/auth/me`.
- `core/layout/Navbar.tsx` — seletor acessível com rótulos English, Portuguese e Korean; ao trocar,
  alterar UI e persistir no endpoint; em falha, reverter a seleção e notificar no idioma ativo.
- `core/auth/LoginPage.tsx` e `AlterarSenhaPage.tsx` — traduções e seletor de idioma antes/depois da
  autenticação.
- Todas as páginas, módulos, componentes compartilhados, formulários, validações, tabelas, menus,
  diálogos, toasts, textos acessíveis e erros — substituir strings literais por chaves.
- `modules/perfis/` — resolver nome de módulo, descrição de permissão e nome de perfil de sistema por
  códigos estáveis; não traduzir valores customizados da unidade.
- Testes de interface — troca de idioma, persistência por conta após login/logout/dispositivo,
  cobertura das chaves e fallback de inglês.

## Critérios de aceite → testes

| CA | Nível | Verificação |
|---|---|---|
| CA-01, CA-03, CA-05 | Integração/API | Usuários existentes e novos recebem `en`; `/me` retorna preferência da conta após login |
| CA-02, CA-04 | Componente/E2E | Seletor atualiza idioma sem reload; estado pré-login traduz o formulário; idioma da conta prevalece após login |
| CA-06, CA-10 | Varredura/componente | Nenhuma string de interface fora dos catálogos; nomes acessíveis traduzidos nos três idiomas |
| CA-07 | Unitário/API | Erros HTTP e validações conhecidos produzem mensagens da UI no idioma ativo |
| CA-08 | Unitário/componente | Datas, horas e números formatados com `Intl` para cada locale |
| CA-09 | Unitário | Chave ausente retorna tradução inglesa e é identificada em desenvolvimento |
| CA-11 | Regressão | Trocar idioma não modifica perfil, permissões ou autorização da sessão |

## Riscos e decisões pendentes

- A preferência de conta e o idioma temporário de login precisam ter precedência clara para evitar
  alternância visual após autenticação; a preferência da conta prevalece após login.
- A migração de todas as strings é extensa. O trabalho será dividido por áreas, com inglês como
  fallback durante o rollout e a cobertura só será considerada concluída quando não houver texto
  estático de interface fora dos recursos.
- As mensagens de validação do backend atualmente incluem textos localizados. O frontend deverá
  traduzir mensagens conhecidas por contexto/status e usar uma mensagem genérica localizada quando
  não puder identificar um caso específico.
- O locale coreano é `ko`; datas e números devem seguir `ko-KR` no `Intl`.
