import { z } from 'zod'

export function makeMemberFormSchema(isEdit: boolean) {
  return z.object({
    username: z.string().min(1, '아이디를 입력하세요').max(50),
    nickname: z.string().max(50).optional().or(z.literal('')),
    role: z.enum(['USER', 'ADMIN']),
    password: isEdit
      ? z.string().refine((v) => v === '' || v.length >= 4, '비밀번호는 4자 이상이어야 합니다')
      : z.string().min(4, '비밀번호는 4자 이상이어야 합니다'),
  })
}

export type MemberFormValues = z.infer<ReturnType<typeof makeMemberFormSchema>>
