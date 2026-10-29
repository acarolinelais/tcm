# 0040. Tema claro e escuro por classe no `<html>`, guardado no navegador

- **Status:** Aceito
- **Data:** 2026-10-29
- **Contexto:** Spec 034 — Tema claro e escuro
- **Relacionado:** ADR 0037 (HeroUI)

## Contexto
O HeroUI v3 (ADR 0037) já traz um tema escuro: seus tokens mudam quando o `<html>` tem a classe `dark` (ou
`data-theme="dark"`). Mas o `core/global.css` sobrescreve parte desses tokens em `:root`, fora de camada,
o que prende essas cores ao claro, e a variante `dark:` do HeroUI cai em `prefers-color-scheme` quando
não há classe. A spec 034 pede o claro como padrão mesmo com o sistema operacional escuro, a escolha
guardada no navegador (não na conta) e nenhuma piscada no tema errado ao carregar.

## Decisão
- O tema ativo é a classe `dark` no `<html>`. Sem a classe, vale o claro. É o seletor que o HeroUI já usa.
- Todo token sobrescrito em `:root` no `global.css` ganha o valor escuro num bloco `:root.dark`, também fora de
  camada (a especificidade maior que a de `:root` dispensa depender da ordem dos blocos).
- A variante `dark:` é redefinida no `global.css`, depois do import das variantes do HeroUI, **sem** o
  fallback de `prefers-color-scheme`: `@custom-variant dark (&:where(.dark, .dark *));`.
- A escolha fica em `localStorage`, na chave `sdf.theme`, com os valores `light` ou `dark`. Qualquer outro
  valor, ou a falta dele, significa claro. Leitura e escrita ficam em `try/catch`: se o armazenamento falhar,
  o tema muda só na sessão atual.
- Um script inline no `<head>` do `index.html` aplica a classe **antes** do CSS e do React, para não piscar:
  ```html
  <script>
    try { if (localStorage.getItem("sdf.theme") === "dark") document.documentElement.classList.add("dark"); } catch {}
  </script>
  ```
- Em React, o estado do tema vive em `core/theme/`, que lê, grava e aplica a classe.

## Alternativas consideradas
- **Guardar o tema na conta, como o idioma (ADR 0025):** acompanharia a pessoa entre dispositivos, mas exige
  coluna, migration e endpoint para uma preferência só visual. A spec escolheu o navegador.
- **Seguir `prefers-color-scheme`, como o HeroUI faz por padrão:** dispensa toggle, mas a spec exige o claro
  como padrão e escolha explícita.
- **Aplicar o tema só no React (`useEffect`):** mais simples, mas o primeiro quadro sai claro e pisca.
- **`data-theme="dark"` em vez da classe:** o HeroUI aceita os dois; a classe é o que a variante `dark:` do
  Tailwind e a maior parte da documentação usam.

## Consequências
- ✅ Trocar de tema é trocar uma classe: sem recarregar e sem perder estado da tela.
- ✅ Os componentes HeroUI já vêm com a versão escura; o trabalho fica nas telas e nos tokens próprios.
- ⚠️ O script inline duplica a chave e a regra de validação de `core/theme/`; as duas precisam andar juntas.
- ⚠️ A escolha não acompanha a pessoa em outro navegador ou dispositivo.
- ⚠️ Se uma CSP for adicionada, o script inline vai precisar de hash ou nonce.
