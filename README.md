# Telegram Bot на JavaScript для Vercel

Этот проект представляет собой Telegram бота, переписанного с Python на JavaScript для деплоя на Vercel с использованием вебхуков.

## Функциональность

- Предложение видео с YouTube и других платформ
- Обработка запросов по сотрудничеству
- Сохранение данных в Google Sheets
- Управление статусами видео

## Установка и запуск

### Локальная разработка

1. Установите зависимости:
   ```
   npm install
   ```

2. Создайте файл `.env` со следующими переменными:
   ```
   TELEGRAM_TOKEN=ваш_токен_бота
   CHANNEL_ID=id_канала
   OWNER_ID=id_владельца
   MODERATOR_IDS=id_модераторов,через,запятую
   SPREADSHEET_ID=id_google_таблицы
   YOUTUBE_API_KEY=ваш_ключ_api_youtube
   ```

3. Поместите файл `credentials.json` с учетными данными сервисного аккаунта Google в корневую директорию проекта.

4. Запустите бот в режиме разработки:
   ```
   npm run dev
   ```

### Деплой на Vercel

1. Установите Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Войдите в аккаунт Vercel:
   ```
   vercel login
   ```

3. Настройте переменные окружения в Vercel:
   ```
   vercel env add TELEGRAM_TOKEN
   vercel env add CHANNEL_ID
   vercel env add OWNER_ID
   vercel env add MODERATOR_IDS
   vercel env add SPREADSHEET_ID
   vercel env add YOUTUBE_API_KEY
   ```

4. Загрузите файл `credentials.json` как секрет в Vercel:
   ```
   vercel secret add google-credentials "$(cat credentials.json)"
   ```

5. Деплой проекта:
   ```
   vercel --prod
   ```

6. После деплоя, настройте вебхук для вашего бота:
   ```
   curl -F "url=https://ваш-домен.vercel.app/api/webhook" https://api.telegram.org/bot{TELEGRAM_TOKEN}/setWebhook
   ```

## Структура проекта

- `index.js` - Основной файл приложения
- `config.js` - Конфигурация приложения
- `handlers/index.js` - Обработчики сообщений и команд
- `services/googleSheets.js` - Сервис для работы с Google Sheets
- `services/youtube.js` - Сервис для работы с YouTube API
- `vercel.json` - Конфигурация для Vercel
