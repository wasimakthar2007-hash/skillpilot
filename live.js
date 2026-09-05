'use strict';

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const config = require('./config');
const logger = require('./logger');
const { withDb } = require('./db/pool');

const clients = new Set();

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function attach(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(4001, 'auth required');
      return;
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const session = await withDb((db) =>
        db.prepare('SELECT revoked FROM sessions WHERE token_jti = ?').get(payload.jti)
      );
      if (!session || session.revoked) {
        ws.close(4001, 'invalid session');
        return;
      }
      ws.userId = payload.sub;
      clients.add(ws);
      ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
    } catch {
      ws.close(4001, 'invalid token');
      return;
    }
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });
  logger.info('websocket_ready', { path: '/ws' });
}

module.exports = { attach, broadcast, clients };
