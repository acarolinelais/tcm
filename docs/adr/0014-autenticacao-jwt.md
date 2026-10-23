# 0014. Autenticação com JWT

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
O sistema ainda não tem login (CLAUDE.md já previa isso como um ADR futuro). Hoje a empresa não tem a
API corporativa de autenticação de e-mail pronta para integrar; o usuário confirmou que, quando ela
existir, a autenticação em si vai migrar pra lá, mas o controle de usuário e perfil **continua sendo
interno** desta aplicação. A decisão de agora precisa funcionar sozinha e não travar essa troca futura.

## Decisão
**Separar "autenticar" de "quem é o usuário".** Uma interface de domínio decide só se a credencial é
válida; o resto (perfil, papel, unidade) é sempre local, não importa de onde veio a autenticação:
```python
# domain/entities/interfaces/autenticador.py
class Autenticador(Protocol):
    async def autenticar(self, email: str, senha: str) -> UUID | None: ...  # retorna o id do Usuario ou None
```
- **v1:** `AutenticadorLocal` (infrastructure) verifica e-mail + hash de senha (`argon2-cffi`) contra a
  tabela `usuarios`. Quando a API corporativa existir, um `AutenticadorCorporativo` novo implementa o
  mesmo `Protocol` chamando essa API — troca-se a implementação em `api/dependencies.py` (ADR 0003), sem
  mexer no domínio de usuário/perfil nem nos routers.
- **Login:** `POST /api/auth/login` recebe e-mail/senha, devolve um **JWT de acesso** (sem refresh token
  no v1 — simples de estudar, revisado num ADR novo se o produto precisar de sessões longas).
- **Claims do token:** `sub` (id do usuário), `unidade_id` (tenant, ADR 0013), `papel` (ADR 0015), `exp`.
  Assinado com `HS256` e uma chave em `JWT_SECRET_KEY` (variável de ambiente, nunca no repositório).
- **Validação:** uma dependency do FastAPI (`api/dependencies.py`) lê o header `Authorization: Bearer`,
  valida o JWT e injeta um `UsuarioAutenticado` (id, unidade_id, papel) nos routers que precisarem —
  igual ao padrão de `Depends` já usado pros services (ADR 0003).
- Senhas nunca ficam em texto puro nem reversível: só o hash Argon2.

## Alternativas consideradas
- **Integrar a API corporativa já no v1:** ela ainda não existe; esperar trava toda a feature sem motivo.
- **Sessão de servidor (cookie + store):** mais simples de revogar, mas acopla a API a estado de sessão
  num backend que hoje é stateless (ADR 0008); o frontend já é uma SPA separada, JWT combina melhor.
- **Refresh token já no v1:** mais seguro pra sessões longas, mas mais um fluxo pra implementar e testar
  antes de ter usuários reais; fica pra quando o login tiver uso de verdade.

## Consequências
- ✅ Trocar o provedor de autenticação no futuro é implementar um `Autenticador` novo, não reescrever
  usuário/perfil/permissão.
- ✅ Backend stateless combina com a SPA (ADR 0009) e com múltiplas instâncias no futuro.
- ⚠️ Token sem refresh expira e exige login de novo; aceitável no v1, revisar quando houver uso real.
- ⚠️ `JWT_SECRET_KEY` precisa de rotação manual se vazar — sem infraestrutura de rotação automática nesta
  escala.
