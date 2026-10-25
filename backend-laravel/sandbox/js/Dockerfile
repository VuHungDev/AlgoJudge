FROM node:22-slim
# Cai npm packages vao /tmp/node_modules de require() tim duoc khi chay tu /tmp
# NODE_PATH khong set -> Node tim theo require.resolve: /tmp/node_modules la dau tien
RUN mkdir -p /tmp/node_modules && \
    cd /tmp && npm install --save \
    lodash \
    underscore \
    mathjs \
    decimal.js \
    big-integer \
    immutable \
    2>/dev/null && chmod -R 755 /tmp/node_modules
WORKDIR /tmp
USER nobody
