import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://potg.joonbi.co.kr',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 시 조용히 전달 — AuthContext가 상태 처리 담당
    return Promise.reject(error);
  }
);

export default api;
