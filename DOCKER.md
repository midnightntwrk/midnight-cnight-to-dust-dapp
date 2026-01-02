# Docker Setup for midnight-cnight-to-dust-dapp

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (optional)

### Build and Run

```bash
# 1. Copy environment file
cp EXAMPLE.env .env
# Edit .env with your actual configuration

# 2. Build the Docker image
docker build -t protofire/midnight-cnight-to-dust-dapp:latest .

# 3. Run the container
docker run --rm -p 3000:3000 --env-file .env protofire/midnight-cnight-to-dust-dapp:latest
```

### Using Docker Compose

From the parent directory (`repositories/protofire/`):

```bash
# Build and start both services (dapp + explorer)
docker-compose up -d

# View logs
docker-compose logs -f cnight-dapp

# Stop services
docker-compose down
```

## Environment Variables

All environment variables are loaded from `.env` file. Copy `EXAMPLE.env` to `.env` and configure:

**Required:**

- `NEXT_PUBLIC_CARDANO_NET` - Network: Mainnet, Preview, Preprod
- `BLOCKFROST_KEY_*` - Blockfrost API keys for each network
- `NEXT_PUBLIC_*_CNIGHT_CURRENCY_POLICY_ID` - cNIGHT policy IDs

See `EXAMPLE.env` for full list of configuration options.

## Dockerfile Details

### Multi-stage Build

1. **deps** - Installs dependencies with Yarn cache
2. **builder** - Builds Next.js application
3. **runner** - Minimal production image (Node 20 Alpine)

### Security Features

- Runs as non-root user (nextjs:1001)
- Minimal Alpine Linux base
- No dev dependencies in final image
- Healthcheck endpoint configured

### Image Size

Expected final image size: ~250-300MB

## Healthcheck

The container includes a healthcheck that verifies the application is responding:

```bash
# Check container health
docker inspect cnight-dapp --format='{{.State.Health.Status}}'
```

Expected output: `healthy` (after ~10s startup period)

## Troubleshooting

### Container exits immediately

```bash
# Check logs
docker logs cnight-dapp

# Run interactively to debug
docker run -it --entrypoint /bin/sh protofire/midnight-cnight-to-dust-dapp:latest
```

### Environment variables not loading

```bash
# Verify .env file exists and is readable
cat .env

# Test with explicit variables
docker run -e NEXT_PUBLIC_CARDANO_NET=Preview -p 3000:3000 protofire/midnight-cnight-to-dust-dapp:latest
```

### Build fails

```bash
# Clear Docker build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t protofire/midnight-cnight-to-dust-dapp:latest .
```

## GitHub Actions CI/CD

This repository includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that automatically:

- Builds Docker images on push to main/develop
- Pushes images to Docker Hub with tags:
  - `:latest` (main branch)
  - `:sha-<commit>` (all branches)
  - `:pr-<number>` (pull requests)

### Setup Required

Add these secrets in GitHub repository settings:

- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub access token

## Production Deployment

### Recommended Configuration

```yaml
services:
  cnight-dapp:
    image: protofire/midnight-cnight-to-dust-dapp:latest
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

### Running on Custom Port

```bash
# Run on port 8080 instead of 3000
docker run -p 8080:3000 --env-file .env protofire/midnight-cnight-to-dust-dapp:latest
```

## Development

For local development without Docker, see main `README.md`.

This Docker setup is for production deployment only.
