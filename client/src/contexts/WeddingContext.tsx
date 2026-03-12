import { createContext, useContext } from 'react';
import type { Wedding } from '../types';

export interface WeddingContextValue {
  wedding: Wedding | null;
  maxGuestsFromInvite?: number;
}

const WeddingContext = createContext<WeddingContextValue>({ wedding: null });

export function WeddingProvider({
  wedding,
  maxGuestsFromInvite,
  children,
}: {
  wedding: Wedding | null;
  maxGuestsFromInvite?: number;
  children: React.ReactNode;
}) {
  return (
    <WeddingContext.Provider value={{ wedding, maxGuestsFromInvite }}>
      {children}
    </WeddingContext.Provider>
  );
}

export function useWeddingContext() {
  const ctx = useContext(WeddingContext);
  return ctx;
}
