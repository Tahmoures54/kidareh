#!/bin/bash

set -e

echo "🐳 Building Kidareh Docker Image..."

VERSION=$(node -p "require('./package.json').version")
echo "📌 Version: $VERSION"

docker build \
  --platform linux/amd64 \
  --build-arg NODE_ENV=production \
  --tag kidareh:latest \
  --tag kidareh:$VERSION \
  --file Dockerfile \
  .

echo "✅ Build completed!"
echo ""
echo "🚀 To run:"
echo "   docker run -p 3000:3000 kidareh:latest"
echo ""
echo "📊 Image size:"
docker images kidareh:latest --format "{{.Size}}"