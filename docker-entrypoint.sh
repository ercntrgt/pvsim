#!/bin/sh
set -e

# DATABASE_URL tanımlıysa migrasyonları otomatik uygula (idempotent).
if [ -n "$DATABASE_URL" ]; then
  echo "[pvsim] prisma migrate deploy..."
  node node_modules/prisma/build/index.js migrate deploy \
    || echo "[pvsim] UYARI: migrate deploy başarısız (devam ediliyor)"
else
  echo "[pvsim] DATABASE_URL yok — migrasyon atlandı"
fi

# Next.js standalone sunucusu
echo "[pvsim] starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
