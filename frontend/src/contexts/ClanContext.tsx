'use client';

import { createContext, useContext } from 'react';
import { useAuth } from '@/context/auth-context';

interface ClanContextType {
  clanId: string | undefined;
}

const ClanContext = createContext<ClanContextType | undefined>(undefined);

export function ClanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <ClanContext.Provider value={{ clanId: user?.clanId }}>
      {children}
    </ClanContext.Provider>
  );
}

export function useClan() {
  const context = useContext(ClanContext);
  
  // 컨텍스트가 없어도 auth에서 가져올 수 있도록 폴백
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user } = useAuth();
  
  if (context) {
    return context;
  }
  
  return { clanId: user?.clanId };
}
