#!/bin/bash

set -e

echo "🚀 Starting Kidareh..."

if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found"
  echo "Creating from .env.example..."
  cp .env.example .env
fi

export $(cat .env | grep -v '^#' | xargs)

docker run -d \
  --name kidareh-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET="$JWT_SECRET" \
  -e KAVENEGAR_API_KEY="$KAVENEGAR_API_KEY" \
  -v kidareh-data:/data \
  -v kidareh-uploads:/app/uploads \
  kidareh:latest

echo "✅ Container started!"
echo ""
echo "🌐 Application: http://localhost:3000"
echo "🏥 Health Check: http://localhost:3000/api/health"
echo ""
echo "📋 View logs:"
echo "   docker logs -f kidareh-app"