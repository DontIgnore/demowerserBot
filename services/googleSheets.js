// Сервис для работы с Google Sheets
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const { SPREADSHEET_ID, GOOGLE_API_SCOPES } = require('../config');
const { extractVideoId } = require('./youtube');

let sheet;
let doc;

// Получение учетных данных Google
function getGoogleCredentials() {
  // Проверяем, есть ли переменная окружения с учетными данными
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (error) {
      console.error('Ошибка при парсинге GOOGLE_CREDENTIALS:', error);
    }
  }
  
  // Если нет переменной окружения, пытаемся загрузить из файла
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'credentials.json'), 'utf8'));
  } catch (error) {
    console.error('Ошибка при чтении credentials.json:', error);
    throw new Error('Не удалось получить учетные данные Google');
  }
}

// Инициализация Google Sheets
async function setupGoogleSheets() {
  try {
    const credentials = getGoogleCredentials();
    
    const jwt = new JWT({
      email: env.client_email,
      key: env.private_key,
      scopes: GOOGLE_API_SCOPES
    });
    
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, jwt);
    await doc.loadInfo();
    sheet = doc.sheetsByIndex[0];
    
    console.log('Google Sheets успешно инициализирован');
    
    // Проверяем, нужно ли инициализировать таблицу
    const rows = await sheet.getRows();
    if (rows.length === 0) {
      await initializeSheet();
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при инициализации Google Sheets:', error);
    return false;
  }
}

// Инициализация таблицы
async function initializeSheet() {
  try {
    // Добавляем заголовки
    await sheet.setHeaderRow(["ID", "Ссылка", "Название", "Просмотры", "Превью", "Статус"]);
    
    // Настройка форматирования
    await sheet.loadCells('A1:F1');
    
    const headerColors = {
      'A1': { red: 0.8, green: 0.9, blue: 1 },
      'B1': { red: 0.9, green: 1, blue: 0.9 },
      'C1': { red: 1, green: 0.9, blue: 0.8 },
      'D1': { red: 1, green: 1, blue: 0.8 },
      'E1': { red: 0.9, green: 0.8, blue: 1 },
      'F1': { red: 0.9, green: 0.9, blue: 0.9 }
    };
    
    // Форматирование заголовков
    for (const [cellId, color] of Object.entries(headerColors)) {
      const cell = sheet.getCellByA1(cellId);
      cell.textFormat = { bold: true };
      cell.backgroundColor = color;
    }
    
    // Сохраняем изменения
    await sheet.saveUpdatedCells();
    
    // Настройка ширины столбцов
    await sheet.updateDimensionProperties('COLUMNS', {
      startIndex: 4, // Столбец E (индекс 4)
      endIndex: 5,
      pixelSize: 200
    });
    
    console.log('Таблица успешно инициализирована');
    return true;
  } catch (error) {
    console.error('Ошибка при инициализации таблицы:', error);
    return false;
  }
}

// Сохранение записи о видео
async function saveVideoRecord(link, title, views, thumbnail = "") {
  try {
    if (!sheet) {
      const success = await setupGoogleSheets();
      if (!success) {
        console.error('Google Sheet не доступен!');
        return 'error';
      }
    }
    
    // Нормализуем ссылку (удаляем параметры после основного URL)
    const normalizedLink = normalizeLink(link);
    console.log('Нормализованная ссылка:', normalizedLink);
    
    // Проверяем, есть ли уже такая запись
    const rows = await sheet.getRows();
    
    // Проверка на дубликаты
    for (const row of rows) {
      // Используем _rawData для доступа к данным ячейки
      if (!row._rawData || row._rawData.length < 2) {
        console.log('Предупреждение: Некорректный формат строки:', row);
        continue;
      }
      
      const rowLink = row._rawData[1]; // Индекс 1 соответствует столбцу "Ссылка"
      const normalizedRowLink = normalizeLink(rowLink);
      console.log('Проверка ссылки:', normalizedRowLink, 'с новой ссылкой:', normalizedLink);
      
      if (normalizedRowLink === normalizedLink) {
        console.log('Видео уже существует в таблице:', link);
        return 'duplicate';
      }
    }
    
    // Создаем новую запись
    const newId = rows.length + 1;
    let imageFormula = '';
    
    if (thumbnail) {
      imageFormula = `=IMAGE("${thumbnail}";4;150;200)`;
    }
    
    // Преобразуем просмотры в число
    let intViews = 0;
    try {
      intViews = parseInt(views);
    } catch (e) {
      intViews = 0;
    }
    
    // Добавляем новую строку и получаем её индекс
    const rowIndex = rows.length + 2; // +2 для учета заголовка и индексации с 1
    
    // Загружаем ячейки для новой строки
    await sheet.loadCells(`A${rowIndex}:F${rowIndex}`);
    
    // Заполняем ячейки
    const cellA = sheet.getCellByA1(`A${rowIndex}`);
    const cellB = sheet.getCellByA1(`B${rowIndex}`);
    const cellC = sheet.getCellByA1(`C${rowIndex}`);
    const cellD = sheet.getCellByA1(`D${rowIndex}`);
    const cellE = sheet.getCellByA1(`E${rowIndex}`);
    const cellF = sheet.getCellByA1(`F${rowIndex}`);
    
    cellA.value = newId;
    cellB.value = link; // Сохраняем оригинальную ссылку
    cellC.value = title || '';
    cellD.value = intViews;
    cellE.formula = imageFormula;
    cellF.value = 'не смотрел';
    
    // Сохраняем изменения
    await sheet.saveUpdatedCells();
    
    // Устанавливаем высоту строки
    try {
      await sheet.updateDimensionProperties('ROWS', {
        startIndex: rowIndex - 1,
        endIndex: rowIndex,
        pixelSize: 150
      });
    } catch (e) {
      console.error('Ошибка при установке высоты строки:', e);
    }
    
    console.log('Запись добавлена:', { newId, link, title, intViews });
    return 'added';
  } catch (error) {
    console.error('Ошибка при добавлении записи:', error);
    return 'error';
  }
}

// Обновление статуса видео
async function updateVideoStatus(videoId, status) {
  try {
    if (!sheet) {
      const success = await setupGoogleSheets();
      if (!success) {
        return { success: false, message: 'Google Sheet не доступен!' };
      }
    }
    
    const rows = await sheet.getRows();
    if (videoId < 1 || videoId > rows.length) {
      return { success: false, message: `Запись с ID ${videoId} не найдена.` };
    }
    
    // Обновляем только конкретную ячейку со статусом
    const rowIndex = videoId + 1; // +1 для учета заголовка
    await sheet.loadCells(`F${rowIndex}`);
    const statusCell = sheet.getCellByA1(`F${rowIndex}`);
    statusCell.value = status;
    await sheet.saveUpdatedCells();
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    return { success: false, message: 'Ошибка при обновлении записи.' };
  }
}

// Функция для нормализации ссылок
function normalizeLink(url) {
  try {
    // Для YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Извлекаем ID видео
      const videoId = extractVideoId(url);
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
    
    // Для других сайтов - удаляем параметры после ?
    const baseUrl = url.split('?')[0];
    return baseUrl;
  } catch (error) {
    console.error('Ошибка при нормализации ссылки:', error);
    return url; // Возвращаем исходную ссылку в случае ошибки
  }
}

module.exports = {
  setupGoogleSheets,
  saveVideoRecord,
  updateVideoStatus
};
