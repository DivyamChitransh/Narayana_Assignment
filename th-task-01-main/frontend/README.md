# Orders Frontend (TanStack Start + React Table)

This frontend displays orders in a TanStack Table and consumes the backend cursor-based pagination API.

## Requirements

- Bun
- Backend API running on `http://localhost:3001`

## Setup

Run from `frontend/`:

```bash
bun install
```

## Run dev server

```bash
bun dev
```

Open `http://localhost:3000`.

## What to verify

- Orders table loads initial rows
- `Load more` fetches next page using `nextCursor`
- `hasMore` controls when loading stops
- `Refresh` reloads first page

## Build

```bash
bun --bun run build
```
