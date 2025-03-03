// Скрипт для проверки переменных окружения
require('dotenv').config();

console.log('Проверка переменных окружения:');
console.log('--------------------------');

// Проверяем основные переменные
const envVars = [
  'TELEGRAM_TOKEN',
  'CHANNEL_ID',
  'OWNER_ID',
  'MODERATOR_IDS',
  'SPREADSHEET_ID',
  'YOUTUBE_API_KEY'
];

for (const envVar of envVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ${envVar === 'TELEGRAM_TOKEN' ? 'присутствует' : process.env[envVar]}`);
  } else {
    console.log(`❌ ${envVar}: отсутствует`);
  }
}

// Проверяем GOOGLE_CREDENTIALS
console.log('--------------------------');
if (process.env.GOOGLE_CREDENTIALS) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ GOOGLE_CREDENTIALS: присутствует');
    console.log(`   - client_email: ${credentials.client_email}`);
    console.log(`   - private_key: ${credentials.private_key ? 'присутствует' : 'отсутствует'}`);
    
    // Проверяем формат private_key
    if (credentials.private_key) {
      if (credentials.private_key.includes('\\n')) {
        console.log('   ⚠️ private_key содержит экранированные переносы строк (\\n)');
        console.log('      Это может вызвать проблемы. Рекомендуется заменить \\n на настоящие переносы строк.');
      } else if (credentials.private_key.includes('\n')) {
        console.log('   ✅ private_key содержит правильные переносы строк');
      } else {
        console.log('   ⚠️ private_key не содержит переносов строк');
      }
    }
  } catch (error) {
    console.log(`❌ GOOGLE_CREDENTIALS: ошибка парсинга JSON: ${error.message}`);
  }
} else {
  console.log('❌ GOOGLE_CREDENTIALS: отсутствует');
}
