📘 Analytics Backend — High-Performance Event Tracking System
=============================================================

**(Node.js + Redis Streams + PostgreSQL + Docker)**

This project implements a scalable, high-performance backend used to capture website analytics events.It supports **fast ingestion**, **asynchronous background processing**, and **real-time reporting** with aggregated analytics.

Designed exactly to meet the assignment requirement:

> _“The ingestion endpoint must be extremely fast, must not wait for database write, and must use an asynchronous queue.”_

🚀 1. Architecture Overview
===========================

### ⚙️ System Workflow

Plain 

`  Client → Ingestion API → Redis Stream Queue → Worker Processor → PostgreSQL → Reporting API   `

### ✔ Components

#### **1️⃣ Ingestion API — POST /event**

*   Receives analytics events
    
*   Validates input JSON
    
*   Pushes event to Redis Stream (events\_stream)
    
*   Returns **202 Accepted immediately** (non-blocking)
    
*   Ensures high TPS (thousands/sec)
    

#### **2️⃣ Processor (Worker Service)**

*   Pulls events using Redis Consumer Groups
    
*   Inserts raw events into PostgreSQL
    
*   Updates aggregated tables:
    
    *   daily\_site\_stats
        
    *   daily\_site\_path\_counts
        
*   Acknowledges messages (XACK) after successful processing
    
*   Runs continually in background
    

#### **3️⃣ Reporting API — GET /stats**

*   Fetches analytics summaries
    
*   Returns:
    
    *   total views
        
    *   unique users
        
    *   top most visited paths
        

🗄️ 2. Database Schema
======================

### **Table: events**

Stores raw incoming events.

| Column      | Type         | Description         |
| ----------- | ------------ | ------------------- |
| id          | BIGSERIAL PK | Auto-increment      |
| site_id     | TEXT         | Website ID          |
| event_type  | TEXT         | e.g., page_view     |
| path        | TEXT         | URL path            |
| user_id     | TEXT         | User identifier     |
| timestamp   | TIMESTAMPTZ  | When event occurred |
| received_at | TIMESTAMPTZ  | When stored in DB   |


### **Table: daily\_site\_stats**

Stores daily totals per site.

| Column       | Type   |
| ------------ | ------ |
| site_id      | TEXT   |
| date         | DATE   |
| total_views  | BIGINT |
| unique_users | BIGINT |

### **Table: daily\_site\_path\_counts**

Stores daily top path hits.

| Column  | Type   |
| ------- | ------ |
| site_id | TEXT   |
| date    | DATE   |
| path    | TEXT   |
| views   | BIGINT |


🐳 3. Setup Instructions (Using Docker Compose)
===============================================

### **Prerequisites**

*   Docker Desktop
    
*   Git
    

**Step 1 — Clone the Repository**
---------------------------------

``` git clone 
cd QueueFlow-Engine
```

**Step 2 — Start All Services**
-------------------------------
`   docker compose up --build   `

This creates:

| Service  | Port | Purpose                   |
| -------- | ---- | ------------------------- |
| API      | 3000 | Ingestion + Reporting API |
| Redis    | 6379 | Event Queue               |
| Postgres | 5432 | Database                  |
| Worker   | —    | Background processor      |


**Step 3 — Create Database Schema**
-----------------------------------

Run:

```   docker compose exec postgres psql -U analytics -d analytics_db -f /app/migrations/schema.sql   ```


Verify Tables:

```   docker compose exec postgres psql -U analytics -d analytics_db -c "\dt"   ```


📬 4. API Usage
===========================================

⭐ 4.1 POST /event (Ingestion API)
=================================

### Example Request :

Plain
```
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

### Expected Response:

Plain 
```
{
  "status": "accepted",
  "event_id": ""
}
```


⭐ 4.2 Redis Queue Verification
==============================

After sending POST request:

```   docker compose exec redis redis-cli XLEN events_stream   ```

Expected:

 ```   (integer) 1   ```


⭐ 4.3 Worker Processing
=======================

Check worker logs:

```   docker compose logs worker --tail=50   ```

Expected examples:


``` Consumer group created
BEGIN
COMMIT
XACK ```



⭐ 4.4 PostgreSQL Raw Events Storage
===================================

```docker compose exec postgres psql -U analytics -d analytics_db -c "SELECT * FROM events;"   ```



⭐ 4.5 GET /stats (Reporting API)
================================

Example Request:

Response:


📦 5. Project Structure
========================

```
TRJA_Project/
│
├── api/
│   ├── src/server.js
│   ├── src/db.js
│   ├── Dockerfile
│   └── package.json
│
├── worker/
│   ├── src/worker.js
│   ├── Dockerfile
│   └── package.json
│
├── migrations/
│   └── schema.sql
│
├── docker-compose.yml
└── README.md
```