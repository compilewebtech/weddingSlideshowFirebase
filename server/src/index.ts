import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

import './firebase-admin-init';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import express from 'express';
import cors from 'cors';
import weddingRoutes from './routes/weddings';
import guestRoutes from './routes/guests';
import { errorHandler } from './middleware/errorHandler';
import { sendConfirmationEmail } from './services/emailService';

const app = express();

const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  ...envOrigins,
].filter(Boolean) as string[];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  if (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:')) return true;
  return false;
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

app.use('/api/weddings', weddingRoutes);
app.use('/api/weddings/:weddingId/guests', guestRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export const api = onRequest(app);

export const onGuestCreated = onDocumentCreated(
  'weddings/{weddingId}/guests/{guestId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const name = data?.name;
    const attending = data?.attending;

    if (!name || !attending) {
      console.warn('Guest document missing name or attending');
      return;
    }

    await sendConfirmationEmail({
      name: String(name),
      email: data?.email ? String(data.email) : '',
      attending: attending as 'yes' | 'no' | 'maybe',
      numberOfGuests: data?.numberOfGuests ?? 1,
      message: data?.message ? String(data.message) : undefined,
    });
  }
);