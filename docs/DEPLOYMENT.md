# Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7 (optional)
- S3-compatible storage (MinIO or AWS S3)
- SMTP server

## Environment Variables

Copy `.env.example` to `.env` and configure all values for production:

- Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ chars)
- Configure `DATABASE_URL` with SSL for production
- Set `CORS_ORIGIN` to your frontend domain
- Configure S3 credentials and bucket

## Docker Deployment

```bash
docker compose up -d postgres redis minio
npm ci
npx prisma migrate deploy
npm run db:seed
npm run build
npm start
```

## Production Dockerfile

```bash
docker build -t projectflow-api .
docker run -p 4000:4000 --env-file .env projectflow-api
```

## Health Checks

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/health/ready`

## Recommended Setup

- Run behind a reverse proxy (nginx) with TLS
- Use managed PostgreSQL (RDS, Supabase, etc.)
- Enable connection pooling (PgBouncer)
- Set up log aggregation for Winston output
- Configure Redis for WebSocket scaling across instances
