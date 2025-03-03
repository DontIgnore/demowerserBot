// Конфигурация приложения

require('dotenv').config();

// Проверка наличия обязательных переменных окружения
const requiredEnvVars = [
  'TELEGRAM_TOKEN',
  'CHANNEL_ID',
  'OWNER_ID',
  'MODERATOR_IDS',
  'SPREADSHEET_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Отсутствует обязательная переменная окружения: ${envVar}`);
  }
}

// Проверка GOOGLE_CREDENTIALS
if (process.env.GOOGLE_CREDENTIALS) {
  try {
    JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('GOOGLE_CREDENTIALS успешно загружены');
  } catch (error) {
    console.error('Ошибка при парсинге GOOGLE_CREDENTIALS:', error.message);
  }
} else {
  console.warn('GOOGLE_CREDENTIALS не найдены в переменных окружения');
}

module.exports = {
  // Telegram конфигурация
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  CHANNEL_ID: process.env.CHANNEL_ID,
  OWNER_ID: parseInt(process.env.OWNER_ID),
  MODERATOR_IDS: process.env.MODERATOR_IDS ? process.env.MODERATOR_IDS.split(',').map(id => parseInt(id.trim())) : [],
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