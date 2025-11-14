const Redis = require('ioredis');
const { Pool } = require('pg');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STREAM_KEY = 'events_stream';
const GROUP_NAME = 'processors_grp';
const CONSUMER_NAME = process.env.CONSUMER_NAME || `worker-${Math.floor(Math.random() * 1000)}`;

/**
 * -------------------------------
 * 1️⃣  ENSURE CONSUMER GROUP EXISTS
 * -------------------------------
 */
async function ensureGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$', 'MKSTREAM');
    console.log('Consumer group created');

    // IMPORTANT: Give Redis time to settle before XREADGROUP
    await new Promise(resolve => setTimeout(resolve, 200));

  } catch (e) {
    if (e.message.includes('BUSYGROUP')) {
      console.log('Consumer group already exists');
      return;
    }
    console.error('Error creating consumer group:', e);
  }
}

/**
 * -------------------------------
 * 2️⃣ INSERT + AGGREGATION LOGIC
 * -------------------------------
 */
async function upsertAggregates(client, site_id, dateStr, path, user_id) {
  await client.query(
    `INSERT INTO daily_site_stats(site_id, date, total_views, unique_users)
     VALUES ($1,$2,1,0)
     ON CONFLICT(site_id,date)
     DO UPDATE SET total_views = daily_site_stats.total_views + 1`,
    [site_id, dateStr]
  );

  await client.query(
    `INSERT INTO daily_site_path_counts(site_id, date, path, views)
     VALUES ($1,$2,$3,1)
     ON CONFLICT(site_id,date,path)
     DO UPDATE SET views = daily_site_path_counts.views + 1`,
    [site_id, dateStr, path]
  );
}

async function processMessage(id, fields) {
  const obj = {};

  // Convert Redis array into object
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }

  const site_id = obj.site_id;
  const event_type = obj.event_type;
  const path = obj.path || '/';
  const user_id = obj.user_id || null;
  const timestamp = obj.timestamp ? new Date(obj.timestamp) : new Date();
  const dateStr = timestamp.toISOString().slice(0, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO events(site_id,event_type,path,user_id,timestamp)
       VALUES($1,$2,$3,$4,$5)`,
      [site_id, event_type, path, user_id, timestamp]
    );

    await upsertAggregates(client, site_id, dateStr, path, user_id);

    await client.query('COMMIT');
    await redis.xack(STREAM_KEY, GROUP_NAME, id);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Processing error: ', e);
  } finally {
    client.release();
  }
}

/**
 * -------------------------------
 * 3️⃣ MAIN LOOP
 * -------------------------------
 */
async function mainLoop() {
  await ensureGroup();

  while (true) {
    try {
      const response = await redis.xreadgroup(
        'GROUP', GROUP_NAME, CONSUMER_NAME,
        'COUNT', 50,
        'BLOCK', 5000,
        'STREAMS', STREAM_KEY, '>'
      );

      if (!response) continue;

      for (const [, messages] of response) {
        for (const [id, fields] of messages) {
          await processMessage(id, fields);
        }
      }
    } catch (e) {
      console.error('Worker loop error:', e);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

mainLoop().catch((e) => console.error('Fatal error', e));
