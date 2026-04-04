import type { Wedding } from '../types';

export const MUSIC_TRACKS = [
  {
    url: '/A Sky Full of Stars Coldplay violin cover.mp3',
    label: 'A Sky Full of Stars',
    artist: 'Coldplay — Violin Cover',
  },
  {
    url: '/What About Us.mp3',
    label: 'What About Us',
    artist: 'Pink',
  },
  {
    url: '/The Night We Met (Bridgerton) - Emotional Piano Cover.mp3',
    label: 'The Night We Met',
    artist: 'Bridgerton — Emotional Piano Cover',
  },
  {
    url: '/Birds of a Feather.mp3',
    label: 'Birds of a Feather',
    artist: 'Billie Eilish',
  },
  {
    url: '/Ordinary (Bridgerton Version) Orchestral Cover.mp3',
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
  musicUrl: '/A Sky Full of Stars Coldplay violin cover.mp3',
  footerQuote: "I have found the one whom my soul loves.",
  footerQuoteAuthor: 'Song of Solomon 3:4',
  passwordHash: undefined,
  package: 'silver',
  sendThankYou: false,
};
