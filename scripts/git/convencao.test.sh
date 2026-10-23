#!/bin/sh
# Casos de sucesso e falha de convencao.sh (ADR 0010). Uso: sh scripts/git/convencao.test.sh
set -u

SCRIPT="$(cd "$(dirname "$0")" && pwd)/convencao.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
erros=0

# espera <ok|falha> <descrição> <args de convencao.sh...>
espera() {
  esperado=$1 descricao=$2
  shift 2
  if sh "$SCRIPT" "$@" >"$TMP/saida" 2>&1; then obtido=ok; else obtido=falha; fi
  if [ "$obtido" = "$esperado" ]; then
    printf 'ok    %s\n' "$descricao"
  else
    printf 'ERRO  %s (esperado %s, obtido %s)\n' "$descricao" "$esperado" "$obtido"
    sed 's/^/      /' "$TMP/saida"
    erros=$((erros + 1))
  fi
}

# saida_contem <descrição> <texto>: confere a saída do último `espera`
saida_contem() {
  if grep -qF "$2" "$TMP/saida"; then
    printf 'ok    %s\n' "$1"
  else
    printf 'ERRO  %s (saída sem "%s")\n' "$1" "$2"
    erros=$((erros + 1))
  fi
}

mensagem() {
  printf '%s\n# comentário do git\n' "$2" >"$TMP/msg"
  espera "$1" "mensagem '$2'" mensagem "$TMP/msg"
}

echo '# mensagem'
mensagem ok 'feat(usuarios): filtra por perfil'
mensagem ok 'fix: corrige idioma no login'
mensagem ok 'refactor(api)!: renomeia rota de times'
mensagem ok "Merge pull request #1 from acarolinelais/feat/009-x"
mensagem ok 'Revert "feat: x"'
mensagem falha 'Feat: Abluble'
saida_contem 'mensagem inválida mostra o formato esperado' 'Formato esperado'
mensagem falha 'feat:sem espaço'
mensagem falha 'update stuff'
mensagem falha 'hotfix: corrige login'
mensagem falha ''

echo '# branch'
for b in feat/009-x fix/login hotfix/corrige-login docs/adr-0027; do espera ok "branch $b" branch "$b"; done
for b in main dev feature/abluble minha-branch feat/sem-numero fix/Maiuscula; do
  espera falha "branch $b" branch "$b"
done

echo '# pr-titulo'
espera ok 'pr-titulo válido' pr-titulo 'feat(ci): adiciona workflow'
espera falha 'pr-titulo inválido' pr-titulo 'Adiciona workflow'

echo '# spec'
espera ok 'spec feat/009-x (pasta 009 existe)' spec feat/009-x
espera ok 'spec fix/x (não se aplica)' spec fix/x
espera falha 'spec feat/099-x (spec inexistente)' spec feat/099-x

echo '# pr'
repo="$TMP/repo"
git init -q -b main "$repo"
(
  cd "$repo" || exit 1
  git config user.name teste
  git config user.email teste@exemplo.com
  git commit -q --allow-empty -m 'chore: inicial'
  git switch -q -c feat/009-x
  git commit -q --allow-empty -m 'feat: primeiro bloco'
  git switch -q main
  git merge -q --no-ff --no-edit feat/009-x
  git switch -q -c fix/abluble
  git commit -q --allow-empty -m 'Feat: Abluble'
)
base=$(git -C "$repo" rev-parse main~1)
valido=$(git -C "$repo" rev-parse main)
invalido=$(git -C "$repo" rev-parse fix/abluble)
sha_invalido=$(git -C "$repo" rev-parse --short fix/abluble)

cd "$repo" || exit 1
espera ok 'pr main <- dev' pr main dev "$base" "$valido"
espera ok 'pr main <- hotfix/x' pr main hotfix/x "$base" "$valido"
espera ok 'pr dev <- main' pr dev main "$base" "$valido"
espera ok 'pr dev <- feat/009-x, range com merge commit' pr dev feat/009-x "$base" "$valido"
espera falha 'pr main <- feat/009-x' pr main feat/009-x "$base" "$valido"
espera falha 'pr dev <- hotfix/x' pr dev hotfix/x "$base" "$valido"
espera falha 'pr dev <- branch fora do padrão' pr dev feature/abluble "$base" "$valido"
espera falha 'pr com commit Feat: Abluble' pr dev fix/abluble "$valido" "$invalido"
saida_contem 'commit inválido aparece com o SHA' "$sha_invalido Feat: Abluble"

echo
if [ "$erros" -eq 0 ]; then echo 'Todos os casos passaram.'; else echo "$erros caso(s) falharam."; exit 1; fi
