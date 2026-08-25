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
        loot_count INTEGER DEFAULT 0,  -- غيرناها من messages_count إلى loot_count (الغنائم/السرقات)
        last_seen TEXT DEFAULT NULL     -- ضفنا متى آخر مرة شافتها فيه (يضيف واقعية)
      )
    `);
    console.log('🐾 خزنة كات جاهزة... لا أحد يقربها!');
  } catch (err) {
    console.error('❌ فشل تهيئة الخزنة:', err.message);
  }
}

// بدل ما نسجل "نشاط"، كات; تراقب وتسجل "الغنائم" أو التفاعل كأنه سرقة
function logUserActivity(userId, username) {
  if (!db) return;
  try {
    const query = `
      INSERT INTO users (user_id, username, loot_count, last_seen)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        loot_count = loot_count + 1,
        last_seen = datetime('now')
    `;
    db.prepare(query).run(userId, username);
  } catch (err) {
    console.error('❌ خطأ في تحديث الخزنة:', err.message);
  }
}

// جلب بيانات المستخدم
function getUserStats(userId) {
  if (!db) return null;
  try {
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
  } catch (err) {
    console.error('❌ خطأ في فتح الخزنة:', err.message);
    return null;
  }
}

module.exports = { initDb, logUserActivity, getUserStats };
