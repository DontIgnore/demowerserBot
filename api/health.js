// API-маршрут для проверки работоспособности
module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Бот работает',
    timestamp: new Date().toISOString()
  });
};
