#!/bin/sh
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# apiserver container entrypoint: runs pending Prisma migrations against
# database.url in the mounted /app/config/proyecta.json, then starts the API server.
set -e

echo "-> Running database migrations..."
(cd /app/packages/api && npx prisma migrate deploy --schema=prisma/schema.prisma)

echo "-> Starting API server..."
exec node /app/packages/api/dist/index.js
