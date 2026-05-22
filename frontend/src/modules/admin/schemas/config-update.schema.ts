import { z } from 'zod'

export const configUpdateSchema = z.object({
  value: z.string().min(1, '값을 입력하세요'),
  description: z.string().optional(),
})

export type ConfigUpdateFormValues = z.infer<typeof configUpdateSchema>
