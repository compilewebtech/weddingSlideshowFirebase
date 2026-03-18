export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: 'yes' | 'no' | 'maybe';
  numberOfGuests: number;
  guestNames?: string[];
  message?: string;
  submittedAt: string;
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
  countdownDate?: string;
  coupleNames: string;
  coupleEmail?: string;
  inviteText: string;
  weddingDate: string;
  welcomeSubtext?: string;
  dateFull: string;
  ceremonyTime: string;
  ceremonyLocation?: string;
  ceremonyLocationUrl?: string;
  venueName: string;
  venueAddress: string;
  venueLocationUrl?: string;
  quoteText?: string;
  quoteAuthor?: string;
  rsvpDeadline?: string;
  paymentType?: 'whish' | 'bank';
  paymentWhishPhone?: string;
  paymentBankAccount?: string;
  slides: SlideImage[];
  musicUrl?: string;
  footerQuote?: string;
  footerQuoteAuthor?: string;
  passwordHash?: string;
}
