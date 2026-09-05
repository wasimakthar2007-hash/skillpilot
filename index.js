'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const logger = require('./logger');
const { migrate, withDb } = require('./db/pool');
const { seed } = require('./db/seed');
const { visitorHash } = require('./utils/crypto');
const live = require('./live');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const questionRoutes = require('./routes/questions');
const testRoutes = require('./routes/tests');
const progressRoutes = require('./routes/progress');
const admin = require('./routes/admin');
const linkRoutes = require('./routes/links');
const publicRoutes = require('./routes/public');

migrate();
seed();

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'ws:', 'wss:'],
        'img-src': ["'self'", 'data:']
      }
    }
  })
);
app.use(cors({ origin: false }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', admin.router);
app.use('/api/links', linkRoutes);
app.use('/api', publicRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/go/:slug', async (req, res) => {
  const slug = String(req.params.slug);
  const source = String(req.query.from || req.get('referer') || 'direct').slice(0, 120);
  try {
    const result = await withDb((db) => {
      const link = db.prepare('SELECT * FROM admin_links WHERE slug = ? AND is_active = 1').get(slug);
      if (!link) return { error: 404 };
      if (link.expires_at && new Date(link.expires_at.replace(' ', 'T')).getTime() < Date.now()) {
        return { error: 410 };
      }
      if (link.usage_limit) {
        const n = db.prepare('SELECT COUNT(*) AS n FROM link_analytics WHERE link_id = ?').get(link.id).n;
        if (n >= link.usage_limit) return { error: 429 };
      }
      const hash = visitorHash(req.ip, req.get('user-agent') || '');
      db.prepare(
        'INSERT INTO link_analytics (link_id, visitor_hash, source_page) VALUES (?, ?, ?)'
      ).run(link.id, hash, source);
      return { url: link.link_url };
    });
    if (result.error === 404) return res.status(404).send('Link not found');
    if (result.error === 410) return res.status(410).send('Link expired');
    if (result.error === 429) return res.status(429).send('Link usage limit reached');
    if (result.url.startsWith('/')) return res.redirect(result.url);
    return res.redirect(result.url);
  } catch (err) {
    logger.error('go_redirect_failed', { message: err.message });
    res.status(500).send('Redirect failed');
  }
});

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

const pages = {
  '/': 'login.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/forgot-password': 'forgot.html',
  '/reset-password': 'reset.html',
  '/dashboard': 'dashboard.html',
  '/dsa': 'dsa.html',
  '/career-resources': 'career.html',
  '/aptitude': 'aptitude.html',
  '/aptitude/test': 'aptitude-test.html',
  '/results': 'results.html',
  '/admin': 'admin.html',
  '/profile': 'profile.html',
  '/settings': 'settings.html'
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(publicDir, file));
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

app.use((err, req, res, _next) => {
  logger.error('unhandled', { message: err.message, path: req.path });
  res.status(500).json({ error: 'Server error' });
});

const server = http.createServer(app);
live.attach(server);
server.listen(config.port, () => {
  logger.info('server_listen', { port: config.port });
  console.log(`SkillPilot running at http://localhost:${config.port}`);
});
