#!/usr/bin/env bash
set -euo pipefail

# Build + Docker image for g2rain-app-template
#
# Usage:
#   ./build.sh
#   ./build.sh --image g2rain/g2rain-app-template --tag latest --build-mode production

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

IMAGE="g2rain/{{PROJECT_NAME}}"
TAG="latest"
BUILD_MODE="production"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --build-mode|--mode|--vite-build-mode)
      BUILD_MODE="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--image <name>] [--tag <tag>] [--build-mode <mode>]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--image <name>] [--tag <tag>] [--build-mode <mode>]"
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH."
  exit 1
fi

echo "=== Building Docker image ==="
echo "Context: $APP_DIR"
echo "Image:   $IMAGE"
echo "Tag:     $TAG"
echo "Mode:    $BUILD_MODE"

export DOCKER_BUILDKIT=1
docker build \
  --build-arg "VITE_BUILD_MODE=$BUILD_MODE" \
  -t "$IMAGE:$TAG" \
  .

echo "=== Build completed: $IMAGE:$TAG ==="
