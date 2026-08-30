# Stage 1: Builder
FROM docker.arvancloud.ir/node:22-bookworm AS builder

WORKDIR /app

# جلوگیری از دانلود مرورگر Playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# تنظیم registry داخلی برای سرعت
RUN npm config set registry https://package-mirror.liara.ir/repository/npm/

COPY package*.json ./

# نصب تمام پکیج‌ها (شامل devDependencies برای بیلد)
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# اطمینان از باینری native سازگار با این image
RUN npm rebuild better-sqlite3 --build-from-source || true

COPY . .
RUN npm run build

# حذف پکیج‌های توسعه قبل از کپی به مرحلهٔ بعد
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM docker.arvancloud.ir/node:22-bookworm-slim

WORKDIR /app

# ایجاد کاربر امن
RUN groupadd -r -g 1001 kidareh && \
    useradd -r -u 1001 -g kidareh -s /bin/false kidareh

# پوشه‌ها هماهنگ با server.ts ensureDirectories() و db.ts
RUN mkdir -p \
    /app/data/uploads/products \
    /app/data/uploads/avatars \
    /app/data/uploads/stores \
    /app/data/logs \
    /app/data/backup \
    /app/data/database \
    /app/data/backups && \
    chown -R kidareh:kidareh /app

# کپی فقط پکیج‌های اجرایی (پس از prune)
COPY --from=builder --chown=kidareh:kidareh /app/node_modules ./node_modules
# کپی فایل‌های بیلد شده
COPY --from=builder --chown=kidareh:kidareh /app/dist ./dist
# کپی فایل‌های package.json و اسکریپت start
COPY --from=builder --chown=kidareh:kidareh /app/package*.json ./
COPY --from=builder --chown=kidareh:kidareh /app/scripts ./scripts

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_URL=/app/data/database/app.db \
    NODE_OPTIONS="--max-old-space-size=2048" \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    REDIS_ENABLED=false

USER kidareh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "scripts/start-prod.mjs"]
