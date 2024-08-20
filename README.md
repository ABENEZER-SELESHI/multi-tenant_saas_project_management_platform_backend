# ProjectFlow — API

Multi-tenant SaaS project management platform backend. Express, TypeScript, PostgreSQL, Prisma.

## Features

- Multi-tenant organization isolation with RBAC
- JWT authentication with refresh token rotation
- Projects, tasks, kanban boards, sprints, subtasks
- Comments with @mentions, file attachments (S3/MinIO)
- Real-time updates via WebSocket (Socket.IO)
- Notifications (in-app + email), global search
- Dashboards, reports, time tracking, audit logs
- Billing-ready subscription schema

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm

## Quick Start

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate deploy
npm run db:seed
npm run dev
```

API: `http://localhost:4000/api/v1`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Production server |
| `npm test` | Run tests |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed subscription plans |

## Documentation

- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)

## Project Structure

```
src/
├── config/         Environment configuration
├── constants/      RBAC permissions
├── controllers/    HTTP handlers
├── database/       Prisma client, seed
├── middleware/     Auth, tenant, RBAC, validation
├── routes/v1/      Versioned API routes
├── services/       Business logic
├── validators/     Zod schemas
├── websocket/      Socket.IO handlers
├── jobs/           Scheduled tasks
└── utils/          Shared utilities
```

## License

Proprietary — All rights reserved.
