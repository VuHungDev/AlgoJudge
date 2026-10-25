FROM eclipse-temurin:17-jdk-jammy
# Cai thu vien pho bien cho Java: Apache Commons, Guava
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget unzip \
    && mkdir -p /usr/local/java-lib \
    && cd /usr/local/java-lib \
    && wget -q https://repo1.maven.org/maven2/org/apache/commons/commons-lang3/3.14.0/commons-lang3-3.14.0.jar \
    && wget -q https://repo1.maven.org/maven2/org/apache/commons/commons-math3/3.6.1/commons-math3-3.6.1.jar \
    && wget -q https://repo1.maven.org/maven2/com/google/guava/guava/33.2.1-jre/guava-33.2.1-jre.jar \
    && wget -q https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-databind/2.17.1/jackson-databind-2.17.1.jar \
    && wget -q https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-core/2.17.1/jackson-core-2.17.1.jar \
    && wget -q https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-annotations/2.17.1/jackson-annotations-2.17.1.jar \
    && wget -q https://repo1.maven.org/maven2/org/junit/jupiter/junit-jupiter/5.10.2/junit-jupiter-5.10.2.jar \
    && rm -rf /var/lib/apt/lists/*
ENV CLASSPATH=/usr/local/java-lib/*
WORKDIR /tmp
USER nobody
