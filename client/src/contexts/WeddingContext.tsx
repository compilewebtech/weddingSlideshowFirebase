import { createContext, useContext } from 'react';
import type { Wedding } from '../types';

export interface WeddingContextValue {
  wedding: Wedding | null;
  maxGuestsFromInvite?: number;
  guestToken?: string;
}

const WeddingContext = createContext<WeddingContextValue>({ wedding: null });

export function WeddingProvider({
  wedding,
  maxGuestsFromInvite,
  guestToken,
  children,
}: {
  wedding: Wedding | null;
  maxGuestsFromInvite?: number;
  guestToken?: string;
  children: React.ReactNode;
}) {
  return (
    <WeddingContext.Provider value={{ wedding, maxGuestsFromInvite, guestToken }}>
      {children}
    </WeddingContext.Provider>
  );
}

export function useWeddingContext() {
  const ctx = useContext(WeddingContext);
  return ctx;
}
