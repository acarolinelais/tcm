# 0035. Commits diretos na `dev`

- **Status:** Aceito
- **Data:** 2026-10-25

## Contexto
O ADR 0027 proíbe commit e push direto na `dev` e na `main`. Os hooks (ADR 0029) e o ruleset do
GitHub (ADR 0028) aplicam essa regra. Na prática, toda mudança, mesmo um ajuste de uma linha, exige
branch, PR e espera do CI antes de chegar à `dev`, e o próprio ADR 0027 registrou esse custo. A `dev`
é a branch de integração, não a estável: o que protege o código estável é a `main`, que continua
recebendo só PR.

## Decisão
- A `dev` **aceita commit e push direto**. Os hooks `pre-commit` e `pre-push` deixam de recusar a `dev`.
- A `main` não muda: só recebe PR vindo da `dev` ou de `hotfix/*`, sem commit nem push direto.
- Branch de trabalho com PR para a `dev` continua sendo o caminho padrão para implementar uma spec
  (`feat/NNN-...`), porque o PR liga a mudança à spec e roda o CI antes da integração. O commit direto
  serve para mudanças pequenas que não precisam de revisão nem de spec.
- As mensagens de commit continuam em Conventional Commits, inclusive na `dev`. O hook `commit-msg`
  segue valendo e o job `convencao` passa a rodar também em `push` para a `dev`, validando as mensagens
  dos commits que chegaram.
- O `ci.yml` já roda `backend` e `frontend` em `push` para a `dev`. Um commit direto que quebre a `dev`
  aparece no CI depois do push, e a correção vai em um novo commit.
- O ruleset da `dev` deixa de exigir PR e checks verdes. Continua bloqueando force-push e exclusão.

```
git switch dev && git pull
git commit -m "fix(projetos): corrige rótulo do filtro"
git push            # aceito; o CI roda depois do push
```

## Alternativas consideradas
- **Manter a regra do ADR 0027:** mantém a `dev` sempre verificada antes da integração, mas o custo de
  branch e PR para ajustes pequenos foi justamente o que motivou esta mudança.
- **Liberar commit direto também na `main`:** a `main` é a referência estável. Sem PR, perde o único
  ponto em que a `dev` é verificada como um todo antes de virar estável.
- **Liberar a `dev` só para alguns tipos (`docs`, `chore`, `style`):** a regra ficaria mais difícil de
  explicar e de aplicar no script, e um `fix` pequeno continuaria precisando de PR.

## Consequências
- ✅ Ajustes pequenos chegam à `dev` sem branch, PR e espera do CI.
- ✅ A `main` mantém a mesma proteção: só recebe código que passou pela `dev`.
- ⚠️ A `dev` pode ficar vermelha entre um push direto quebrado e a correção, e outras pessoas podem puxar
  esse estado. A verificação passa a ser depois da integração, não antes.
- ⚠️ Commits diretos não têm PR: não há link para spec nem descrição de "como verifiquei". Por isso o
  caminho padrão das specs continua sendo branch e PR.
- ⚠️ A verificação das mensagens de commit no CI, para push direto, só acontece depois que o commit já
  está na `dev`. Uma mensagem fora do padrão não pode mais ser recusada ali; só corrigida com um novo
  commit, sem reescrever o histórico.
