// Обработчики сообщений и callback-запросов
const { extractVideoId, getYoutubeInfo } = require('../services/youtube');
const { saveVideoRecord } = require('../services/googleSheets');
const { OWNER_ID, MODERATOR_IDS, CHANNEL_ID } = require('../config');

// Обработка команды /start
async function handleStartCommand(bot, chatId) {
  const markup = {
    inline_keyboard: [
      [
        { text: 'Предложить видео', callback_data: 'video' },
        { text: 'По сотрудничеству', callback_data: 'coop' }
      ]
    ]
  };
  
  await bot.sendMessage(chatId, 'Привет! Насчет чего пишешь?', { reply_markup: markup });
  global.userState[chatId] = null;
}

// Обработка команды /reply
async function handleReplyCommand(bot, message) {
  const userId = message.from.id;
  console.log("reply_to_cooperation called by user_id =", userId);
  
  if (userId != OWNER_ID) {
    console.log("Not the owner!");
    return;
  }
  
  const text = message.text;
  const parts = text.split(/\s+/);
  
  if (parts.length < 3) {
    await bot.sendMessage(message.chat.id, "Использование: /reply <ID> <ваш ответ>");
    return;
  }
  
  try {
    const coopId = parseInt(parts[1]);
    // Объединяем все части сообщения после ID в один текст ответа
    const replyText = parts.slice(2).join(' ');
    
    if (!global.cooperationRequests[coopId]) {
      await bot.sendMessage(message.chat.id, "Запрос с таким ID не найден.");
      return;
    }
    
    const userChatId = global.cooperationRequests[coopId];
    await bot.sendMessage(userChatId, replyText);
    await bot.sendMessage(message.chat.id, "Сообщение отправлено.");
  } catch (error) {
    console.error("Ошибка при отправке ответа:", error);
    await bot.sendMessage(message.chat.id, "Ошибка при отправке ответа.");
  }
}

// Обработка команды /tag
async function handleTagCommand(bot, message) {
  const userId = message.from.id;
  
  if (userId != OWNER_ID && !MODERATOR_IDS.includes(userId)) {
    return;
  }
  
  const parts = message.text.split(/\s+/);
  if (parts.length < 3) {
    await bot.sendMessage(message.chat.id, "Использование: /tag <ID> <статус>");
    return;
  }
  
  const idStr = parts[1];
  const status = parts[2].toLowerCase();
  
  if (!/^\d+$/.test(idStr)) {
    await bot.sendMessage(message.chat.id, "Ошибка: ID должен быть числом.");
    return;
  }
  
  const videoId = parseInt(idStr);
  
  if (!["смотрел", "не смотрел", "скипнул"].includes(status)) {
    await bot.sendMessage(message.chat.id, "Недопустимый статус. Используйте: смотрел/не смотрел/скипнул.");
    return;
  }
  
  try {
    const { updateVideoStatus } = require('../services/googleSheets');
    const result = await updateVideoStatus(videoId, status);
    
    if (result.success) {
      await bot.sendMessage(message.chat.id, `✅ Видео ID ${videoId} отмечено как '${status}'.`);
    } else {
      await bot.sendMessage(message.chat.id, result.message || "Ошибка при обновлении записи.");
    }
  } catch (error) {
    console.error("Ошибка при обновлении статуса:", error);
    await bot.sendMessage(message.chat.id, "Ошибка при обновлении записи.");
  }
}

// Обработка команды /export или /table
async function handleExportCommand(bot, message) {
  const userId = message.from.id;
  
  if (userId != OWNER_ID) {
    return;
  }
  
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  await bot.sendMessage(message.chat.id, `Вот ссылка на таблицу:\n${sheetUrl}`);
}

