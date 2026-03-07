import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import guestRoutes from './routes/guests';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// CORS
const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : [];

const allowedOrigins = [
  'http://localhost:5173',
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

// Routes
app.use('/api/guests', guestRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Export as Firebase Cloud Function
export const api = onRequest(app);