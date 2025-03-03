// API-маршрут для вебхука Telegram
const TelegramBot = require('node-telegram-bot-api');
const { handleMessage, handleCallbackQuery } = require('../handlers');
const { setupGoogleSheets } = require('../services/googleSheets');

// Инициализация бота
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });

// Глобальные переменные для хранения состояния
if (!global.userState) global.userState = {};
if (!global.cooperationRequests) global.cooperationRequests = {};
if (!global.nextCoopId) global.nextCoopId = 1;

// Инициализация Google Sheets при первом запуске
let sheetsInitialized = false;

module.exports = async (req, res) => {
  // Проверка метода запроса
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Инициализация Google Sheets, если еще не инициализирован
    if (!sheetsInitialized) {
      await setupGoogleSheets();
      sheetsInitialized = true;
    }
    
    const update = req.body;
    
    // Обработка сообщений
    if (update.message) {
      await handleMessage(bot, update.message);
    }
    
    // Обработка callback-запросов (inline кнопки)
    if (update.callback_query) {
      await handleCallbackQuery(bot, update.callback_query);
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ошибка при обработке вебхука:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
