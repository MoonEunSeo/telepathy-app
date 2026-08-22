import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';

import { ROUTE_META, normalizePath } from '@shared/seo';
import { createOriginDelegate } from '../config/cors';
import { serverRuntimeConfig } from '../config/runtime';
import { requestId } from '../middleware/requestId';
import { renderIndexHtml } from '../utils/indexHtml';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface CreateAppOptions {
  allowedOrigins?: readonly string[];
  distPath?: string;
  registerApiRoutes?: (app: Express) => void;
  serveWebStatic?: boolean;
  trustProxyHops?: number;
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function sendNotFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '존재하지 않는 경로입니다.',
      requestId: req.requestId ?? '',
    },
    message: '존재하지 않는 경로입니다.',
  });
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const allowedOrigins = options.allowedOrigins ?? serverRuntimeConfig.webOrigins;
  const serveWebStatic = options.serveWebStatic ?? serverRuntimeConfig.serveWebStatic;
  const trustProxyHops = options.trustProxyHops ?? serverRuntimeConfig.trustProxyHops;
  const distPath = options.distPath ?? path.join(__dirname, '../../../telepathy-front/dist');
  const corsMiddleware = cors({
    origin: createOriginDelegate(allowedOrigins),
    credentials: true,
  });

  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.use(compression());
  app.use('/api', corsMiddleware);
  app.options('/api/*splat', corsMiddleware);
  app.use(requestId);
  app.use(express.json());
  app.use(cookieParser());

  options.registerApiRoutes?.(app);

  app.get('/healthz', (_req: Request, res: Response) => res.status(200).send('OK'));
  app.get('/readyz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready' });
  });

  if (!serveWebStatic) {
    app.use((req: Request, res: Response) => sendNotFound(req, res));
    return app;
  }

  app.use(
    '/assets',
    express.static(path.join(distPath, 'assets'), {
      maxAge: ONE_YEAR_MS,
      immutable: true,
    }),
  );

  app.use(
    express.static(distPath, {
      maxAge: ONE_DAY_MS,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  const indexPath = path.join(distPath, 'index.html');

  app.get(/^\/main\/?$/, (_req: Request, res: Response) => {
    res.redirect(301, '/');
  });

  app.use((req: Request, res: Response) => {
    if (isApiPath(req.path)) {
      sendNotFound(req, res);
      return;
    }

    res.setHeader('Cache-Control', 'no-cache');
    const known = normalizePath(req.path) in ROUTE_META;
    res
      .status(known ? 200 : 404)
      .type('html')
      .send(renderIndexHtml(indexPath, req.path));
  });

  return app;
}
