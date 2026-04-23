# Orders Backend (Bun + Elysia + SQLite)

This backend provides:
- SQLite migration for normalizing messy `orders` data
- Zod-validated CRUD REST API
- Cursor-based pagination (`items`, `nextCursor`, `hasMore`)

## Requirements

- Bun

## Setup

Run from `backend/`:

```bash
bun install
```

## Database flow

Create messy source data:

```bash
bun run db:seed
```

Run normalization migration:

```bash
bun run db:migrate
```

If you want a fresh reset:

```bash
rm -f ../database/orders.db
bun run db:seed
bun run db:migrate
```

## Run API

```bash
bun run dev
```

Server runs on `http://localhost:3001`.

## Key endpoints

- `GET /orders?limit=20&cursor=<token>` (cursor pagination only)
- `GET /orders/:id`
- `POST /orders`
- `PUT /orders/:id`
- `DELETE /orders/:id`

List response shape:

```json
{
  "items": [],
  "nextCursor": "string-or-null",
  "hasMore": true
}
```
