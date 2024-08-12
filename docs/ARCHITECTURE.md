# Architecture

## Overview

ProjectFlow API is a multi-tenant SaaS backend built with Express, TypeScript, and PostgreSQL. It follows Clean Architecture with strict separation between routes, controllers, services, and data access.

## Multi-Tenancy

Shared database with row-level isolation. Every tenant-scoped query filters by `organization_id`. Enforcement happens at:

1. **Tenant middleware** — validates `X-Organization-Id` header and membership
2. **Service layer** — all methods require `organizationId`
3. **RBAC middleware** — role-based permission checks per endpoint

## Request Flow

```
HTTP Request → Rate Limiter → Auth → Tenant → RBAC → Validator → Controller → Service → Prisma → PostgreSQL
```

## Key Modules

| Module | Responsibility |
|--------|---------------|
| auth | Registration, login, JWT, refresh rotation, sessions |
| organization | Org CRUD, invitations, member management |
| project/task | Core PM workflows, kanban, subtasks |
| notification | In-app + email notifications |
| websocket | Real-time board and notification updates |
| audit | Immutable sensitive action logging |

## Infrastructure

- **PostgreSQL** — primary data store
- **Redis** — caching and pub/sub (optional)
- **MinIO/S3** — file attachments via presigned URLs
- **Mailhog/SMTP** — transactional email

## Security

- bcrypt password hashing (cost 12)
- JWT access tokens (15 min) + refresh token rotation
- Helmet, CORS, rate limiting
- Input validation via Zod
- HTML sanitization on comments
