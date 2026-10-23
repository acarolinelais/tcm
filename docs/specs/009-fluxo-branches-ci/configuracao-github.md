# 009. Configuração do GitHub: roteiro

Os passos abaixo exigem permissão **admin** em `acarolinelais/tcm` (quem implementou a spec tinha só
`write`). Rode com o `gh` autenticado como dona do repositório. Decisões: ADRs 0027 e 0028.

## 1. Branch padrão e forma de merge
A `dev` vira a branch padrão, para que um PR novo aponte para ela. Fica só o merge commit, e a branch
de trabalho é apagada depois do merge.

```bash
gh repo edit acarolinelais/tcm \
  --default-branch dev \
  --enable-merge-commit \
  --enable-squash-merge=false \
  --enable-rebase-merge=false \
  --delete-branch-on-merge
```

Conferir:
```bash
gh repo view acarolinelais/tcm --json defaultBranchRef,mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge
```

## 2. Ruleset de `main` e `dev` (aplicar quando houver plano com suporte)
> Repositório privado em conta pessoal exige **GitHub Pro** para rulesets. Hoje a limitação está aceita
> (ADR 0028): sem este passo, os checks ficam vermelhos, mas não bloqueiam o merge nem o push.

O ruleset exige PR e os três checks, bloqueia force-push e a exclusão da branch, e não exige aprovação:

```bash
gh api -X POST repos/acarolinelais/tcm/rulesets --input - <<'JSON'
{
  "name": "main e dev protegidas (ADR 0027/0028)",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main", "refs/heads/dev"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "backend" }, { "context": "frontend" }, { "context": "convencao" } ] } }
  ]
}
JSON
```

Conferir: `gh api repos/acarolinelais/tcm/rulesets`. Com o ruleset ativo, os nomes dos jobs (`backend`,
`frontend`, `convencao`) não podem mudar sem atualizar o ruleset.
