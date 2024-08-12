# API Documentation

Base URL: `http://localhost:4000/api/v1`

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Tenant-scoped endpoints also require:
```
X-Organization-Id: <organization_uuid>
```

## Response Format

```json
{ "success": true, "message": "", "data": {}, "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1 } }
```

```json
{ "success": false, "message": "Error description", "errors": [{ "field": "email", "message": "Invalid" }] }
```

## Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register account |
| POST | /auth/login | Login |
| POST | /auth/verify-email | Verify email |
| POST | /auth/refresh | Refresh tokens |
| POST | /auth/logout | Logout |
| POST | /auth/forgot-password | Request reset |
| POST | /auth/reset-password | Reset password |
| POST | /auth/change-password | Change password |
| GET | /auth/me | Current user |
| GET | /auth/sessions | List sessions |
| DELETE | /auth/sessions/:id | Revoke session |

### Organizations
| Method | Path | Description |
|--------|------|-------------|
| POST | /organizations | Create organization |
| GET | /organizations | List user organizations |
| GET | /organizations/slug/:slug | Get by slug |
| PATCH | /organizations | Update settings |
| DELETE | /organizations | Delete organization |
| GET | /organizations/members | List members |
| POST | /organizations/members/invite | Invite member |
| POST | /organizations/invitations/accept | Accept invitation |
| PATCH | /organizations/members/:id | Update member |
| DELETE | /organizations/members/:id | Remove member |

### Teams
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /teams | List/create teams |
| GET/PATCH/DELETE | /teams/:id | Team CRUD |
| POST/DELETE | /teams/:id/members | Manage members |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /projects | List/create projects |
| GET/PATCH/DELETE | /projects/:id | Project CRUD |
| POST | /projects/:id/archive | Archive project |
| POST/DELETE | /projects/:id/members | Project members |
| POST/DELETE | /projects/:id/teams | Assign teams |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /projects/:projectId/tasks | List/create tasks |
| GET/PATCH/DELETE | /tasks/:id | Task CRUD |
| PATCH | /tasks/:id/status | Update status |
| PATCH | /tasks/:id/assign | Assign task |
| POST | /tasks/:id/duplicate | Duplicate task |
| POST/DELETE | /tasks/:id/watchers | Watch/unwatch |
| PATCH | /projects/:projectId/board | Bulk board update |

### Sprints, Comments, Attachments, Notifications, Search, Dashboard, Reports, Time Entries, Users, Audit Logs

See route files in `src/routes/v1/` for complete endpoint definitions.

## WebSocket Events

Connect to `ws://localhost:4000` with Socket.IO. Pass token via `auth: { token: '<access_token>' }`.

| Event | Direction | Description |
|-------|-----------|-------------|
| join:organization | Client → Server | Join org room |
| join:project | Client → Server | Join project room |
| task:updated | Server → Client | Task changed |
| comment:created | Server → Client | New comment |
| notification:new | Server → Client | New notification |
| presence:update | Bidirectional | User presence |
