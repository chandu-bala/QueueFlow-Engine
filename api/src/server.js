const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');


const app = express();
app.use(bodyParser.json());


const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const STREAM_KEY = 'events_stream';


function validatePayload(body) {
if (!body || typeof body !== 'object') return 'body must be json';
if (!body.site_id) return 'site_id required';
if (!body.event_type) return 'event_type required';
return null;
}


app.post('/event', async (req, res) => {
const err = validatePayload(req.body);
if (err) return res.status(400).json({ error: err });


const event = {
event_id: req.body.event_id || uuidv4(),
site_id: req.body.site_id,
event_type: req.body.event_type,
path: req.body.path || '/',
user_id: req.body.user_id || null,
timestamp: req.body.timestamp || new Date().toISOString()
};


try {
await redis.xadd(STREAM_KEY, '*',
'event_id', event.event_id,
'site_id', event.site_id,
'event_type', event.event_type,
'path', event.path,
'user_id', event.user_id || '',
'timestamp', event.timestamp
);


return res.status(202).json({ status: 'accepted', event_id: event.event_id });
} catch (e) {
console.error('enqueue error', e);
return res.status(500).json({ error: 'enqueue_failed' });
}
});


const db = require('./db');
app.get('/stats', async (req, res) => {
const site_id = req.query.site_id;
if (!site_id) return res.status(400).json({ error: 'site_id required' });


const date = req.query.date || new Date().toISOString().slice(0,10);


try {
const aggRes = await db.query(
`SELECT total_views, unique_users FROM daily_site_stats WHERE site_id=$1 AND date=$2`,
[site_id, date]
);
const pathRes = await db.query(
`SELECT path, views FROM daily_site_path_counts WHERE site_id=$1 AND date=$2 ORDER BY views DESC LIMIT 10`,
[site_id, date]
);

const total_views = aggRes.rows[0] ? Number(aggRes.rows[0].total_views) : 0;
const unique_users = aggRes.rows[0] ? Number(aggRes.rows[0].unique_users) : 0;


return res.json({
site_id,
date,
total_views,
unique_users,
top_paths: pathRes.rows.map(r => ({ path: r.path, views: Number(r.views) }))
});
} catch (e) {
console.error('stats error', e);
res.status(500).json({ error: 'internal_error' });
}
});
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on ${port}`));