// Обработка callback-запросов (inline кнопки)
async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  
  try {
    if (data === 'video') {
      const markup = {
        inline_keyboard: [
          [{ text: 'Назад', callback_data: 'back' }]
        ]
      };
      
      await bot.editMessageText('Отправляй ссылку на видос', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: markup
      });
      
      global.userState[chatId] = 'wait_video';
    } 
    else if (data === 'coop') {
      const markup = {
        inline_keyboard: [
          [{ text: 'Назад', callback_data: 'back' }]
        ]
      };
      
      await bot.editMessageText('Я ознакомлюсь и отпишу тебе либо в ЛС, либо здесь', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: markup
      });
      
      global.userState[chatId] = 'wait_coop';
    } 
    else if (data === 'back') {
      const markup = {
        inline_keyboard: [
          [
            { text: 'Предложить видео', callback_data: 'video' },
            { text: 'По сотрудничеству', callback_data: 'coop' }
          ]
        ]
      };
      
      await bot.editMessageText('Привет! Насчет чего пишешь?', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: markup
      });
      
      global.userState[chatId] = null;
    }
    
    // Ответ на callback-запрос, чтобы убрать "часики" у кнопки
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Ошибка при обработке callback-запроса:", error);
  }
}

// Обработка обычных сообщений
async function handleVideoMessage(bot, message) {
  const chatId = message.chat.id;
  const link = message.text.trim();
  
  const allowedDomains = ["youtube.com", "youtu.be", "spotify.com", "twitch.tv"];
  if (!allowedDomains.some(domain => link.includes(domain))) {
    await bot.sendMessage(chatId, "❗ Пожалуйста, отправьте ссылку на поддерживаемый сайт.");
    return;
  }
  
  let videoTitle = "";
  let viewCount = "";
  let thumbnail = "";
  
  const videoId = extractVideoId(link);
  if (videoId) {
    const { title, thumb, views } = await getYoutubeInfo(videoId);
    if (title) {
      videoTitle = title;
      viewCount = views;
      thumbnail = thumb;
    }
  }
  
  const result = await saveVideoRecord(link, videoTitle, viewCount, thumbnail);
  
  if (result === "duplicate") {
    await bot.sendMessage(chatId, "❗ Это видео уже предложено ранее.");
  } else if (result === "added") {
    await bot.sendMessage(chatId, "✅ Спасибо! Ваше видео предложено.");
  } else {
    await bot.sendMessage(chatId, "Ошибка при сохранении видео.");
  }
  
  global.userState[chatId] = null;
}

async function handleCoopMessage(bot, message) {
  const chatId = message.chat.id;
  const text = message.text.trim();
  
  if (!text) {
    await bot.sendMessage(chatId, "Сообщение пустое. Отмена.");
    global.userState[chatId] = null;
    return;
  }
  
  const userName = message.from.username || message.from.first_name || message.from.id.toString();
  
  // Генерируем ID для запроса
  const coopId = global.nextCoopId;
  global.nextCoopId += 1;
  global.cooperationRequests[coopId] = chatId;
  
  const combinedText = 
    `🤝 Запрос по сотрудничеству от ${userName}:\n"${text}"\n\n` +
    `Код запроса: ${coopId}. Используйте команду /reply ${coopId} <ваш ответ> для ответа.`;
  
  try {
    await bot.sendMessage(CHANNEL_ID, combinedText);
    await bot.sendMessage(chatId, "Ваше сообщение отправлено. Ожидайте ответа.");
  } catch (error) {
    console.error("Ошибка при отправке сообщения в канал:", error);
    await bot.sendMessage(chatId, "Ошибка при отправке сообщения в канал.");
  }
  
  global.userState[chatId] = null;
}

// Главный обработчик сообщений
async function handleMessage(bot, message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  
  // Обработка команд
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].toLowerCase();
    
    if (command === '/start') {
      await handleStartCommand(bot, chatId);
      return;
    } else if (command === '/reply') {
      await handleReplyCommand(bot, message);
      return;
    } else if (command === '/tag') {
      await handleTagCommand(bot, message);
      return;
    } else if (command === '/export' || command === '/table') {
      await handleExportCommand(bot, message);
      return;
    }
  }
  
  // Обработка обычных сообщений в зависимости от состояния
  const state = global.userState[chatId];
  
  if (state === 'wait_video') {
    await handleVideoMessage(bot, message);
  } else if (state === 'wait_coop') {
    await handleCoopMessage(bot, message);
  } else {
    // Если нет активного состояния, отправляем приветственное сообщение
    await handleStartCommand(bot, chatId);
  }
}

module.exports = {
  handleMessage,
  handleCallbackQuery
};
