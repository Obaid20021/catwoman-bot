const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'catwoman.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sentiments (
      user_id TEXT PRIMARY KEY,
      score INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

function getSentiment(userId) {
  return new Promise((resolve) => {
    db.get('SELECT score FROM sentiments WHERE user_id = ?', [userId], (err, row) => {
      if (err || !row) return resolve(0);
      resolve(row.score);
    });
  });
}

function updateSentiment(userId, delta) {
  return new Promise((resolve) => {
    getSentiment(userId).then((current) => {
      const newScore = current + delta;
      db.run(
        `INSERT INTO sentiments (user_id, score, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET score = ?, updated_at = CURRENT_TIMESTAMP`,
        [userId, newScore, newScore],
        (err) => resolve(newScore)
      );
    });
  });
}

module.exports = {
  getSentiment,
  updateSentiment
};
