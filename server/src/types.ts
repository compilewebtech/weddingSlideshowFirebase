export interface Wedding {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  coupleNames: string;
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
  slides: { url: string; caption: string }[];
  musicUrl?: string;
  footerQuote?: string;
  footerQuoteAuthor?: string;
}
