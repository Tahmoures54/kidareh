# 🐳 Docker Development Environment

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB RAM minimum
- 2GB disk space

### Start Development Environment

```bash
# Build and start services
docker-compose up --build

# Services will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Database: localhost:5432 (PostgreSQL) or file-based (SQLite)
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f api
```

## Services in docker-compose.yml

### Frontend Service
- **Image**: Node 20-Alpine
- **Port**: 3000
- **Mount**: `/workspaces/kidareh` (volume mount for hot reload)
- **Command**: `npm run dev`

### Backend Service
- **Image**: Node 20-Alpine
- **Port**: 8000
- **Mount**: `/workspaces/kidareh` (volume mount)
- **Command**: `npm run server`

### Database Service
- **Type**: SQLite (file-based) or PostgreSQL
- **Mount**: `./data/db` volume for persistence

## Environment Files

### `.env.local` (Create this)

```env
# API
VITE_API_URL=http://localhost:8000/api
VITE_ANALYTICS_ENABLED=true
VITE_LOG_LEVEL=debug

# Features
VITE_FEATURE_AI_ASSISTANT=true
VITE_FEATURE_VOICE_SEARCH=false
VITE_FEATURE_REAL_TIME_CHAT=true
VITE_FEATURE_PWA=true

# External Services (Optional)
VITE_SENTRY_DSN=
VITE_GA_ID=
VITE_GEMINI_API_KEY=
VITE_MAPBOX_TOKEN=
```

### Backend `.env`

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=file:./data/db.sqlite
JWT_SECRET=your-secret-key-development
LOG_LEVEL=debug
```

## Development Workflows

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Changes to `src/` files automatically reload
- Backend: Changes to `server/` files automatically restart

### Database Migrations

```bash
# Run migrations
docker-compose exec api npm run migrate

# Create migration
docker-compose exec api npm run migrate:create
```

### View Database

```bash
# For SQLite
docker-compose exec api sqlite3 data/db.sqlite

# For PostgreSQL
docker-compose exec db psql -U kidareh -d kidareh_dev
```

## Debugging

### Frontend Debugging

1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Set breakpoints in your code
4. Reload page

### Backend Debugging

```bash
# Start with Node inspector
docker-compose exec -e NODE_OPTIONS="--inspect=0.0.0.0:9229" api npm run server

# Connect in Chrome: chrome://inspect
```

### View React Component Tree

```bash
# Install React DevTools browser extension
# Then use "Components" tab in Chrome DevTools
```

## Performance Testing

```bash
# Frontend bundle analysis
docker-compose exec web npm run analyze

# Backend performance profiling
docker-compose exec api npm run profile
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Docker Build Issues

```bash
# Clean rebuild
docker-compose down -v
docker-compose up --build --no-cache
```

### Database Locked

```bash
# Remove lockfile
rm -f data/db.sqlite-shm data/db.sqlite-wal

# Restart services
docker-compose restart
```

## Best Practices

1. **Always use volumes** for source code (hot reload)
2. **Keep container size small** - use Alpine images
3. **Separate services** - one responsibility per container
4. **Use environment variables** for configuration
5. **Log to stdout** - Docker captures it automatically
6. **Health checks** - define for critical services
7. **Resource limits** - prevent container from consuming all resources

## Production vs Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| Image | Alpine (small) | Scratch or slim (minimal) |
| Logging | Verbose/Debug | Info only |
| Volumes | Yes (hot reload) | No |
| Healthchecks | Optional | Required |
| Resource Limits | None | Set limits |
| Restart | unless-stopped | Always |

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Run Docker Compose Tests
  run: docker-compose -f docker-compose.test.yml up --abort-on-container-exit

- name: Build Production Image
  run: docker build -t kidareh:latest .
```

---

**For more info**: See `docker-compose.yml` and `Dockerfile`
