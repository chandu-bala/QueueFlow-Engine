

async function processMessage(id, fields) {
const obj = {};
for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i+1];


const site_id = obj.site_id;
const event_type = obj.event_type;
const path = obj.path || '/';
const user_id = obj.user_id || null;
const timestamp = obj.timestamp ? new Date(obj.timestamp) : new Date();
const dateStr = timestamp.toISOString().slice(0,10);


const client = await pool.connect();
try {
await client.query('BEGIN');


// Insert raw event
await client.query(
`INSERT INTO events(site_id, event_type, path, user_id, timestamp)
VALUES ($1, $2, $3, $4, $5)`,
[site_id, event_type, path, user_id, timestamp]
);


// Update aggregates
await upsertAggregates(client, site_id, dateStr, path, user_id);


await client.query('COMMIT');


// Acknowledge message
await redis.xack(STREAM_KEY, GROUP_NAME, id);
} catch (e) {
await client.query('ROLLBACK');
console.error('process error', e);
} finally {
client.release();
}
}


async function mainLoop() {
await ensureGroup();


while (true) {
try {
const res = await redis.xreadgroup(
'GROUP', GROUP_NAME, CONSUMER_NAME,
'COUNT', 50,
'BLOCK', 5000,
'STREAMS', STREAM_KEY,
'>'
);


if (!res) continue;


for (const [, messages] of res) {
for (const [id, fields] of messages) {
try {
await processMessage(id, fields);
} catch (e) {
console.error('message processing failed', e);
}
}
}
} catch (e) {
console.error('worker loop error', e);
await new Promise(r => setTimeout(r, 1000));
}
}
}


mainLoop().catch(e => console.error(e));