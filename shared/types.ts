export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: 'yes' | 'no' | 'maybe' | 'pending';
  numberOfGuests: number;
  guestNames?: string[];
  dietaryRestrictions?: string;
  message?: string;
  submittedAt: string;

  /** Gold package fields */
  firstName?: string;
  lastName?: string;
  groupId?: string;
  guestToken?: string;
}

export interface SlideImage {
  url: string;
  caption: string;
}

export interface Wedding {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;

  coupleNames: string;
  coupleEmail?: string;
  inviteText: string;
  weddingDate: string;
  welcomeSubtext?: string;

  dateFull: string;
  ceremonyTime: string;
  ceremonyLocation?: string;
  venueName: string;
  venueAddress: string;
  quoteText?: string;
  quoteAuthor?: string;

  rsvpDeadline?: string;

  /** Payment: 'whish' = Whish app (phone number), 'bank' = wedding bank account */
  paymentType?: 'whish' | 'bank';
  paymentWhishPhone?: string;
  paymentBankAccount?: string;

  slides: SlideImage[];

  musicUrl?: string;

  footerQuote?: string;
  footerQuoteAuthor?: string;

  /** Package tier: 'silver' (default) or 'gold' */
  package?: 'silver' | 'gold';
  /** Whether to send thank-you email to guests after RSVP */
  sendThankYou?: boolean;
}

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
  venueName: '',
  venueAddress: '',
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
  package: 'silver',
  sendThankYou: false,
};
