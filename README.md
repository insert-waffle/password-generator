# Password Generator & Secure Sharing Service

Production ready, Docker native password generator and one time secret
sharing service.

Built for secure internet exposure with strong encryption, short lived
storage, and minimal attack surface.

------------------------------------------------------------------------

## Features

-   AES 256 GCM encryption
-   Redis backed ephemeral storage
-   Per secret TTL support
-   One time retrieval option
-   No database persistence
-   Rate limiting at Nginx and application layer
-   Fully Dockerized
-   Custom branding via environment variables
-   Internet safe deployment pattern

------------------------------------------------------------------------

## Architecture

Client\
↓\
Nginx (rate limiting, reverse proxy)\
↓\
Node.js App (encryption, API)\
↓\
Redis (in memory TTL storage only)

Only Nginx exposes a public port.\
Redis is isolated on an internal Docker network.

------------------------------------------------------------------------

## Requirements

-   Docker
-   Docker Compose v2+
-   32 byte encryption key

Generate a key:

``` bash
openssl rand -hex 32
```

------------------------------------------------------------------------

## Quick Start

### 1. Create environment file

``` bash
cp .env.example .env
```

Edit `.env` and set:

``` bash
ENCRYPTION_KEY=<your 32 byte hex key>
PUBLIC_BASE_URL=http://localhost
```

### 2. Start stack

If using published images:

``` bash
docker compose up -d
```

If building locally:

``` bash
docker compose build
docker compose up -d
```

### 3. Access

Open:

http://localhost

------------------------------------------------------------------------

## Docker Compose Reference

Minimal production compose:

``` yaml
services:
  nginx:
    image: waffle047/password-generator-nginx
    container_name: password-generator_nginx
    ports:
      - "80:80"
    depends_on:
      - app
    networks:
      - public
      - internal

  app:
    image: waffle047/password-generator
    container_name: password-generator_app
    env_file:
      - .env
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis
    networks:
      - internal

  redis:
    image: redis:7-alpine
    container_name: password-generator_redis
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    networks:
      - internal

networks:
  public:
  internal:
    internal: true
```

Design decisions:

-   Redis persistence disabled
-   No bind mounts required
-   Internal network prevents Redis exposure
-   Only port 80 exposed

------------------------------------------------------------------------

## Production Deployment

### TLS Termination

Do not expose this stack directly on the internet without TLS.

Terminate TLS using:

-   Reverse proxy
-   Cloud load balancer
-   Caddy
-   Traefik
-   Nginx proxy manager

Forward traffic to container port 80.

------------------------------------------------------------------------

## Security Model

### Encryption

Secrets are encrypted using AES 256 GCM before storage.\
Redis only stores encrypted payloads.

### Storage

-   In memory only
-   TTL enforced by Redis
-   Optional one time retrieval deletion
-   No disk persistence

### Rate Limiting

-   Nginx level
-   Express middleware level

### Attack Surface

-   Only Nginx is publicly reachable
-   App and Redis isolated in internal network

------------------------------------------------------------------------

## Environment Variables

Required:

``` bash
ENCRYPTION_KEY=<32 byte hex>
```

Optional:

``` bash
PUBLIC_BASE_URL=https://yourdomain.com
BRAND_PRIMARY_COLOR=#000000
BRAND_LOGO_URL=https://...
BRAND_FAVICON_URL=https://...
BRAND_TITLE=Your Brand
BRAND_TAGLINE=Secure sharing
BRAND_SITE_TITLE=Your App
```

If `PUBLIC_BASE_URL` is unset, browser origin is used.

------------------------------------------------------------------------

## API Reference

### Create Secret

POST `/api/secret`

Body:

``` json
{
  "password": "string",
  "expirySeconds": 86400,
  "oneTime": false
}
```

Response:

``` json
{
  "id": "uuid"
}
```

------------------------------------------------------------------------

### Retrieve Secret

GET `/api/secret/:id`

Response:

``` json
{
  "password": "decrypted password"
}
```

Returns 404 if expired, deleted, or not found.

------------------------------------------------------------------------

## Operational Notes

-   Redis data is lost on container restart
-   This is intentional
-   Use container healthchecks in production
-   Consider running behind fail2ban or WAF

View logs:

``` bash
docker compose logs -f
```

------------------------------------------------------------------------

## Recommended Hardening

For internet exposure:

-   Enable upstream rate limiting
-   Use a firewall
-   Restrict management access to Docker host
-   Rotate encryption key only when secrets are expired
-   Use read only root filesystem in production if extending images
