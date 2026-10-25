FROM php:8.4-apache
RUN docker-php-ext-install pdo pdo_mysql opcache && a2enmod rewrite
# OPcache: bien dich PHP 1 lan, giu trong RAM — giam TTFB Laravel tu giay xuong tram ms.
RUN printf '%s\n' \
  'opcache.enable=1' \
  'opcache.enable_cli=0' \
  'opcache.memory_consumption=128' \
  'opcache.interned_strings_buffer=16' \
  'opcache.max_accelerated_files=20000' \
  'opcache.validate_timestamps=1' \
  'opcache.revalidate_freq=2' \
  > /usr/local/etc/php/conf.d/opcache-perf.ini
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
  && chmod a+r /etc/apt/keyrings/docker.asc \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
  && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli \
  && rm -rf /var/lib/apt/lists/*
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker-entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN chmod +x /usr/local/bin/app-entrypoint.sh
WORKDIR /var/www/html
ENTRYPOINT ["/usr/local/bin/app-entrypoint.sh"]
