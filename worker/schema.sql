CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  player_name TEXT NOT NULL CHECK (length(player_name) BETWEEN 1 AND 16),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10000000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS scores_level_score
  ON scores (level, score DESC, created_at, id);
