#!/bin/sh
set -e
mkdir -p /gomodcache /gotemplate
cd /gotemplate
cat > go.mod << 'EOF'
module sandbox
go 1.22
EOF
GOPROXY=https://proxy.golang.org go get \
	golang.org/x/exp@v0.0.0-20240506185415-9bf2ced13842 \
	golang.org/x/text@v0.16.0 \
	github.com/emirpasic/gods@v1.18.1 2>&1
GOPROXY=https://proxy.golang.org go mod verify 2>&1
echo "module cache ok"
