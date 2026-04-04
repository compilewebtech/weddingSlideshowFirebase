/**
 * Standalone dev server — runs the Express app directly on port 5001
 * using production Firestore with Firebase CLI credentials.
 *
 * Usage: npm run dev
 * Requires: `npx firebase login` (already done)
 */
import * as path from 'path';
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
  process.env.APPDATA || '',
  'firebase',
  'eliemteiny271_gmail_com_application_default_credentials.json'
);
process.env.GCLOUD_PROJECT = 'wedding-invitation-slideshow';
import './firebase-admin-init';
import express from 'express';
import cors from 'cors';
import weddingRoutes from './routes/weddings';
import guestRoutes from './routes/guests';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = 5001;
const BASE_PATH = '/wedding-invitation-slideshow/us-central1/api';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Mount routes at the same path the Firebase emulator would use
app.use(`${BASE_PATH}/weddings`, weddingRoutes);
app.use(`${BASE_PATH}/weddings/:weddingId/guests`, guestRoutes);

app.get(`${BASE_PATH}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  Dev server running at http://localhost:${PORT}`);
  console.log(`  API base: http://localhost:${PORT}${BASE_PATH}`);
  console.log(`  Health: http://localhost:${PORT}${BASE_PATH}/health\n`);
});
