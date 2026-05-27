import api from '@/lib/api'

export interface SystemConfig {
  key: string
  value: string
  description?: string
  updatedAt: string
}

export interface UpdateConfigDto {
  value: string
  description?: string
}

export const configApi = {
  list: (): Promise<SystemConfig[]> =>
    api.get<SystemConfig[]>('/admin/config').then((r) => r.data),

  get: (key: string): Promise<SystemConfig> =>
    api.get<SystemConfig>(`/admin/config/${key}`).then((r) => r.data),

  update: (key: string, dto: UpdateConfigDto): Promise<SystemConfig> =>
    api
      .patch<SystemConfig>(`/admin/config/${key}`, dto)
      .then((r) => r.data),
}
