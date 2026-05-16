import type { Wedding } from '../types';

// Music files live in Firebase Storage (public read). Uploaded once at the bucket root.
// URL format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<url-encoded-filename>?alt=media
const STORAGE_MUSIC_BASE =
  'https://firebasestorage.googleapis.com/v0/b/wedding-invitation-slideshow.firebasestorage.app/o/';
const musicUrl = (filename: string) =>
  `${STORAGE_MUSIC_BASE}${encodeURIComponent(filename)}?alt=media`;

/**
 * Backfill: weddings created before the mp3-to-Storage migration have
 * relative paths like "/A Sky Full of Stars Coldplay violin cover.mp3"
 * saved in Firestore. Map those to Storage URLs so existing weddings keep
 * playing music without a data migration.
 */
export function resolveMusicUrl(saved: string | undefined): string {
  if (!saved) return musicUrl('A Sky Full of Stars Coldplay violin cover.mp3');
  if (saved.startsWith('http://') || saved.startsWith('https://')) return saved;
  // Treat anything else (e.g. "/Some Song.mp3" or "Some Song.mp3") as a Storage filename
  return musicUrl(saved.replace(/^\/+/, ''));
}

export const MUSIC_TRACKS = [
  {
    url: musicUrl('A Sky Full of Stars Coldplay violin cover.mp3'),
    label: 'A Sky Full of Stars',
    artist: 'Coldplay — Violin Cover',
  },
  {
    url: musicUrl('What About Us.mp3'),
    label: 'What About Us',
    artist: 'Pink',
  },
  {
    url: musicUrl('The Night We Met (Bridgerton) - Emotional Piano Cover.mp3'),
    label: 'The Night We Met',
    artist: 'Bridgerton — Emotional Piano Cover',
  },
  {
    url: musicUrl('Birds of a Feather.mp3'),
    label: 'Birds of a Feather',
    artist: 'Billie Eilish',
  },
  {
    url: musicUrl('Ordinary (Bridgerton Version) Orchestral Cover.mp3'),
    label: 'Ordinary',
    artist: 'Bridgerton — Orchestral Cover',
  },
];

export const DEFAULT_WEDDING: Omit<Wedding, 'id' | 'createdBy' | 'createdAt'> = {
  name: '',
  coupleNames: '',
  coupleEmail: '',
  inviteText: 'are getting married',
  weddingDate: '',
  welcomeSubtext: "Click to get started and enjoy the celebration! We can't wait to share this special day with you.",
  dateFull: '',
  ceremonyTime: '',
  ceremonyLocation: '',
  ceremonyLocationUrl: '',
  venueName: '',
  venueAddress: '',
  venueLocationUrl: '',
  quoteText: "Two souls with but a single thought, two hearts that beat as one.",
  quoteAuthor: 'John Keats',
  rsvpDeadline: '',
  paymentType: undefined,
  paymentWhishPhone: '',
  paymentBankAccount: '',
  slides: [
    { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=800&fit=crop', caption: 'The day we said yes...' },
    { url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=1200&h=800&fit=crop', caption: 'Our journey together' },
    { url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&h=800&fit=crop', caption: 'Every moment with you is magical' },
    { url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&h=800&fit=crop', caption: 'Love grows stronger each day' },
    { url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1200&h=800&fit=crop', caption: 'Together forever' },
    { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=800&fit=crop', caption: 'Two hearts, one love' },
  ],
  musicUrl: musicUrl('A Sky Full of Stars Coldplay violin cover.mp3'),
  footerQuote: "I have found the one whom my soul loves.",
  footerQuoteAuthor: 'Song of Solomon 3:4',
  passwordHash: undefined,
  package: 'silver',
  sendThankYou: false,
};
