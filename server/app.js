import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/error.js';

import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import memberRoutes from './routes/member.routes.js';
import circulationRoutes from './routes/circulation.routes.js';
import adminRoutes from './routes/admin.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/storage', express.static(path.join(config.storageDir), { maxAge: '1d' }));
app.use(express.static(config.publicDir, { maxAge: config.isProd ? '1h' : 0 }));
if (fs.existsSync(config.distDir)) app.use(express.static(config.distDir, { index: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'dlms-api', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/circulation', circulationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use('/api', (_req, _res, next) => next(notFound('Endpoint not found.')));

if (fs.existsSync(path.join(config.distDir, 'index.html'))) {
  app.get('*', (_req, res) => res.sendFile(path.join(config.distDir, 'index.html')));
}

app.use(errorHandler);
export default app;
