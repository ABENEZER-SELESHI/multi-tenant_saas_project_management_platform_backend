# Project Management Platform — API

Multi-tenant SaaS project management platform backend built with Express, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start infrastructure services:

```bash
docker compose up -d
```

4. Run the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:4000`.

## Health Checks

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/health/ready`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to dist |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type-check without emitting |

## Project Structure

```
src/
├── config/         Environment and app configuration
├── constants/      Enums and static values
├── controllers/    HTTP request handlers
├── database/       Prisma client and migrations
├── interfaces/     Service and repository contracts
├── middleware/     Express middleware
├── repositories/   Data access layer
├── routes/         API route definitions
├── services/       Business logic
├── types/          Shared TypeScript types
├── utils/          Helpers and utilities
├── validators/     Request validation schemas
├── app.ts          Express application setup
└── server.ts       HTTP server entry point
```

## License

Proprietary — All rights reserved.
