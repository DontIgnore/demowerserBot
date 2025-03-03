// Скрипт для настройки вебхука Telegram
const axios = require('axios');
const dotenv = require('dotenv');

// Загрузка переменных окружения
dotenv.config();

// Получаем токен бота из переменных окружения
const token = process.env.TELEGRAM_TOKEN;

// Проверяем, что токен существует
if (!token) {
  console.error('Ошибка: TELEGRAM_TOKEN не найден в переменных окружения');
  process.exit(1);
}

// Получаем URL для вебхука из аргументов командной строки
const webhookUrl = process.argv[2];

// Проверяем, что URL для вебхука был передан
if (!webhookUrl) {
  console.error('Ошибка: URL для вебхука не указан');
  console.log('Использование: node setup-webhook.js <URL>');
  console.log('Пример: node setup-webhook.js https://ваш-домен.vercel.app/api/webhook');
  process.exit(1);
}

// Настройка вебхука
async function setupWebhook() {
  try {
    // Удаляем текущий вебхук (если есть)
    await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
    
    // Устанавливаем новый вебхук
    const response = await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, {
      params: {
        url: webhookUrl,
        allowed_updates: JSON.stringify(['message', 'callback_query'])
      }
    });
    
    if (response.data.ok) {
      console.log('Вебхук успешно установлен!');
      console.log(`URL вебхука: ${webhookUrl}`);
      
      // Получаем информацию о вебхуке для проверки
      const webhookInfo = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      console.log('\nИнформация о вебхуке:');
      console.log(JSON.stringify(webhookInfo.data, null, 2));
    } else {
      console.error('Ошибка при установке вебхука:', response.data);
    }
  } catch (error) {
    console.error('Ошибка при настройке вебхука:', error.message);
    if (error.response) {
      console.error('Ответ сервера:', error.response.data);
    }
  }
}

// Запускаем настройку вебхука
setupWebhook();
