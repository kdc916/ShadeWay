CREATE TABLE IF NOT EXISTS api_health_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  provider TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  route TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_api_health_log_ts ON api_health_log(ts);
CREATE INDEX IF NOT EXISTS idx_api_health_log_provider ON api_health_log(provider, ts);

CREATE TABLE IF NOT EXISTS route_telemetry (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'walk',
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_route_telemetry_created ON route_telemetry(created_at);
