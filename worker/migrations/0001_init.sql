CREATE TABLE users (id TEXT PRIMARY KEY, created INTEGER NOT NULL);
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL,
  transports TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE challenges (id TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT, kind TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE data (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX credentials_user ON credentials(user_id);
CREATE INDEX sessions_user ON sessions(user_id);
