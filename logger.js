'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

function ensureLogDir() {
  fs.mkdirSync(config.logDir, { recursive: true });
}

function write(level, event, meta) {
  ensureLogDir();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...meta
  }) + '\n';
  const file = path.join(config.logDir, `${level}.log`);
  fs.appendFile(file, line, () => {});
  if (level === 'error' || level === 'security') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

module.exports = {
  info: (event, meta = {}) => write('info', event, meta),
  warn: (event, meta = {}) => write('warn', event, meta),
  error: (event, meta = {}) => write('error', event, meta),
  security: (event, meta = {}) => write('security', event, meta),
  audit: (event, meta = {}) => write('audit', event, meta)
};
