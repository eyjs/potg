'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  battleTag: string;
  role: 'USER' | 'ADMIN';
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';
  rating: number;
  avatarUrl?: string;
  clanId?: string;
  clanRole?: 'MASTER' | 'MANAGER' | 'MEMBER';
  bettingFloatingEnabled: boolean;
  /** User.pointsBalance 기반 잔액. 백엔드 /auth/profile에서 number로 변환 제공. */
  totalPoints: number;
  /** Phase 5-C 이후 항상 0. 베팅 잠금은 BettingStake에서 추적. */
  lockedPoints: number;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 마운트 시 쿠키 세션 확인 — HttpOnly 쿠키는 JS에서 읽을 수 없으므로
  // /auth/profile 호출 성공/실패로 로그인 여부를 판단한다.
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<User>('/auth/profile');
      setUser(response.data);
    } catch {
      // 401 또는 네트워크 오류 — 미로그인 상태로 처리
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    // POST /auth/login → 백엔드가 HttpOnly 쿠키 set
    await api.post('/auth/login', credentials);
    // 쿠키가 설정된 후 프로필 재조회하여 user 상태 갱신
    await fetchUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // 로그아웃 실패해도 클라이언트 상태는 클리어
    }
    setUser(null);
    setIsLoading(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      router.replace('/login');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
