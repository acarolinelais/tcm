#!/usr/bin/env bash
# Sobe ou atualiza o TCM no servidor (ADR 0049). Uso: bash deploy.sh
set -euo pipefail

cd "$(dirname "$0")"
ENV_FILE=deploy/.env
COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file "$ENV_FILE")

falhar() { echo "Erro: $1" >&2; exit 1; }

command -v docker >/dev/null || falhar "Docker não encontrado. Instale o Docker antes de continuar."
docker compose version >/dev/null 2>&1 || falhar "Plugin Docker Compose não encontrado (comando 'docker compose')."
docker info >/dev/null 2>&1 || falhar "Sem acesso ao Docker. Rode com sudo ou adicione seu usuário ao grupo docker."

aleatorio() { od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'; }

primeira_vez=false
if [ ! -f "$ENV_FILE" ]; then
  primeira_vez=true
  cat > "$ENV_FILE" <<EOF
# Gerado pelo deploy.sh em $(date '+%Y-%m-%d %H:%M'). Não commitar.
WEB_PORT=5173
API_PORT=8080
POSTGRES_HOST_PORT=5544

POSTGRES_DB=tcm
POSTGRES_USER=tcm
POSTGRES_PASSWORD=$(aleatorio 24)

JWT_SECRET_KEY=$(aleatorio 32)
BOOTSTRAP_ADMIN_SENHA=$(aleatorio 6)
SENHA_INICIAL_USUARIOS=$(aleatorio 6)

# Acesso por HTTP sem certificado (ADR 0050). Mude para true se o sistema passar a usar HTTPS.
COOKIE_SECURE=false
EOF
  chmod 600 "$ENV_FILE"
  echo "Criado $ENV_FILE com senhas novas."
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

echo "Construindo e subindo os containers (a primeira vez leva alguns minutos)..."
"${COMPOSE[@]}" up -d --build --remove-orphans

echo -n "Esperando a API ficar pronta"
for _ in $(seq 1 60); do
  estado=$(docker inspect --format '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q api)" 2>/dev/null || true)
  [ "$estado" = "healthy" ] && break
  echo -n "."
  sleep 3
done
echo
if [ "$estado" != "healthy" ]; then
  "${COMPOSE[@]}" logs --tail 40 api
  falhar "A API não ficou pronta. Veja os logs acima ou rode: docker compose -f deploy/docker-compose.yml logs api"
fi

ip=$(hostname -I 2>/dev/null | awk '{print $1}')
ip=${ip:-localhost}

echo
echo "TCM no ar:"
echo "  Sistema:  http://$ip:$WEB_PORT"
echo "  API docs: http://$ip:$API_PORT/docs"
if [ "$primeira_vez" = true ]; then
  echo
  echo "Login do admin:       admin@sdfmanager.com / $BOOTSTRAP_ADMIN_SENHA"
  echo "Senha inicial do time: $SENHA_INICIAL_USUARIOS (troca obrigatória no primeiro acesso)"
  echo "As senhas ficam em $ENV_FILE."
fi
