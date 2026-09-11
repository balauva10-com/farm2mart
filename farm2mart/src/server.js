import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { AppError } from './lib/http.js';
import { isExotelConfigured } from './lib/exotel.js';

import authRouter from './modules/auth/routes.js';
import farmerRouter from './modules/farmers/routes.js';
import centerRouter from './modules/centers/routes.js';
import bookingRouter from './modules/bookings/routes.js';
import produceRouter from './modules/produce/routes.js';
import grievanceRouter from './modules/grievances/routes.js';
import forecastRouter from './modules/forecast/routes.js';
import exotelRouter from './modules/exotel/routes.js';
import notificationRouter from './modules/notifications/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app = express();

// Configure security headers without breaking external CDNs/fonts/images
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  if (!req.url.startsWith('/static') && !req.url.endsWith('.css') && !req.url.endsWith('.js')) {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(publicDir));

// Health check
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  database: env.isPostgres ? 'postgresql' : 'sqlite',
  exotel: isExotelConfigured() ? 'connected (live)' : 'mock_mode (ready for credentials)',
  timestamp: new Date().toISOString()
}));

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/farmers', farmerRouter);
app.use('/api/v1/centers', centerRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/produce', produceRouter);
app.use('/api/v1/grievances', grievanceRouter);
app.use('/api/v1/forecast', forecastRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use(['/api/v1/exotel/passthrough', '/api/v1/exotel'], exotelRouter);

// Fallback for API routes
app.all('/api/*', (_req, _res, next) => next(new AppError(404, 'API endpoint not found', 'NOT_FOUND')));

// Dedicated HTML routes
app.get(['/admin', '/admin.html'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get(['/login', '/login.html'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// Frontend SPA fallback for HTML requests
app.get('*', (req, res, next) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    next(new AppError(404, 'Route not found', 'NOT_FOUND'));
  }
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the supplied fields',
        details: err.flatten()
      }
    });
  }
  
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Unexpected server error',
      ...(err.details && { details: err.details })
    }
  });
});

app.listen(env.port, () => {
  console.log(`=========================================`);
  console.log(`  🌾 Farm2Mart Full-Stack Platform Ready `);
  console.log(`  Local UI:  http://localhost:${env.port}`);
  console.log(`  Health:    http://localhost:${env.port}/health`);
  console.log(`  Exotel:    ${isExotelConfigured() ? 'Connected (Live API)' : 'Mock Mode (Set EXOTEL_* in .env)'}`);
  console.log(`=========================================`);
});

