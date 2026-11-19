# Task Manager

A full-stack task management app: users register/login and create, list, filter, update, and delete their own tasks.

- **Backend** — Express + TypeScript + MongoDB (Mongoose), microservice-style layout, JWT auth, zod validation, per-request MongoDB transactions, optional hybrid payload encryption, auto-generated Swagger docs
- **Frontend** — React 19 + TypeScript (Vite), Redux Toolkit, TanStack Query, zod + react-hook-form, axios, reusable UI component kit

## Project structure

```
├── src/                        # Backend
│   ├── server.ts               # Entry point (connect DB → setup → routes → swagger)
│   ├── baseSetup/              # App bootstrap (CORS, helmet, encryption middleware)
│   ├── config/                 # env loading, database, redis, rabbitmq
│   ├── libs/                   # jwt, encryption, storage providers
│   ├── middlewares/            # error handler, auth (verifyToken), zod validate, rate limit
│   ├── models/                 # Mongoose models (User, Task, Token, File)
│   ├── microservices/
│   │   ├── microservices.ts    # Central service registry (baseUrls from config.json)
│   │   ├── auth-service/       # register, login, logout, current-user
│   │   └── task-service/       # task CRUD — /api/tasks
│   ├── routes/index.ts         # Mounts each service at its configured baseUrl
│   ├── seeders/                # Default users (SEED_ON_BOOT)
│   ├── types/                  # Express request augmentation
│   └── utils/                  # swagger, pagination, logger, cors options
└── frontend/                   # React app (Vite)
    └── src/
        ├── api/                # axios client (+ auth & encryption interceptors)
        ├── components/
        │   ├── ui/             # Reusable kit: Button, Input, Select, Textarea,
        │   │                   #   Badge, Spinner, Card, Modal, Alert, EmptyState
        │   ├── layout/         # Header, AppLayout, ProtectedRoute
        │   └── tasks/          # TaskForm, TaskItem, TaskFilters
        ├── hooks/              # TanStack Query hooks (auth + tasks)
        ├── lib/                # config, crypto (WebCrypto hybrid encryption client)
        ├── pages/              # LoginPage, RegisterPage, TasksPage
        ├── schemas/            # zod form schemas
        ├── store/              # Redux: auth.slice (persisted session)
        └── types/              # Shared Task/User/API types
```

## API

Auth routes are under `/api/auth`, task routes under `/api/tasks`. All task routes require `Authorization: Bearer <accessToken>` and are scoped to the logged-in user.

| Method | Path                    | Description                                        |
| ------ | ----------------------- | -------------------------------------------------- |
| POST   | `/api/auth/register`    | Create account (name, email, password, confirmPassword) |
| POST   | `/api/auth/login`       | Login → `{ user, accessToken, refreshToken }`      |
| POST   | `/api/auth/logout`      | Revoke the current token                           |
| GET    | `/api/auth/current-user`| Current user profile                               |
| POST   | `/api/tasks`            | Create task                                        |
| GET    | `/api/tasks`            | List tasks — `?status= &priority= &page= &limit=`  |
| GET    | `/api/tasks/:id`        | Get one task                                       |
| PATCH  | `/api/tasks/:id`        | Update task                                        |
| DELETE | `/api/tasks/:id`        | Delete task                                        |

**Task fields:** `title` (required), `description`, `status` (`pending | in-progress | completed`), `priority` (`low | medium | high`), `dueDate`.

Swagger UI: `http://localhost:3000/api-docs` (raw spec at `/api-docs.json`).

## Notable behavior

- **Transactions** — every controller DB operation runs inside `mongoose.startSession()` + `session.withTransaction()` (requires MongoDB replica set; transactions are not supported on standalone mongod). Results are captured in outer variables because Mongoose 7's `withTransaction` resolves to the commit result, not the callback's return value.
- **Hybrid payload encryption** — when `ENCRYPTION_ENABLED=true`, requests sent with header `isencrypted: true` carry `{ ek, iv, data }`: a per-request AES-256-GCM key RSA-OAEP-wrapped with the server public key (`GET /encryption/public-key`), and `base64(ciphertext || 16-byte GCM tag)`. Bodiless requests send the wrapped key as `x-ek`. Responses are returned as `{ iv, data }` under the same key. A `ts` field in the payload is freshness-checked (`ENCRYPTION_MAX_AGE_MS`). The React client does this transparently via axios interceptors (`frontend/src/lib/crypto.ts`).
- **Auth** — access + refresh JWTs are persisted in a `tokens` collection with TTL and verified against the DB on each request, so logout/revoke takes effect immediately.

## Getting started

Prerequisites: Node 20+, MongoDB running as a **replica set** (transactions).

```bash
# Backend
npm install
npm run dev            # nodemon → http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev            # Vite → http://localhost:5173
```

## Environment

Backend — `.env.development` (see file for all options):

| Var | Purpose |
| --- | --- |
| `PORT` / `BASE_URL` | Server port / public URL |
| `MONGO_URI` | MongoDB connection string (replica set required) |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | Token signing secrets |
| `ENCRYPTION_ENABLED` | Enable hybrid payload encryption |
| `ENCRYPTION_PRIVATE_KEY_PATH` / `ENCRYPTION_PUBLIC_KEY_PATH` | RSA keypair (auto-generated at `keys/` on first boot) |
| `CORS_ORIGIN` | Comma-separated allowed origins (must include the Vite origin) |
| `SEED_ON_BOOT` | Seed default users on startup |
| `SWAGGER_ENABLED` | Serve `/api-docs` |

Frontend — `frontend/.env`:

| Var | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL (default `http://localhost:3000`) |
| `VITE_ENCRYPTION_ENABLED` | `false` disables client-side payload encryption |

## Production

The backend serves `frontend/dist` when it exists — build everything and run one process:

```bash
npm run build:all     # backend tsc build + frontend install & vite build
node dist/server.js   # serves the React app + API on the same port
```

For Render (or similar): build command `npm run build:all`, start command `node dist/server.js`.

## Scripts

Backend: `npm run dev` (nodemon + ts-node), `npm run build` (tsc + tsc-alias), `npm run build:frontend` (install + build the React app), `npm run build:all` (both), `npx tsc --noEmit` (typecheck), `npm run seed`.

Frontend: `npm run dev`, `npm run build`, `npm run lint` (oxlint).
