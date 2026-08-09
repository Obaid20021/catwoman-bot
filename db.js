const Database = require('better-sqlite3');
const config = require('./config');

const db = new Database(config.DATABASE_PATH);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT,
      messages_count INTEGER DEFAULT 0
    )
  `);
}

function logUserActivity(userId, username) {
  const stmt = db.prepare(`
    INSERT INTO users (user_id, username, messages_count)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      messages_count = messages_count + 1
  `);
  stmt.run(userId, username);
}

module.exports = { initDb, logUserActivity };
