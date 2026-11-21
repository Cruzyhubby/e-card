#!/bin/sh
set -e

if [ -z "$APP_KEY" ]; then
  echo "APP_KEY is empty. Generate one with: php artisan key:generate --show"
  exit 1
fi

# Wait for Supabase Postgres to accept connections before migrating (max ~90s).
attempt=0
until php -r '$dsn = "pgsql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE").";sslmode=".(getenv("DB_SSLMODE") ?: "require"); try { new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD")); } catch (Throwable $e) { exit(1); }'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 45 ]; then
    echo "Database is not reachable. Aborting."
    exit 1
  fi
  sleep 2
done

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

exec "$@"
