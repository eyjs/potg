import api from '@/lib/api'

export interface AttendanceUploadResult {
  row: number
  discordId?: string
  status: 'SUCCESS' | 'FAIL'
  reason?: string
}

export interface AttendanceUploadResponse {
  total: number
  success: number
  failed: number
  results: AttendanceUploadResult[]
}

export const attendanceApi = {
  upload: (file: File): Promise<AttendanceUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    return api
      .post<AttendanceUploadResponse>('/admin/attendance/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
