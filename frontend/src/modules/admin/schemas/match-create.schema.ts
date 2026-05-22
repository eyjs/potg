import { z } from 'zod'

export const matchCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(100, '100자 이하로 입력하세요'),
  scheduledAt: z.string().min(1, '날짜를 선택하세요'),
  teamCount: z.number().int().min(2, '최소 2팀').max(8, '최대 8팀').optional(),
})

export type MatchCreateFormValues = z.infer<typeof matchCreateSchema>
