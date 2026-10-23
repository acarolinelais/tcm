# ADR 0024: Responsável direto por usuários criados por gerente

- **Status:** Aceito
- **Data:** 2026-10-23
- **Contexto:** Spec 006 — Administração da unidade

## Contexto

Gerentes precisam criar contas de usuário padrão e administrar as pessoas pelas quais respondem.
O vínculo a times não identifica necessariamente quem cadastrou a conta e não deve conceder gestão
administrativa da conta.

## Decisão

Adicionar `usuarios.responsavel_id`, uma chave estrangeira opcional para `usuarios.id`. Quando um
gerente cria uma conta, a API grava seu próprio ID como responsável e atribui o perfil da unidade
identificado pelo código estável `USUARIO_PADRAO`, independentemente de `perfil_id` enviado pelo
cliente. A conta responsável pode ser consultada, editada, ativada e inativada pelo gerente.

O administrador pode atribuir, transferir ou remover o responsável. O alvo deve ser um gerente ativo
da mesma unidade. A troca do responsável revoga imediatamente a gestão da conta pelo gerente anterior.
O backend valida ownership em cada operação; a interface não é a fronteira de autorização.

## Consequências

- O escopo de `usuarios.gerenciar` para gerentes é limitado por `responsavel_id`.
- Contas podem permanecer sem responsável, inclusive contas preexistentes até atribuição explícita.
- O vínculo não muda ao editar o nome/e-mail e não é removido ao inativar a conta.
- `responsavel_id` não substitui o perfil de permissões nem associações gerente-setor.
