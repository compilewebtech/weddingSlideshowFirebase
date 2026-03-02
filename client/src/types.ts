export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  attending: boolean;
  numberOfGuests: number;
  message?: string;
  submittedAt: string;
}

export interface SlideImage {
  url: string;
  caption: string;
}
