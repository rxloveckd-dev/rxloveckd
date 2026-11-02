import express from 'express';
import cookieParser from 'cookie-parser';
import type { Config } from './config';
import { authRouter, sessionMiddleware } from './auth';
import { errorHandler, HttpError } from './errors';
import { patientsRouter } from './routes/patients';
import { dashboardRouter } from './routes/dashboard';

export function createApp(config: Config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(sessionMiddleware(config));

  app.use('/api/auth', authRouter(config));
  app.use('/api', patientsRouter());
  app.use('/api', dashboardRouter());
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'not_found', 'ไม่พบข้อมูล')));
  app.use(errorHandler);
  return app;
}
