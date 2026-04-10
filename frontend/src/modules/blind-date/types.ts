export interface BlindDateProfile {
  id: string
  registerId: string
  registerNickname?: string
  name: string
  age: number
  gender: "MALE" | "FEMALE"
  location: string
  desiredLocation?: string
  job: string
  mbti?: string
  status: "OPEN" | "CLOSED"
  description: string
  idealType?: string
  smoking: boolean
  education?: string
  height?: number
  photos?: string[]
  contactInfo: string
}

export const statusConfig: Record<BlindDateProfile["status"], { label: string; color: string }> = {
  OPEN: { label: "공개 중", color: "bg-green-500 text-white" },
  CLOSED: { label: "마감", color: "bg-muted text-muted-foreground" },
}
