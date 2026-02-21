# Password Generator

Production-ready, Dockerized password sharing service with AES-256-GCM encryption, Redis-backed TTL storage, one-time secrets, and a branded UI.

## Quick start

1. Create an environment file:
   - Copy `.env.example` to `.env`
   - Generate a key: `openssl rand -hex 32`
   - Set `ENCRYPTION_KEY` in `.env`

2. Start the stack (requires `.env` with `ENCRYPTION_KEY`):
  - `docker compose up -d --build`

3. Open the app:
  - http://localhost

## Deployment options (recommended: Docker Compose)

### Use Docker Compose (recommended)

Images are published on Docker Hub:

- App: `waffle047/password-generator`
- Nginx: `waffle047/password-generator-nginx`

1. Start the stack (requires `.env` with `ENCRYPTION_KEY`; Compose will pull images automatically):
  - `docker compose up -d`

This keeps the rest of the stack (Redis + network layout) the same.

Example `docker-compose.yml` (copy/paste):

```yaml
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

Note: the published Nginx image already includes the config, so no local `nginx.conf` bind mount is required.

### Host it yourself (server or VM)

1. Install Docker + Docker Compose on your host.
2. Copy these files to the server:
  - [docker-compose.yml](docker-compose.yml)
  - [.env](.env) (create from [.env.example](.env.example))
3. Set required env vars in `.env`:
  - `ENCRYPTION_KEY` (32-byte hex)
  - `PUBLIC_BASE_URL=https://yourdomain.com`
4. Start the stack:
  - `docker compose up -d`

For HTTPS, terminate TLS in front of the stack (e.g., a managed load balancer or a reverse proxy like Caddy/Traefik) and forward to the Nginx container on port 80.

### Build it yourself (optional)

If you want to build locally, run:
- `docker compose build`
- `docker compose up -d`

## API

### POST /api/secret

Body:
```json
{
  "password": "string",
  "expirySeconds": 86400,
  "oneTime": false
}
```

Response:
```json
{
  "id": "uuid"
}
```

### GET /api/secret/:id

Response:
```json
{
  "password": "decrypted password"
}
```

If expired or missing, returns 404 JSON.

## Notes

- Redis persistence is disabled; data lives only in memory with TTL.
- Only Nginx port 80 is exposed publicly.
- Rate limiting is applied at both Nginx and Express layers.

## Public domain configuration

Set `PUBLIC_BASE_URL` in `.env` to control the domain used in share links. If unset, the UI falls back to the current browser origin.

Example:
- `PUBLIC_BASE_URL=https://yourdomain.com`

Share links use the root path: `https://yourdomain.com/<uuid>`.

## Branding configuration

You can fully customize the UI branding via environment variables (typically in your host deployment):

- `BRAND_PRIMARY_COLOR` (CSS hex)
- `BRAND_LOGO_URL`
- `BRAND_FAVICON_URL`
- `BRAND_TITLE`
- `BRAND_TAGLINE`
- `BRAND_SITE_TITLE`

See [.env.example](.env.example) for examples. These values are passed through to the app container via the `.env` file.
