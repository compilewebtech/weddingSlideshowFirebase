export interface Guest {
  id: string;
  name: string;
  email: string;
  attending: 'yes' | 'no' | 'maybe';
  numberOfGuests: number;
  dietaryRestrictions?: string;
  message?: string;
  submittedAt: string;
}