# 0033. Erros de planilha com código estruturado e texto montado no frontend

- **Status:** Aceito
- **Data:** 2026-10-24

## Contexto
A importação da planilha de Test Cases (spec 011) pode devolver centenas de problemas de uma vez. Hoje cada
problema sai como `{ campo: "linha.2.tc situation", mensagem: "Use To-Do, ..." }`: a chave técnica aparece na
tela, a mensagem fica sempre em português (ADR 0006) mesmo com a interface em inglês ou coreano, e o frontend não
consegue agrupar por linha nem mostrar o valor encontrado sem interpretar texto. A mesma validação também roda
no navegador, para a prévia, e os dois lados precisam falar a mesma língua.

## Decisão
- Erros de validação de planilha usam **membros de extensão** do ProblemDetails (RFC 9457) em cada item de
  `errors[]`: `codigo`, `linha` (nulo quando o problema é da planilha inteira), `coluna` (texto do cabeçalho),
  `valor` (texto encontrado, nulo se vazio) e `parametros` (dados extras da mensagem).
- O ProblemDetails da planilha traz também `total_linhas` (linhas de dados lidas).
- `campo` e `mensagem` continuam presentes, em português, para quem consome a API sem tradução (ADR 0006 segue
  valendo para todo o resto).
- O frontend monta o texto exibido a partir de `codigo` + dados, com uma chave i18n por código em en, pt e ko.
  A validação da prévia no navegador emite os mesmos códigos.
- Os códigos são um contrato: um código novo exige texto nos três idiomas e teste nos dois lados.

```json
{
  "title": "Planilha inválida.", "status": 422, "total_linhas": 120,
  "errors": [{
    "campo": "linha.5.tc id", "mensagem": "TC ID duplicado na planilha.",
    "codigo": "tc_id_duplicado", "linha": 5, "coluna": "TC ID", "valor": "Clock_001",
    "parametros": { "primeira_linha": 2 }
  }]
}
```

## Alternativas consideradas
- **Backend traduz conforme `Accept-Language` ou o idioma da conta (ADR 0025):** traria catálogo de tradução
  para o Python e duplicaria os textos que o frontend já mantém no i18n; a prévia no navegador continuaria
  precisando dos próprios textos.
- **Frontend interpreta `campo`/`mensagem` atuais:** depende de texto livre em português; qualquer ajuste de
  redação quebra a tela e não resolve valor encontrado nem linha original do duplicado.
- **Aplicar códigos estruturados a todos os erros da API agora:** resolveria de vez, mas toca todos os
  services e telas sem necessidade atual; fica para quando outra tela exigir.

## Consequências
- ✅ Mensagens no idioma da interface, agrupáveis por linha e com o valor que a pessoa digitou.
- ✅ Prévia (navegador) e importação (servidor) mostram exatamente o mesmo erro.
- ⚠️ Dois formatos de erro convivem: planilhas com código, o restante só com `campo`/`mensagem`.
- ⚠️ A lista de códigos precisa ficar sincronizada entre Python, TypeScript e i18n.
