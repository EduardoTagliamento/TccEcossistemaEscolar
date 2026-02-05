// smartLogger.js
// Gerador de log inteligente para monitoramento e auditoria

const fs = require('fs');
const path = require('path');


class SmartLogger {
  constructor(logFile = 'app_log.txt') {
    this.logPath = path.join(__dirname, logFile);
  }

  formatEntry(entry) {
    // Formato detalhado para .txt
    return [
      `Horário: ${entry.timestamp}`,
      `Tipo: ${entry.level}`,
      entry.user ? `Usuário: ${entry.user}` : '',
      entry.route ? `Rota: ${entry.route}` : '',
      entry.ip ? `IP: ${entry.ip}` : '',
      `Mensagem: ${entry.message}`,
      entry.errorCode ? `Código do erro: ${entry.errorCode}` : '',
      entry.stack ? `Stack: ${entry.stack}` : '',
      entry.requestId ? `RequestId: ${entry.requestId}` : '',
      entry.extra ? `Extra: ${JSON.stringify(entry.extra)}` : '',
      '-----------------------------'
    ].filter(Boolean).join('\n');
  }

  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };
    const formatted = this.formatEntry(entry);
    fs.appendFileSync(this.logPath, formatted + '\n');
    if (level === 'error') {
      // Adicional: enviar alerta, email, etc.
      // Exemplo: console.warn('Alerta de erro crítico:', entry);
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    // meta pode conter: errorCode, stack, user, route, ip, requestId, extra
    this.log('error', message, meta);
  }
}

module.exports = new SmartLogger();
