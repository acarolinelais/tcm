# ADR 0043: Cor do avatar por conta

- **Status:** Aceito
- **Data:** 2026-10-30
- **Contexto:** Spec 036 — Cor do avatar nas Configurações

## Contexto

Desde a spec 029, todas as pessoas veem o mesmo avatar na barra superior. A spec 036 permite escolher a cor
do avatar em Configurações, e a escolha precisa voltar em logins futuros e em outros dispositivos. O projeto
já tem dois jeitos de guardar uma preferência: o idioma fica na conta (ADR 0025) e o tema fica no navegador
(ADR 0040). É preciso decidir onde a cor fica e como ela é representada.

## Decisão

- Persistir `cor_avatar` na conta do usuário, como o idioma. O valor é um código de uma paleta fixa de 8
  cores: `azul`, `indigo`, `roxo`, `vermelho`, `laranja`, `verde`, `cinza` e `cinza-claro`, uma para cada
  esfera em degradê do HeroUI (`blue`, `indigo`, `purple`, `red`, `orange`, `green`, `black` e `white`). Contas
  existentes e novas usam `azul`.
- A cor sai em `GET /api/auth/me` e é alterada pelo mesmo `PATCH /api/auth/preferencias` do idioma, que
  passa a aceitar atualização parcial: cada campo é opcional, mas a requisição precisa ter pelo menos um.
  Cada pessoa altera somente a própria cor; a cor não muda sessão, perfil nem permissões.
- O backend guarda e valida só o **código**. A aparência é responsabilidade do frontend, que mapeia cada código
  para a esfera do HeroUI e para um token com valor nos dois temas (ADR 0041), nomeado por papel (`--avatar-1` a
  `--avatar-8`), usado como fundo enquanto a imagem não carrega. O avatar não mostra iniciais.

  ```ts
  const AVATAR_POR_COR = { azul: { imagem: `${ESFERAS_HEROUI}/blue.jpg`, fundo: "bg-avatar-1" }, /* ... */ };
  ```

## Alternativas consideradas

- **Guardar no navegador, como o tema (ADR 0040):** não volta em outro dispositivo nem depois de limpar os
  dados do navegador, e a spec exige que a cor acompanhe a conta.
- **Guardar o hexadecimal da cor:** permitiria cor livre, mas prende um valor visual ao banco, ignora o
  tema escuro e abre espaço para cores que somem sobre o fundo.
- **Endpoint próprio (`PATCH /api/auth/avatar`):** duplica a autenticação, o service e os testes de um
  fluxo de preferências que já existe.

## Consequências

- ✅ A cor segue a conta e fica igual em todos os dispositivos, como o idioma.
- ✅ Trocar o tom de uma cor ou ajustar o contraste no tema escuro é só mexer no CSS, sem migration.
- ⚠️ Requer coluna, migration com constraint e mudança do `PATCH /api/auth/preferencias` para atualização
  parcial; o frontend do idioma precisa continuar enviando só o próprio campo.
- ⚠️ Mudar a paleta (incluir ou tirar uma cor) exige migration da constraint e um novo ADR, e a paleta fica
  limitada às esferas que o HeroUI publica.
- ⚠️ As esferas vêm do CDN de assets do HeroUI, como na spec 029. Sem acesso a ele, o avatar mostra a cor lisa.
