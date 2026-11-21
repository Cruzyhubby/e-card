#!/bin/sh
set -e

# Render provides PORT and RENDER_EXTERNAL_HOSTNAME; derive the public URLs so
# nothing is hardcoded and invitation links always point at the live host.
PORT="${PORT:-10000}"
export APP_URL="${APP_URL:-https://${RENDER_EXTERNAL_HOSTNAME:-localhost}}"
export FRONTEND_URL="${FRONTEND_URL:-$APP_URL}"
# The admin authenticates with Bearer tokens. Do not mark this host stateful:
# Sanctum would then demand a CSRF token from browser requests and login 419s.

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec /usr/local/bin/eclat-entrypoint "$@"
