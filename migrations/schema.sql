CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_site_stats (
  site_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_views BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  PRIMARY KEY (site_id, date)
);
CREATE TABLE IF NOT EXISTS daily_site_path_counts (
  site_id TEXT NOT NULL,
  date DATE NOT NULL,
  path TEXT NOT NULL,
  views BIGINT DEFAULT 0,
  PRIMARY KEY (site_id, date, path)
);


