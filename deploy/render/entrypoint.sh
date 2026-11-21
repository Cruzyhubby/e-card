#!/bin/sh
set -e

# Render provides PORT and RENDER_EXTERNAL_HOSTNAME; derive the public URLs so
# nothing is hardcoded and invitation links always point at the live host.
PORT="${PORT:-10000}"
export APP_URL="${APP_URL:-https://${RENDER_EXTERNAL_HOSTNAME:-localhost}}"
export FRONTEND_URL="${FRONTEND_URL:-$APP_URL}"
export SANCTUM_STATEFUL_DOMAINS="${SANCTUM_STATEFUL_DOMAINS:-${RENDER_EXTERNAL_HOSTNAME:-localhost}}"

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec /usr/local/bin/eclat-entrypoint "$@"
