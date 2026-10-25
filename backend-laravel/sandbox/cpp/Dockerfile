FROM gcc:13-bookworm
# Cai thu vien pho bien cho C++: Boost, Eigen, nlohmann-json
RUN apt-get update && apt-get install -y --no-install-recommends \
    libboost-all-dev \
    libeigen3-dev \
    nlohmann-json3-dev \
    libgmp-dev \
    libgmpxx4ldbl \
    libmpfr-dev \
    libmpfrc++-dev \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m nobody2 || true
