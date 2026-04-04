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
  slides: { url: string; caption: string }[];
  musicUrl?: string;
  footerQuote?: string;
  footerQuoteAuthor?: string;

  /** Package tier: 'silver' (default) or 'gold' */
  package?: 'silver' | 'gold';
  /** Whether to send thank-you email to guests after RSVP */
  sendThankYou?: boolean;
}
