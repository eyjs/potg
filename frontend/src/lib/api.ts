import axios from 'axios';

export const ACCESS_TOKEN_STORAGE_KEY = 'access_token';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://potg.joonbi.co.kr',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 서드파티/크로스사이트 쿠키를 차단하는 브라우저 대응 폴백.
// 로그인 응답 바디로 받은 access_token이 저장돼 있으면 Authorization 헤더로도
// 함께 보낸다. 쿠키는 계속 withCredentials로 병행 전송된다 (쿠키 우선순위 유지).
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 시 조용히 전달 — AuthContext가 상태 처리 담당
    return Promise.reject(error);
  }
);

export default api;
