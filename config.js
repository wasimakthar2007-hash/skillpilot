'use strict';

const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'skillpilot-dev-secret-change-in-production',
  jwtExpiresShort: '8h',
  jwtExpiresRemember: '30d',
  sessionIdleMs: Number(process.env.SESSION_IDLE_MS) || 30 * 60 * 1000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'skillpilot.db'),
  poolMin: 2,
  poolMax: 10,
  bcryptRounds: 12,
  logDir: path.join(__dirname, '..', 'logs')
};
