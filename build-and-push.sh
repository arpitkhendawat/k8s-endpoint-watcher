#!/bin/bash

# Build and Push Script for K8s Endpoint Watcher
# Usage: ./build-and-push.sh [IMAGE_NAME]

set -e

# Default image name
IMAGE_NAME="${1:-arpitkhendawat/k8s-endpoint-watcher:latest}"

echo "🔨 Building Docker image: ${IMAGE_NAME}"
docker build -t "${IMAGE_NAME}" .

echo ""
echo "✅ Build successful!"
echo ""
echo "📤 Pushing to Docker registry..."
docker push "${IMAGE_NAME}"

echo ""
echo "✅ Push successful!"
echo ""
echo "🎉 Image available at: ${IMAGE_NAME}"
echo ""
echo "To use in Kubernetes, update k8s/deployment.yaml:"
echo "  image: ${IMAGE_NAME}"

