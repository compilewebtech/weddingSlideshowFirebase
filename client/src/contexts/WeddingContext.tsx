import { createContext, useContext } from 'react';
import type { Wedding } from '../types';

const WeddingContext = createContext<Wedding | null>(null);

export function WeddingProvider({
  wedding,
  children,
}: {
  wedding: Wedding | null;
  children: React.ReactNode;
}) {
  return (
    <WeddingContext.Provider value={wedding}>
      {children}
    </WeddingContext.Provider>
  );
}

export function useWeddingContext() {
  const ctx = useContext(WeddingContext);
  return ctx;
}
