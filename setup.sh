#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting setup..."

# Build and start the Docker containers
echo "Building and starting Docker containers..."
docker-compose up --build -d

# Wait for the database to be ready
echo "Waiting for the database to be ready..."
until docker exec -it $(docker-compose ps -q db) pg_isready -U user; do
  sleep 1
done

# Apply database migrations
echo "Applying database migrations..."
docker-compose exec app npx prisma migrate dev --name init

echo "Setup completed successfully!"
