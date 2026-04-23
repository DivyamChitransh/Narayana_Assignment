# TH-FS-001 Restaurant Orders System

This project contains:
- `backend/`: Bun + Elysia + SQLite API
- `frontend/`: TanStack Start + React + TanStack Table UI
- `database/orders.db`: SQLite database

The implementation includes:
- Normalization migration from messy legacy orders data
- CRUD API with Zod validation
- Cursor-based pagination (no offset pagination)
- Frontend orders table with load-more cursor pagination

## Project Structure

```text
th-task-01-main/
  backend/
    migrations/
    scripts/
    src/
  frontend/
    src/
  database/
    orders.db
  INSTRUCTIONS.md
```

## Prerequisites

- Bun installed

## 1) Backend Setup

```bash
cd backend
bun install
```

Seed messy source data:

```bash
bun run db:seed
```

Run migration:

```bash
bun run db:migrate
```

Start backend server:

```bash
bun run dev
```

Backend runs on `http://localhost:3001`.

## 2) Frontend Setup

Open a new terminal:

```bash
cd frontend
bun install
bun dev
```

Frontend runs on `http://localhost:3000`.

## API (Cursor Pagination)

Primary list endpoint:

`GET /orders?limit=20&cursor=<token>`

Response format:

```json
{
  "items": [],
  "nextCursor": "string-or-null",
  "hasMore": true
}
```

Other endpoints:
- `GET /orders/:id`
- `POST /orders`
- `PUT /orders/:id`
- `DELETE /orders/:id`

## Quick Verification

1. Run backend and frontend.
2. Open `http://localhost:3000`.
3. Confirm orders table loads.
4. Click `Load more` and verify row count increases.
5. Confirm loading stops when `hasMore` is false.

## Fresh Reset (optional)

From `backend/`:

```bash
rm -f ../database/orders.db
bun run db:seed
bun run db:migrate
```
