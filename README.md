📘 Analytics Backend — High-Performance Event Tracking System
=============================================================

**(Node.js + Redis Streams + PostgreSQL + Docker)**

This project implements a scalable, high-performance backend used to capture website analytics events.It supports **fast ingestion**, **asynchronous background processing**, and **real-time reporting** with aggregated analytics.

Designed exactly to meet the assignment requirement:

> _“The ingestion endpoint must be extremely fast, must not wait for database write, and must use an asynchronous queue.”_

🚀 1. Architecture Overview
===========================

### ⚙️ System Workflow

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Client → Ingestion API → Redis Stream Queue → Worker Processor → PostgreSQL → Reporting API   `

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

ColumnTypeDescriptionidBIGSERIAL PKAuto incrementsite\_idTEXTWebsite IDevent\_typeTEXTe.g., page\_viewpathTEXTURL pathuser\_idTEXTUser identifiertimestampTIMESTAMPTZWhen event happenedreceived\_atTIMESTAMPTZWhen saved to DB

### **Table: daily\_site\_stats**

Stores daily totals per site.

ColumnTypesite\_idTEXTdateDATEtotal\_viewsBIGINTunique\_usersBIGINT

### **Table: daily\_site\_path\_counts**

Stores daily top path hits.

ColumnTypesite\_idTEXTdateDATEpathTEXTviewsBIGINT

🐳 3. Setup Instructions (Using Docker Compose)
===============================================

### **Prerequisites**

*   Docker Desktop
    
*   Git
    

**Step 1 — Clone the Repository**
---------------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   git clone   cd TRJA_Project   `

**Step 2 — Start All Services**
-------------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   docker compose up --build   `

This creates:

ServicePortAPI3000Redis6379Postgres5432Workerbackground

📸 **Insert Screenshot: Docker Desktop → All containers running**

**Step 3 — Create Database Schema**
-----------------------------------

Run:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   docker compose exec postgres psql -U analytics -d analytics_db -f /app/migrations/schema.sql   `

Verify:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   docker compose exec postgres psql -U analytics -d analytics_db -c "\dt"   `

📸 **Insert Screenshot of tables: events, daily\_site\_stats, daily\_site\_path\_counts**

📬 4. API Usage (With Required Screenshots)
===========================================

⭐ 4.1 POST /event (Ingestion API)
=================================

### Example:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   curl -X POST http://localhost:3000/event \  -H "Content-Type: application/json" \  -d '{    "site_id":"test-123",    "event_type":"page_view",    "path":"/home",    "user_id":"u1",    "timestamp":"2025-11-14T15:30:01Z"  }'   `

### Expected Response:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "status": "accepted",    "event_id": ""  }   `

📸 **Insert Screenshot: Postman POST /event success response**

⭐ 4.2 Redis Queue Verification
==============================

After sending POST request:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   docker compose exec redis redis-cli XLEN events_stream   `

Expected:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   (integer) 1   `

📸 **Insert Screenshot: Redis CLI showing XLEN events\_stream**

⭐ 4.3 Worker Processing
=======================

Check worker logs:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   docker compose logs worker --tail=50   `

Expected examples:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Consumer group created  BEGIN  COMMIT  XACK   `

📸 **Insert Screenshot: Worker logs showing BEGIN → COMMIT → XACK**

⭐ 4.4 PostgreSQL Raw Events Storage
===================================

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   docker compose exec postgres psql -U analytics -d analytics_db -c "SELECT * FROM events;"   `

📸 **Insert Screenshot: events table showing inserted event rows**

⭐ 4.5 GET /stats (Reporting API)
================================

Example Request:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   curl "http://localhost:3000/stats?site_id=test-123&date=2025-11-14"   `

Example Response:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "site_id": "test-123",    "date": "2025-11-14",    "total_views": 1,    "unique_users": 1,    "top_paths": [      { "path": "/home", "views": 1 }    ]  }   `

📸 **Insert Screenshot: Postman GET /stats response**

📦 5. Project Structure
=======================

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   TRJA_Project/  │  ├── api/  │   ├── src/server.js  │   ├── src/db.js  │   ├── Dockerfile  │   └── package.json  │  ├── worker/  │   ├── src/worker.js  │   ├── Dockerfile  │   └── package.json  │  ├── migrations/  │   └── schema.sql  │  ├── docker-compose.yml  └── README.md   `