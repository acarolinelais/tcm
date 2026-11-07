# 042. Troca de senha e redefinição pelo administrador: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0006, 0010, 0013, 0015, 0018, 0019, 0020, 0023, 0030, 0037, 0047
- **ADRs novos propostos:** nenhum

## Abordagem
A troca da própria senha é uma rota nova em `/api/auth`, no `AuthServiceImpl`, ao lado da troca inicial: as duas
compartilham o passo de gravar o hash, subir o `auth_version`, revogar as outras sessões e rotacionar a sessão
em uso (ADR 0020). A diferença é que a nova confere a senha atual pelo `Autenticador` em vez de exigir a troca
obrigatória. A redefinição pelo admin é uma ação do `UsuarioServiceImpl`, que já recebe `SENHA_INICIAL_USUARIOS`
para o cadastro: grava o hash da senha padrão, liga `senha_alteracao_obrigatoria` e sobe o `auth_version`, o que
derruba os access tokens e as sessões da pessoa (ADR 0019 e 0020). No frontend, a página Configurações abre um
`SideDrawer` com o formulário de troca, a tabela de usuários ganha a ação Redefinir senha com `AlertConfirm`, e o
login mostra o aviso para quem esqueceu a senha. O modo mock (ADR 0030) ganha as duas operações.

## Modelo de dados
Sem mudança. Usa `usuarios.senha_hash`, `usuarios.senha_alteracao_obrigatoria` e `usuarios.auth_version`, e
`auth_sessoes`, que já existem. Sem migration.

## Contrato da API
| Verbo | Rota | Request | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/auth/alterar-senha` | `{ senha_atual, nova_senha }` | 200 `TokenResponse` + cookie `sdf_refresh` rotacionado | 401 sem sessão; 403 se a troca inicial ainda é obrigatória; 422 senha atual incorreta ou campo vazio |
| PATCH | `/api/usuarios/{id}/redefinir-senha` | — | 200 `{ senha_padrao }` | 401; 403 se quem chama não é admin da unidade ou é a própria conta; 404 usuário inexistente ou de outra unidade; 503 sem `SENHA_INICIAL_USUARIOS` |

A senha padrão volta na resposta porque a tela precisa mostrá-la ao admin (RN-06) e o frontend não conhece o
valor configurado no servidor.

## Backend: arquivos
- `src/application/schemas/auth.py`: `TrocarPropriaSenhaRequest` (`senha_atual`, `nova_senha`, 1 a 128 caracteres).
- `src/application/schemas/usuario.py`: `RedefinirSenhaResponse` (`senha_padrao`).
- `src/application/services/interfaces/auth_service.py` e `usuario_service.py`: os métodos novos na interface.
- `src/infrastructure/services/auth_service.py`: `alterar_propria_senha(usuario_id, sessao_id, request)`; o passo
  comum com `alterar_senha_inicial` vira um método privado.
- `src/application/services/usuario_service.py`: `redefinir_senha(usuario_atual, id)`. Só `eh_administrador`
  (o gerente tem `usuarios.gerenciar`, mas não redefine), recusa a própria conta e busca a pessoa pela unidade de
  quem chama (ADR 0013).
- `src/api/routers/auth.py` e `src/api/routers/usuarios.py`: as duas rotas.
- Testes: unidade do `UsuarioServiceImpl`, funcionais das duas rotas e integração do `AuthServiceImpl` com Postgres.

## Frontend: arquivos
- `core/auth/api.ts`: `alterarPropriaSenha(senhaAtual, novaSenha)`, que salva os tokens novos.
- `core/auth/TrocarSenhaDrawer.tsx` (novo): `SideDrawer` com senha atual, nova e confirmação, react-hook-form + zod
  (confirmação igual à nova). A senha atual incorreta (422) vira erro no campo.
- `modules/configuracoes/pages/ConfiguracoesPage.tsx`: linha Senha com o botão Trocar senha, que abre o painel.
  No começo o item ficava no menu da conta (`core/layout/Navbar.tsx`), acima de Sair.
- `modules/usuarios/api/usuario.api.ts` e `hooks/useUsuarios.ts`: `redefinirSenha(id)` e a mutation.
- `modules/usuarios/components/UsuariosTable.tsx`: ação Redefinir senha (ícone `KeyRound`) só para admin e fora da
  própria linha; `AlertConfirm` para confirmar e, depois, o mesmo diálogo mostra a senha padrão para repassar.
- `core/auth/LoginPage.tsx`: o aviso "Esqueceu a senha? Fale com o administrador da sua unidade".
- `core/mock/database.ts`: `mockAuth.changeOwnPassword` e `mockUsers.resetPassword`, com as mesmas regras.
- `core/i18n/resources.ts`: os textos novos em português, inglês e coreano.
- e2e: `e2e/trocar-senha.spec.ts` (troca da própria senha) e `e2e/usuarios.spec.ts` (redefinir), com a API simulada.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01 | Integração | `test_alterar_propria_senha_troca_o_hash_e_o_login_antigo_falha` |
| CA-02 | Funcional | `test_alterar_senha_admin_logado_retorna_200` |
| CA-03 | Integração | `test_alterar_propria_senha_revoga_outras_sessoes_e_mantem_a_atual` |
| CA-04 | Unidade | `test_redefinir_senha_volta_para_a_padrao_com_troca_obrigatoria` |
| CA-04 | e2e | redefinir na lista de usuários mostra a senha padrão |
| CA-05 | Unidade | `test_redefinir_senha_sobe_auth_version` |
| CA-06 | Funcional | `test_alterar_senha_atual_incorreta_retorna_422` |
| CA-06 | Componente | `TrocarSenhaDrawer` mostra o erro no campo da senha atual |
| CA-07 | Componente | `TrocarSenhaDrawer` não envia com confirmação diferente |
| CA-08 | Unidade | `test_redefinir_senha_gerente_recebe_forbidden` |
| CA-08 | Componente | `UsuariosTable` sem a ação para gerente |
| CA-09 | Unidade | `test_redefinir_senha_outra_unidade_retorna_not_found` |
| CA-10 | Unidade | `test_redefinir_senha_propria_conta_recebe_forbidden` |
| CA-10 | Componente | `UsuariosTable` sem a ação na linha do próprio admin |

## Riscos e decisões pendentes
- A senha padrão é conhecida: entre a redefinição e o próximo acesso da pessoa, quem souber disso entra na conta.
  A troca obrigatória limita a janela, não a elimina.
- Se `SENHA_INICIAL_USUARIOS` não estiver configurada, redefinir responde 503, como o cadastro de usuário já faz.
- Erro de senha atual com 422, e não 401, para o cliente HTTP não tratar como sessão expirada.
