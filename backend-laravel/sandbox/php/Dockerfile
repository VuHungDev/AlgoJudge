FROM php:8.2-cli
# Cai extension hay dung trong thi lap trinh
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgmp-dev \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install gmp bcmath
RUN useradd -m nobody2 || true
