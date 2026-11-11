# 0055. Nome do idioma no próprio idioma

- **Status:** Aceito
- **Data:** 2026-11-11

## Contexto
O seletor de idioma (spec 007, ADR 0025) mostra os nomes em inglês: "English", "Portuguese" e "Korean". Quem está com a
interface em português lê "Portuguese" para o próprio idioma, e quem abriu a tela num idioma que não entende procura o
seu pelo nome em outra língua.

## Decisão
O seletor mostra cada idioma escrito nele mesmo, igual em qualquer idioma da interface: **Português**, **English** e
**한국어**. O nome não passa pela tradução.

```ts
export const languages = [
  { code: "en", label: "English", locale: "en-US" },
  { code: "pt-BR", label: "Português", locale: "pt-BR" },
  { code: "ko", label: "한국어", locale: "ko-KR" },
];
```

## Alternativas consideradas
- **Traduzir o nome para o idioma em uso (Inglês, Português, Coreano):** rejeitada. Quem caiu num idioma que não lê
  não acha o próprio.
- **Bandeiras:** rejeitada. Bandeira é de país, não de idioma, e não tem nome para o leitor de tela.

## Consequências
- ✅ Cada pessoa acha o próprio idioma em qualquer tela, inclusive no login.
- ⚠️ O nome do idioma em uso não acompanha o resto da interface (em português, "English" e "한국어" aparecem como estão).
