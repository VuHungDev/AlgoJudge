#!/bin/sh
# Entrypoint cho container Apache/PHP.
# Docker Desktop mount /var/run/docker.sock (proxy) thuoc root:root mode 660,
# trong khi Apache chay duoi user www-data -> goi docker CLI bi "permission denied".
# Nut "Chay thu" (/run) can goi sandbox truc tiep nen phai mo quyen doc/ghi
# cho socket ngay khi container khoi dong (chay truoc apache2-foreground, luc nay van la root).
if [ -S /var/run/docker.sock ]; then
  chmod 666 /var/run/docker.sock 2>/dev/null || true
fi
exec apache2-foreground
