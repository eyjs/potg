import api from './api';

interface UploadResult {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResult>('/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

  return response.data;
}

export async function uploadImages(
  files: File[],
  onProgress?: (percent: number) => void,
): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await api.post<UploadResult[]>(
    '/uploads/images/multiple',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    },
  );

  return response.data;
}

export function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  // 절대 URL이면 그대로 반환
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // 상대 URL이면 API baseURL 결합
  const baseURL = (
    process.env.NEXT_PUBLIC_API_URL || 'https://potg.joonbi.co.kr'
  ).replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseURL}${path}`;
}
