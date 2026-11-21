#!/bin/sh
set -e

# Render provides PORT and RENDER_EXTERNAL_HOSTNAME; derive the public URLs so
# nothing is hardcoded and invitation links always point at the live host.
PORT="${PORT:-10000}"
export APP_URL="${APP_URL:-https://${RENDER_EXTERNAL_HOSTNAME:-localhost}}"
export FRONTEND_URL="${FRONTEND_URL:-$APP_URL}"
# The admin authenticates with Bearer tokens. Do not mark this host stateful:
# Sanctum would then demand a CSRF token from browser requests and login 419s.
# Sanctum's default list also appends APP_URL's host, so pin it to local dev only.
export SANCTUM_STATEFUL_DOMAINS="${SANCTUM_STATEFUL_DOMAINS:-localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1}"

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec /usr/local/bin/eclat-entrypoint "$@"
