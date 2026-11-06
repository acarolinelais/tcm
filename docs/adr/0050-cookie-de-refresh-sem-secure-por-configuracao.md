# 0050. Cookie de refresh sem `Secure` por configuração

- **Status:** Aceito
- **Data:** 2026-11-06
- **Relacionado:** ADR 0049
- **Substitui em parte:** [0047](0047-refresh-token-em-cookie-httponly.md), só a regra do atributo `Secure`

## Contexto

O ADR 0047 manda o cookie `sdf_refresh` com `Secure` fora do ambiente local. O navegador só guarda um
cookie `Secure` em HTTPS ou em `localhost`. No deploy do ADR 0049 o sistema é acessado por
`http://<servidor>:5173`, sem certificado. Com `Secure`, o login funciona, mas o refresh nunca chega:
a pessoa volta para o login a cada 15 minutos e em toda aba nova.

## Decisão

- O atributo `Secure` do cookie `sdf_refresh` vem da variável `COOKIE_SECURE`. O padrão é `true`;
  só o valor `false` tira o atributo.
- O `deploy/.env` do ADR 0049 usa `COOKIE_SECURE=false`. Quem servir o sistema por HTTPS muda para
  `true`.
- `HttpOnly`, `SameSite=Strict`, `Path=/api/auth` e `Max-Age` continuam como no ADR 0047.

```python
def _cookie() -> dict:
    secure = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
    return {"path": "/api/auth", "secure": secure, "httponly": True, "samesite": "strict"}
```

## Alternativas consideradas

- **HTTPS com certificado autoassinado no nginx do deploy:** mantém o `Secure`, mas o navegador mostra
  o aviso de site não seguro para cada pessoa do time. Foi descartado por decisão do usuário.
- **HTTPS com domínio e certificado válido:** é o certo para expor o sistema, mas o servidor ainda não
  tem domínio nem certificado.

## Consequências

- ✅ A sessão de 10 horas e as abas novas funcionam no acesso por HTTP.
- ✅ Sem a variável, o comportamento é o do ADR 0047.
- ⚠️ Sem HTTPS, o refresh token e o access token trafegam sem criptografia. Quem estiver na mesma rede
  consegue capturá-los. Só é aceitável numa rede interna confiável.
- ⚠️ Ao ganhar HTTPS, alguém precisa lembrar de voltar `COOKIE_SECURE` para `true`.
