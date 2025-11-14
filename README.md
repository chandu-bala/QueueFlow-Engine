# 📘 QueueFlow Engine
(Node.js · Redis Streams · PostgreSQL · Docker)

[TOC]

---

TL;DR
- Fast, non-blocking ingestion endpoint (POST /event) that writes events into a Redis Stream.
- Background worker consumes the stream and writes raw events + aggregated stats into PostgreSQL.
- Reporting API (GET /stats) returns daily totals, unique users and top paths.
- Designed to meet the requirement: "The ingestion endpoint must be extremely fast, must not wait for database write, and must use an asynchronous queue."

---

## Table of contents
- [Architecture Overview](#architecture-overview)
- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [APIs & Examples](#apis--examples)
  - [POST /event — Ingestion](#post-event---ingestion)
  - [GET /stats — Reporting](#get-stats---reporting)
- [Verification & Debugging](#verification--debugging)
  - [Redis stream checks](#redis-stream-checks)
  - [Worker logs](#worker-logs)
  - [Postgres checks](#postgres-checks)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Development notes & env vars](#development-notes--env-vars)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Screenshots & Evidence](#screenshots--evidence)
- [License](#license)

---

## Architecture Overview

Client → Ingestion API → Redis Stream Queue → Worker Processor → PostgreSQL → Reporting API

Key components:
1. **Ingestion API** — receives events, validates them, *pushes* into Redis Stream (events_stream) and immediately returns 202 Accepted.
2. **Worker Processor** — consumes events from Redis Consumer Groups, inserts raw events into `events` table and updates aggregated tables (`daily_site_stats`, `daily_site_path_counts`). Acknowledges messages (XACK) after successful processing.
3. **Reporting API** — reads aggregated tables to return daily totals, unique users and top paths.

Visual (ASCII)
```
┌─────────┐     ┌─────────────┐     ┌────────────┐     ┌───────────┐
│ Browser │ --> │ Ingestion   │ --> │ Redis      │ --> │ Worker    │
│ / Client│     │ API (POST)  │     │ Stream     │     │ Processor │
└─────────┘     └─────────────┘     └────────────┘     └────┬──────┘
                                                           │
                                                           v
                                                    ┌────────────┐
                                                    │ PostgreSQL │
                                                    └────┬───────┘
                                                         │
                                                         v
                                                    ┌─────────┐
                                                    │ Reporting│
                                                    │ API (GET)│
                                                    └─────────┘
```

---

## Quick Start (Docker Compose)

Prerequisites:
- Docker Desktop (or Docker Engine + Compose)
- Git

Clone and start:
```bash
git clone https://github.com/<your-username>/QueueFlow-Engine.git
cd QueueFlow-Engine
docker compose up --build -d
```

Services started (typical):
- api (HTTP server) — port 3000
- redis — port 6379
- postgres — port 5432
- worker — background consumer

Create DB schema:
```bash
docker compose exec postgres psql -U analytics -d analytics_db -f /app/migrations/schema.sql
```

Verify tables:
```bash
docker compose exec postgres psql -U analytics -d analytics_db -c "\dt"
```

Note: replace repository URL and branch names if your layout differs.

---

## APIs & Examples

### POST /event — Ingestion
Endpoint: POST http://localhost:3000/event  
Behavior: Validate payload → XADD to Redis stream `events_stream` → return 202 immediately.

Example cURL:
```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -d '{
    "site_id":"test-123",
    "event_type":"page_view",
    "path":"/home",
    "user_id":"u1",
    "timestamp":"2025-11-14T15:30:01Z"
  }'
```

Expected response:
```json
{
  "status": "accepted",
  "event_id": "<uuid>"
}
```

Tips:
- Ingestion returns quickly because it writes only to Redis, not to Postgres.
- Validate required fields: `site_id`, `event_type`, `path`, `user_id`, `timestamp`.

### GET /stats — Reporting
Endpoint: GET http://localhost:3000/stats?site_id=<SITE>&date=YYYY-MM-DD

Example:
```bash
curl "http://localhost:3000/stats?site_id=test-123&date=2025-11-14"
```

Example response:
```json
{
  "site_id": "test-123",
  "date": "2025-11-14",
  "total_views": 1,
  "unique_users": 1,
  "top_paths": [
    { "path": "/home", "views": 1 }
  ]
}
```

---

## Verification & Debugging

### Redis stream checks
Check stream length after sending events:
```bash
docker compose exec redis redis-cli XLEN events_stream
# expected: (integer) N
```

List stream entries (sample):
```bash
docker compose exec redis redis-cli XREVRANGE events_stream + - COUNT 20
```

Check consumer group info:
```bash
docker compose exec redis redis-cli XINFO GROUPS events_stream
docker compose exec redis redis-cli XINFO CONSUMERS events_stream <group-name>
```

### Worker logs
Inspect worker container logs:
```bash
docker compose logs worker --tail=100
```
Look for outputs such as:
- "Consumer group created"
- BEGIN / COMMIT (if using transactions)
- XACK (acknowledgement)

### Postgres checks
List tables:
```bash
docker compose exec postgres psql -U analytics -d analytics_db -c "\dt"
```

Query raw events:
```bash
docker compose exec postgres psql -U analytics -d analytics_db -c "SELECT * FROM events ORDER BY received_at DESC LIMIT 10;"
```

Query aggregated stats:
```bash
docker compose exec postgres psql -U analytics -d analytics_db -c "SELECT * FROM daily_site_stats WHERE site_id='test-123' AND date='2025-11-14';"
```

---

## Database Schema

migrations/schema.sql (summary)

- Table: events
  - id BIGSERIAL PRIMARY KEY
  - site_id TEXT
  - event_type TEXT
  - path TEXT
  - user_id TEXT
  - timestamp TIMESTAMPTZ
  - received_at TIMESTAMPTZ DEFAULT now()

- Table: daily_site_stats
  - site_id TEXT
  - date DATE
  - total_views BIGINT
  - unique_users BIGINT
  - PRIMARY KEY (site_id, date)

- Table: daily_site_path_counts
  - site_id TEXT
  - date DATE
  - path TEXT
  - views BIGINT
  - PRIMARY KEY (site_id, date, path)

(See `migrations/schema.sql` for exact CREATE TABLE statements.)

---

## Project Structure
```
QueueFlow-Engine/
│
├── api/
│   ├── src/
│   │   ├── server.js        # Express server: POST /event, GET /stats
│   │   └── db.js            # Postgres client wrapper
│   ├── Dockerfile
│   └── package.json
│
├── worker/
│   ├── src/
│   │   └── worker.js        # Redis stream consumer + DB writer
│   ├── Dockerfile
│   └── package.json
│
├── migrations/
│   └── schema.sql
│
├── docker-compose.yml
└── README.md                # <- this file
```

---

## Development notes & env vars

Common environment variables (example):
- POSTGRES_USER=analytics
- POSTGRES_DB=analytics_db
- POSTGRES_PASSWORD=analytics
- REDIS_URL=redis://redis:6379
- PG_HOST=postgres
- PG_PORT=5432
- API_PORT=3000
- REDIS_STREAM=events_stream
- REDIS_GROUP=analytics_workers
- REDIS_CONSUMER=worker-1

Set these in `docker-compose.yml` and `.env` as appropriate.

---



## License
MIT — see LICENSE file.

---

If you want, I can:
- create the README.md directly in your repository (I can prepare a git change/pull request or push to a branch if you grant access),
- add a docs/ directory with placeholder images,
- or generate the filled-in schema.sql sample and example Postman collection.

Tell me which of the above you want next and I will prepare it.