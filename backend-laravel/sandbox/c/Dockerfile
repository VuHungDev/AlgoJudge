FROM gcc:13-bookworm
# Cai thu vien pho bien cho C: GMP, MPFR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgmp-dev \
    libgmpxx4ldbl \
    libmpfr-dev \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m nobody2 || true
