#!/bin/sh
set -e

# DATABASE_URL tanımlıysa migrasyonları otomatik uygula (idempotent).
if [ -n "$DATABASE_URL" ]; then
  echo "[pvsim] prisma migrate deploy..."
  if node node_modules/prisma/build/index.js migrate deploy; then
    echo "[pvsim] migrate OK"

    # Katalogları otomatik seed et (idempotent upsert — terminale gerek yok).
    # Atlamak için ortam değişkeni: DISABLE_SEED_ON_START=1
    if [ "$DISABLE_SEED_ON_START" != "1" ]; then
      echo "[pvsim] seed:all (panel/inverter/tarife + dev kullanıcı)..."
      ./node_modules/.bin/tsx scripts/seed.ts all \
        || echo "[pvsim] UYARI: seed başarısız (devam ediliyor)"
    else
      echo "[pvsim] DISABLE_SEED_ON_START=1 — seed atlandı"
    fi
  else
    echo "[pvsim] UYARI: migrate deploy başarısız (devam ediliyor)"
  fi
else
  echo "[pvsim] DATABASE_URL yok — migrasyon/seed atlandı"
fi

# Next.js standalone sunucusu
echo "[pvsim] starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec node server.js
