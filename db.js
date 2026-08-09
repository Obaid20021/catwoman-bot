const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

const db = new sqlite3.Database(config.DATABASE_PATH);

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        messages_count INTEGER DEFAULT 0
      )
    `);
  });
}

function logUserActivity(userId, username) {
  const query = `
    INSERT INTO users (user_id, username, messages_count)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      messages_count = messages_count + 1
  `;
  db.run(query, [userId, username]);
}

module.exports = { initDb, logUserActivity };
