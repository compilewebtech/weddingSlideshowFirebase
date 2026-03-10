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
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  ...envOrigins,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS not allowed for: ${origin}`));
  },
  credentials: true,
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