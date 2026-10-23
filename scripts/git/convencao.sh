#!/bin/sh
# Regras de branches e commits do ADR 0027. Chamado pelos hooks em .githooks/ (ADR 0029)
# e pelo job `convencao` do CI (ADR 0028). Sai com código 1 e explica o erro quando algo
# está fora do padrão.
#
# Uso:
#   convencao.sh mensagem <arquivo>                     # commit-msg
#   convencao.sh branch <nome>                          # branch de trabalho onde se commita
#   convencao.sh pr <base> <head> <base-sha> <head-sha> # origem do PR e commits do range
#   convencao.sh pr-titulo <titulo>
#   convencao.sh spec <head>                            # feat/NNN-... exige docs/specs/NNN-*
set -eu

TIPOS='feat|fix|docs|chore|refactor|test|style|perf|ci|build'
REGEX_MENSAGEM="((($TIPOS)(\([a-z0-9._-]+\))?!?: .+)|(Merge|Revert) .+)$"
TIPOS_TEXTO=$(printf '%s' "$TIPOS" | sed 's/|/, /g')
FORMATO_MENSAGEM="Formato esperado: tipo(escopo opcional): descrição
  tipos: $TIPOS_TEXTO
  ex.: feat(usuarios): filtra por perfil"
FORMATO_BRANCH="Formato esperado: <tipo>/<descricao-em-kebab-case>, criada a partir da dev
  tipos: $TIPOS_TEXTO (ou hotfix/, a partir da main)
  feat/ começa com o número da spec: feat/009-fluxo-branches-ci"

falha() {
  printf '%s\n' "$@" >&2
  exit 1
}

mensagem_valida() {
  printf '%s\n' "$1" | grep -Eq "^$REGEX_MENSAGEM"
}

valida_branch() {
  case "$1" in
    main | dev) falha "Não commite direto na '$1'. Crie uma branch de trabalho a partir da dev." ;;
    feat/[0-9][0-9][0-9]-*) ;;
    feat/*) falha "Branch '$1': feat/ precisa começar com o número da spec." "$FORMATO_BRANCH" ;;
  esac
  printf '%s\n' "$1" | grep -Eq "^($TIPOS|hotfix)/[a-z0-9][a-z0-9._-]*$" ||
    falha "Branch '$1' fora do padrão." "$FORMATO_BRANCH"
}

valida_origem_pr() {
  base=$1 head=$2
  case "$base" in
    main)
      case "$head" in
        dev | hotfix/*) ;;
        *) falha "A main só aceita PR da dev ou de hotfix/* (recebido: '$head')." ;;
      esac ;;
    dev)
      case "$head" in
        main) ;;
        hotfix/*) falha "hotfix/* vai para a main. A correção chega à dev pelo PR main → dev." ;;
        *) valida_branch "$head" ;;
      esac ;;
  esac
}

valida_commits() {
  invalidos=$(git log --no-merges --format='%h %s' "$1..$2" |
    grep -Ev "^[0-9a-f]+ $REGEX_MENSAGEM" | sed 's/^/  /') || true
  [ -z "$invalidos" ] || falha "Commits fora do padrão:" "$invalidos" "$FORMATO_MENSAGEM"
}

valida_spec() {
  case "$1" in
    feat/*) ;;
    *) return 0 ;;
  esac
  numero=${1#feat/}
  numero=${numero%%-*}
  for pasta in "$(git rev-parse --show-toplevel)"/docs/specs/"$numero"-*; do
    [ -d "$pasta" ] && return 0
  done
  falha "Branch '$1': não existe docs/specs/$numero-*. Crie a spec antes (skill spec)."
}

comando=${1:-}
[ $# -gt 0 ] && shift
case "$comando" in
  mensagem)
    assunto=$(sed -n '/^#/!{p;q;}' "$1")
    mensagem_valida "$assunto" || falha "Mensagem fora do padrão: '$assunto'" "$FORMATO_MENSAGEM" ;;
  branch) valida_branch "$1" ;;
  pr)
    valida_origem_pr "$1" "$2"
    valida_commits "$3" "$4" ;;
  pr-titulo)
    mensagem_valida "$1" || falha "Título do PR fora do padrão: '$1'" "$FORMATO_MENSAGEM" ;;
  spec) valida_spec "$1" ;;
  *) falha "Uso: $0 {mensagem|branch|pr|pr-titulo|spec} ..." ;;
esac
