# Password Generator & Secure sharing

Simple, Docker-based password generator and one-time secret sharing service.

Demo: https://password.ntcu.be/

## Features

- AES-256-GCM encryption
- Redis-backed storage with TTL (persistence optional, keeping secrets after restart of Redis container)
- One-time secrets (optional)
- Nginx + app rate limiting
- Custom branding via `.env`

## Requirements

- Docker
- Docker Compose v2+

Generate a key:

``` bash
openssl rand -hex 32
```

## Install / Run

1. Create `.env` (required for both options):

``` bash
cp .env.example .env
```

Set at least:

``` bash
ENCRYPTION_KEY=<32 byte hex>
PUBLIC_BASE_URL=http://localhost
```

2. Pull or Build the App's Image:

Choose one of the options below.

### Option A — Pull Pre-built Image (recommended)

Create a folder anywhere and add two files: `.env` and `docker-compose.yml`.

Choose one of these compose examples:

#### docker-compose.yml (persistence enabled)

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
    command: ["redis-server", "--appendonly", "yes", "--save", "60", "1"]
    volumes:
      - redis-data:/data
    networks:
      - internal

networks:
  public:
    driver: bridge
  internal:
    internal: true

volumes:
  redis-data:
```

#### docker-compose.yml (persistence disabled)

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
    driver: bridge
  internal:
    internal: true
```

Run:

``` bash
docker compose up -d
```

Open:

http://localhost

### Option B — Build from Source

``` bash
git clone https://github.com/insert-waffle/password-generator.git
cd password-generator
cp .env.example .env
docker compose up -d --build
```

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

## API

Base URL: `http://<host>`

### POST /api/secret

Create a new secret.

Headers:

- `Content-Type: application/json`

Body:

``` json
{
  "password": "string",
  "expirySeconds": 86400,
  "oneTime": false,
  "viewsLimit": 3
}
```

Fields:

- `password` (string, required) — max 4096 chars.
- `expirySeconds` (integer, required) — must be > 0 and <= `MAX_EXPIRY_SECONDS` (default 2592000).
- `oneTime` (boolean, optional) — delete after first successful read.
- `viewsLimit` (integer, optional) — if provided, allowed views (1–50). When set, expiry is forced to `MAX_EXPIRY_SECONDS`.

Response (201):

``` json
{ "id": "uuid-v4" }
```

Errors:

- 400 — missing/invalid fields, password too long, invalid `expirySeconds` or `viewsLimit`
- 413 — payload too large (body limit 1mb)
- 415 — wrong content type
- 429 — rate limited

### GET /api/secret/:id

Retrieve and decrypt a secret.

Response (200):

``` json
{
  "password": "decrypted password",
  "oneTime": false,
  "expiresAt": 1771680459214,
  "remainingViews": 2
}
```

Notes:

- `expiresAt` is included for non-one-time secrets when known.
- `remainingViews` is included when `viewsLimit` was set.

Errors:

- 404 — not found, expired, deleted, or invalid UUID
- 500 — corrupted or undecryptable payload

### GET /api/config

Returns public configuration and branding data used by the UI.

Response (200):

``` json
{
  "publicBaseUrl": "https://example.com",
  "version": "0.1.0",
  "branding": {
    "primaryColor": "#cc2936",
    "logoUrl": "https://...",
    "faviconUrl": "https://...",
    "title": "...",
    "tagline": "...",
    "siteTitle": "..."
  }
}
```
