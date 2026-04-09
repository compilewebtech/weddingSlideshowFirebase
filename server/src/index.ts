import './firebase-admin-init';
import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import weddingRoutes from './routes/weddings';
import guestRoutes from './routes/guests';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const CLIENT_URLS = [
  'https://weddingslideshowf.netlify.app',
  'https://weddingslideshow.netlify.app',
  'https://compilethemoment.com',
  'https://www.compilethemoment.com',
];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  ...CLIENT_URLS,
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  return allowedOrigins.includes(normalized);
}

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS not allowed for: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

app.use('/weddings', weddingRoutes);
app.use('/weddings/:weddingId/guests', guestRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export const api = onRequest(app);