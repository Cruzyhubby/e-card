FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts


FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
        icu-dev \
        libzip-dev \
        libxml2-dev \
        oniguruma-dev \
        postgresql-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        gd \
        pdo_pgsql \
        mbstring \
        bcmath \
        intl \
        opcache \
        dom \
        simplexml \
        xml \
        xmlreader \
        xmlwriter \
        zip \
    && apk del libxml2-dev postgresql-dev \
    && rm -rf /var/cache/apk/*

COPY docker/php.ini /usr/local/etc/php/conf.d/eclat.ini
COPY docker/entrypoint.sh /usr/local/bin/eclat-entrypoint
RUN chmod +x /usr/local/bin/eclat-entrypoint

WORKDIR /var/www/html
COPY --from=vendor --chown=www-data:www-data /app /var/www/html

RUN mkdir -p \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data

ENTRYPOINT ["eclat-entrypoint"]
CMD ["php-fpm"]
