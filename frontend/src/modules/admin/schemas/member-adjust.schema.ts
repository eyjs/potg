import { z } from 'zod'

export const memberAdjustSchema = z.object({
  delta: z.number().int('정수만 입력 가능합니다').refine((v) => v !== 0, '0은 입력할 수 없습니다'),
  memo: z.string().min(1, '사유를 입력하세요').max(200, '200자 이하로 입력하세요'),
})

export type MemberAdjustFormValues = z.infer<typeof memberAdjustSchema>
