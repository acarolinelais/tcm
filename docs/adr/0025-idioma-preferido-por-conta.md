# ADR 0025: Idioma preferido por conta

- **Status:** Aceito
- **Data:** 2026-10-23
- **Contexto:** Spec 007 — Internacionalização do frontend

## Contexto

O frontend precisa oferecer inglês, português brasileiro e coreano, mantendo o idioma escolhido pela
pessoa usuária ao acessar a conta em dispositivos diferentes. A aplicação também precisa continuar
permitindo a escolha de idioma antes da autenticação.

## Decisão

Persistir `idioma_preferido` na conta do usuário, com os códigos `en`, `pt-BR` e `ko`. Contas
existentes e novas usam `en` por padrão. A API autenticada expõe a preferência no perfil atual e
permite que cada pessoa altere somente a própria preferência.

Antes do login, a escolha é temporária no navegador e controla as telas de autenticação. Depois do
login, a preferência salva na conta prevalece e substitui a escolha temporária. A preferência não
altera sessão, perfil ou permissões.

## Alternativas consideradas

- **Salvar somente no navegador:** simples, mas a escolha não acompanha a pessoa entre dispositivos.
- **Inferir pelo idioma do sistema/navegador:** pode selecionar idioma inesperado e não respeita uma
  preferência explícita da conta.

## Consequências

- ✅ O idioma segue a conta e permanece consistente entre dispositivos.
- ✅ A interface antes da autenticação ainda pode ser usada em qualquer um dos idiomas suportados.
- ⚠️ A implementação requer coluna, migration, endpoint autenticado e atualização do perfil atual.
- ⚠️ Textos de sistema armazenados em catálogos precisam de códigos estáveis para selecionar suas
  traduções; conteúdo personalizado permanece no idioma em que foi cadastrado.
