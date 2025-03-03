// Сервис для работы с YouTube API
const axios = require('axios');
const { YOUTUBE_API_KEY } = require('../config');

// Извлечение ID видео из ссылки
function extractVideoId(link) {
  const match = link.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/);
  return match ? match[1] : null;
}

// Получение информации о видео через YouTube API
async function getYoutubeInfo(videoId) {
  try {
    const url = 'https://www.googleapis.com/youtube/v3/videos';
    const params = {
      id: videoId,
      part: 'snippet,statistics',
      key: YOUTUBE_API_KEY
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const snippet = item.snippet || {};
      const statistics = item.statistics || {};
      
      const title = snippet.title || '';
      const thumbUrl = snippet.thumbnails?.high?.url || '';
      const viewCount = statistics.viewCount || '0';
      
      return { title, thumb: thumbUrl, views: viewCount };
    } else {
      return { title: null, thumb: null, views: null };
    }
  } catch (error) {
    console.error('Ошибка при запросе к YouTube Data API:', error);
    return { title: null, thumb: null, views: null };
  }
}

module.exports = {
  extractVideoId,
  getYoutubeInfo
};
