FROM golang:1.22-bookworm
ENV GOMODCACHE=/gomodcache
COPY setup.sh /setup.sh
RUN chmod +x /setup.sh && /setup.sh
ENV GOPROXY=off
WORKDIR /tmp
USER nobody
