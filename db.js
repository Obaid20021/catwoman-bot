const Database = require('better-sqlite3');
const config = require('./config');

let db;

function initDb() {
  try {
    db = new Database(config.DATABASE_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        messages_count INTEGER DEFAULT 0
      )
    `);
    console.log('✅ قاعدة البيانات جاهزة.');
  } catch (err) {
    console.error('❌ فشل تهيئة قاعدة البيانات:', err.message);
  }
}

function logUserActivity(userId, username) {
  if (!db) return;
  try {
    const query = `
      INSERT INTO users (user_id, username, messages_count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        messages_count = messages_count + 1
    `;
    db.prepare(query).run(userId, username);
  } catch (err) {
    console.error('❌ خطأ في تسجيل نشاط المستخدم:', err.message);
  }
}

function getUserStats(userId) {
  if (!db) return null;
  try {
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
  } catch (err) {
    console.error('❌ خطأ في جلب بيانات المستخدم:', err.message);
    return null;
  }
}

module.exports = { initDb, logUserActivity, getUserStats };