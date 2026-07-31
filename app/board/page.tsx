'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Request } from '@/types'
import RequestCard from '@/components/RequestCard'
import Nav from '@/components/Nav'

type Tab = 'in_progress' | 'completed'

function sortInProgress(requests: Request[]): Request[] {
  return [...requests].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
}

export default function BoardPage() {
  const { isAuthenticated, isLoaded } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('in_progress')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async (status: Tab) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('requests')
      .select('*, request_recipients(*), comments(*), reactions(*)')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (!error) {
      const sorted = status === 'in_progress' ? sortInProgress(data ?? []) : (data ?? [])
      setRequests(sorted)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    fetchRequests(tab)
  }, [isLoaded, isAuthenticated, tab, fetchRequests, router])

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
  }

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">依頼掲示板</h1>
          <Link
            href="/board/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            ＋ 新しい依頼
          </Link>
        </div>

        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-5">
          <button
            onClick={() => handleTabChange('in_progress')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'in_progress'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            進行中
          </button>
          <button
            onClick={() => handleTabChange('completed')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'completed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            完了（履歴）
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm">読み込み中...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-3xl mb-3">{tab === 'in_progress' ? '🎉' : '📭'}</div>
            <p className="text-sm">
              {tab === 'in_progress'
                ? '進行中の依頼はありません！'
                : 'まだ完了した依頼はありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onDelete={(id) => setRequests((prev) => prev.filter((r) => r.id !== id))}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
