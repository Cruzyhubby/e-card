# Fahari Creative — single-container deployment for Render (free plan).
# Builds the admin SPA and the Laravel API into one image so both share one origin:
#   /        -> admin SPA
#   /api/*   -> Laravel (php-fpm via nginx)
#   /i/*     -> Laravel (public invitations / e-cards)
#   /up      -> health check
# The database is Supabase Postgres; nothing is stored in the container.

# ---- Admin SPA -------------------------------------------------------------
FROM node:22-alpine AS admin

WORKDIR /app
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ .
# Same origin: the SPA calls /api on the same host, so no URL or CORS config.
ENV VITE_API_URL=""
RUN npm run build

# ---- Composer dependencies -------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
# The composer image has no gd/zip/xml extensions; the runtime stage installs
# them all, so resolve the locked versions without platform checks here.
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader --ignore-platform-reqs
COPY backend/ .
RUN composer dump-autoload --optimize --no-dev --no-scripts

# ---- Runtime: nginx + php-fpm ---------------------------------------------
FROM php:8.3-fpm-alpine

# Keep the runtime shared libraries explicitly so deleting the -dev packages
# below cannot strand pdo_pgsql/zip/intl/gd at container start.
# The base image already builds mbstring and the XML extensions (dom, xml,
# simplexml, xmlreader, xmlwriter); rebuilding them here breaks compilation.
RUN apk add --no-cache \
        nginx \
        supervisor \
        curl \
        icu-dev \
        libzip-dev \
        libxml2-dev \
        oniguruma-dev \
        postgresql-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        libpq \
        libzip \
        libxml2 \
        icu-libs \
        oniguruma \
        freetype \
        libjpeg-turbo \
        libpng \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        gd \
        pdo_pgsql \
        bcmath \
        intl \
        opcache \
        zip \
    && apk del icu-dev libzip-dev libxml2-dev oniguruma-dev postgresql-dev freetype-dev libjpeg-turbo-dev libpng-dev \
    && rm -rf /var/cache/apk/*

COPY backend/docker/php.ini /usr/local/etc/php/conf.d/eclat.ini
COPY deploy/render/nginx.conf.template /etc/nginx/nginx.conf.template
COPY deploy/render/php-location.conf /etc/nginx/php-location.conf
COPY deploy/render/supervisord.conf /etc/supervisord.conf
COPY deploy/render/entrypoint.sh /usr/local/bin/render-entrypoint
COPY backend/docker/entrypoint.sh /usr/local/bin/eclat-entrypoint
RUN chmod +x /usr/local/bin/render-entrypoint /usr/local/bin/eclat-entrypoint

WORKDIR /var/www/html
COPY --from=vendor --chown=www-data:www-data /app /var/www/html
COPY --from=admin --chown=www-data:www-data /app/dist /var/www/html/public

RUN mkdir -p \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 10000

ENTRYPOINT ["render-entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
