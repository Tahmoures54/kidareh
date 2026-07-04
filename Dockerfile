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

# ایجاد پوشه‌های لازم (هماهنگ با کد: backups نه backup)
RUN mkdir -p /app/uploads/products /app/uploads/avatars /app/uploads/stores \
    /app/logs /data/backups && \
    chown -R kidareh:kidareh /app /data

# کپی فقط پکیج‌های اجرایی (پس از prune)
COPY --from=builder --chown=kidareh:kidareh /app/node_modules ./node_modules
# کپی فایل‌های بیلد شده
COPY --from=builder --chown=kidareh:kidareh /app/dist ./dist
# کپی فایل‌های package.json برای مرجع
COPY --from=builder --chown=kidareh:kidareh /app/package*.json ./

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

USER kidareh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server/server.js"]