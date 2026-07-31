'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { isAuthenticated, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    if (isAuthenticated) {
      router.replace('/board')
    } else {
      router.replace('/login')
    }
  }, [isLoaded, isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">読み込み中...</div>
    </div>
  )
}
