// errorHandler.js
// Middleware para tratamento centralizado de erros

function errorHandler(err, req, res, next) {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
