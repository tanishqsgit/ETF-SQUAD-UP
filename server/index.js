import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config, validateConfig } from './config.js';
import { sequelize } from './models/index.js';
import { initRedis, redis } from './redis.js';
import routes from './routes/index.js';
import { errors } from './middleware/index.js';
import { chatSocket } from './sockets/chatSocket.js';
validateConfig();
const app = express(),
  server = createServer(app);
if (config.production) app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://*.amazonaws.com',
        ],
        'connect-src': [
          "'self'",
          config.origin,
          config.origin.replace(/^http/, 'ws'),
          'https://*.amazonaws.com',
        ],
        'worker-src': ["'self'", 'blob:'],
      },
    },
  }),
);
app.use(cors({ origin: config.origin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '64kb' }));
app.use('/api', (req, res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== config.origin
  )
    return res.status(403).json({ success: false, error: 'Origin not allowed.' });
  next();
});
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 120,
    message: { success: false, error: 'Too many requests. Try again shortly.' },
  }),
);
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ success: true, status: 'healthy' });
  } catch {
    res.status(503).json({ success: false, error: 'Database unavailable.' });
  }
});
app.use('/api', routes);
app.use('/api', (req, res) =>
  res.status(404).json({ success: false, error: 'Endpoint not found.' }),
);
if (config.production) {
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (req, res) => res.sendFile(path.resolve('dist/index.html')));
}
app.use(errors);
const io = new Server(server, {
  cors: { origin: config.origin, credentials: true },
  maxHttpBufferSize: 64 * 1024,
});
app.set('io', io);
await sequelize.authenticate();
await initRedis();
if (redis) {
  const subscriber = redis.duplicate();
  await subscriber.connect();
  io.adapter(createAdapter(redis, subscriber));
}
chatSocket(io);
server.listen(config.port, () =>
  console.log(`SquadUp API listening on http://localhost:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    io.close(() =>
      server.close(async () => {
        await sequelize.close();
        if (redis) await redis.quit();
        process.exit(0);
      }),
    );
    setTimeout(() => process.exit(1), 10000).unref();
  });
