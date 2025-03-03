// Конфигурация приложения
require('dotenv').config();

module.exports = {
  // Telegram конфигурация
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  CHANNEL_ID: process.env.CHANNEL_ID,
  OWNER_ID: parseInt(process.env.OWNER_ID),
  MODERATOR_IDS: process.env.MODERATOR_IDS.split(',').map(id => parseInt(id.trim())),
  
  // Google Sheets конфигурация
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  GOOGLE_CREDENTIALS: process.env.GOOGLE_CREDENTIALS,
  
  // YouTube API конфигурация
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  
  // Настройки для Google API
  GOOGLE_API_SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
};
