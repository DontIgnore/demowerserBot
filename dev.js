// Файл для локальной разработки и тестирования
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { setupGoogleSheets } = require('./services/googleSheets');
const { handleMessage, handleCallbackQuery } = require('./handlers');

// Загрузка переменных окружения
dotenv.config();

// Инициализация бота в режиме polling для локальной разработки
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Настройка Google Sheets
setupGoogleSheets();

// Глобальные переменные для хранения состояния
global.userState = {};
global.cooperationRequests = {};
global.nextCoopId = 1;

// Обработка сообщений
bot.on('message', async (message) => {
  try {
    await handleMessage(bot, message);
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
  }
});

// Обработка callback-запросов (inline кнопки)
bot.on('callback_query', async (callbackQuery) => {
  try {
    await handleCallbackQuery(bot, callbackQuery);
  } catch (error) {
    console.error('Ошибка при обработке callback-запроса:', error);
  }
});

console.log('Бот запущен в режиме polling...');
