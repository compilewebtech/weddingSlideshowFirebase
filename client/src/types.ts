export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: 'yes' | 'no' | 'maybe'; // <-- string union, not boolean
  numberOfGuests: number;
  message?: string;
  submittedAt: string;
}

export interface SlideImage {
  url: string;
  caption: string;
}
