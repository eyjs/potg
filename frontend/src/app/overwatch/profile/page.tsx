'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OverwatchProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/my-info')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">
      리다이렉트 중...
    </div>
  )
}
