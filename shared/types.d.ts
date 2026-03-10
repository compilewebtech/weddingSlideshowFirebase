export interface Guest {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    attending: 'yes' | 'no' | 'maybe';
    numberOfGuests: number;
    dietaryRestrictions?: string;
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
    slides: SlideImage[];
    musicUrl?: string;
    footerQuote?: string;
    footerQuoteAuthor?: string;
}
export declare const DEFAULT_WEDDING: Omit<Wedding, 'id' | 'createdBy' | 'createdAt'>;
