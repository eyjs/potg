export interface Hero {
  id: string
  registerId: string
  registerNickname?: string
  name: string
  age: number
  gender: "MALE" | "FEMALE"
  location: string
  job: string
  mbti: string
  status: "available" | "talking" | "taken"
  bio: string
  idealType?: string
  smoking: boolean
  education?: string
  height?: number
  avatar?: string
  photos?: string[]
  contactInfo?: string
}

export interface HeroPreference {
  id?: string
  minAge?: number
  maxAge?: number
  preferredGender?: "MALE" | "FEMALE"
  preferredLocations?: string[]
  preferredJobs?: string[]
  minEducation?: MinEducation
  minHeight?: number
  maxHeight?: number
}

export interface HeroWithPreference extends Hero {
  preference?: HeroPreference
}

export type MinEducation =
  | "HIGH_SCHOOL"
  | "COLLEGE"
  | "BACHELOR"
  | "MASTER"
  | "DOCTORATE"

export const EDUCATION_LABELS: Record<MinEducation, string> = {
  HIGH_SCHOOL: "고졸",
  COLLEGE: "전문대졸",
  BACHELOR: "대졸",
  MASTER: "석사",
  DOCTORATE: "박사",
}

export interface BlindDateRequestItem {
  id: string
  listingId: string
  requesterId: string
  requester?: {
    id: string
    nickname?: string
    username?: string
  }
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  message?: string
  createdAt: string
}

export const REQUEST_STATUS_CONFIG: Record<BlindDateRequestItem["status"], { label: string; color: string }> = {
  PENDING: { label: "대기", color: "bg-yellow-500 text-black" },
  APPROVED: { label: "승인", color: "bg-green-500 text-white" },
  REJECTED: { label: "거절", color: "bg-red-500 text-white" },
  CANCELLED: { label: "취소", color: "bg-muted text-muted-foreground" },
}

export const statusConfig = {
  available: { label: "만남 가능", color: "bg-green-500 text-white" },
  talking: { label: "소개팅 중", color: "bg-yellow-500 text-black" },
  taken: { label: "매칭 완료", color: "bg-muted text-muted-foreground" },
}
