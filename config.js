require('dotenv').config();

module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  DATABASE_PATH: './story.db'
};
