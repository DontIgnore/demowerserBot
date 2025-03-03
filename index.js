// Основной файл для обработки вебхуков
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { setupGoogleSheets } = require('./services/googleSheets');
const { handleMessage, handleCallbackQuery } = require('./handlers');

// Загрузка переменных окружения
dotenv.config();

// Инициализация Express приложения
const app = express();
app.use(express.json());

// Инициализация бота
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });

// Настройка Google Sheets
setupGoogleSheets();

// Глобальные переменные для хранения состояния
global.userState = {};
global.cooperationRequests = {};
global.nextCoopId = 1;

// Маршрут для вебхука
app.post(`/api/webhook`, async (req, res) => {
  try {
    const update = req.body;
    
    // Обработка сообщений
    if (update.message) {
      await handleMessage(bot, update.message);
    }
    
    // Обработка callback-запросов (inline кнопки)
    if (update.callback_query) {
      await handleCallbackQuery(bot, update.callback_query);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка при обработке вебхука:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Маршрут для проверки работоспособности
app.get('/api/health', (req, res) => {
  res.status(200).send('Бот работает');
});

// Локальный сервер для разработки
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Вебхук URL: ${process.env.WEBHOOK_URL || 'не задан'}`);
  });
}

// Экспорт для Vercel
module.exports = app;
