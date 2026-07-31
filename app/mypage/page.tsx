'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS, TEAM_COLORS } from '@/lib/constants'
import { Request, Meeting } from '@/types'
import Nav from '@/components/Nav'

const SELECTABLE_TEAMS = TEAMS.filter((t) => t !== '全体')

type ItemType = 'request' | 'meeting'

export default function MyPage() {
  const { isAuthenticated, isLoaded, userName, userTeams, updateTeams } = useAuth()
  const router = useRouter()

  const [requests, setRequests] = useState<Request[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // チーム編集
  const [editingTeams, setEditingTeams] = useState(false)
  const [draftTeams, setDraftTeams] = useState<string[]>([])

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

  const isMyRecipient = useCallback(
    (recipientName: string) =>
      recipientName === '全体' ||
      recipientName === userName ||
      userTeams.includes(recipientName),
    [userName, userTeams]
  )

  const fetchData = useCallback(async () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [reqRes, mtgRes, dismissRes] = await Promise.all([
      supabase
        .from('requests')
        .select('*, request_recipients(*)')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false }),
      supabase
        .from('meetings')
        .select('*, meeting_recipients(*)')
        .gte('start_at', weekAgo)
        .order('start_at'),
      supabase
        .from('my_page_dismissals')
        .select('item_id')
        .eq('user_name', userName!),
    ])

    const dismissed = new Set((dismissRes.data ?? []).map((d) => d.item_id as string))
    setDismissedIds(dismissed)

    if (reqRes.data) {
      setRequests(
        reqRes.data.filter(
          (r) =>
            !dismissed.has(r.id) &&
            r.request_recipients?.some((rec: { recipient_name: string }) =>
              isMyRecipient(rec.recipient_name)
            )
        )
      )
    }

    if (mtgRes.data) {
      setMeetings(
        mtgRes.data.filter((m) => {
          if (dismissed.has(m.id)) return false
          const endTime = m.end_at ? new Date(m.end_at) : new Date(m.start_at)
          if (endTime <= now) return false
          return m.meeting_recipients?.some((rec: { recipient_name: string }) =>
            isMyRecipient(rec.recipient_name)
          )
        })
      )
    }

    setLoading(false)
  }, [isMyRecipient, userName])

  useEffect(() => {
    if (isLoaded && isAuthenticated) fetchData()
  }, [isLoaded, isAuthenticated, fetchData])

  // チーム保存後にデータ再取得
  useEffect(() => {
    if (loading && isLoaded && isAuthenticated) fetchData()
  }, [loading, isLoaded, isAuthenticated, fetchData])

  const dismiss = async (itemId: string, itemType: ItemType) => {
    // 楽観的に即消す
    if (itemType === 'request') {
      setRequests((prev) => prev.filter((r) => r.id !== itemId))
    } else {
      setMeetings((prev) => prev.filter((m) => m.id !== itemId))
    }
    setDismissedIds((prev) => new Set([...prev, itemId]))

    await supabase.from('my_page_dismissals').insert({
      user_name: userName!,
      item_type: itemType,
      item_id: itemId,
    })
  }

  const startEditTeams = () => {
    setDraftTeams(userTeams)
    setEditingTeams(true)
  }

  const saveTeams = () => {
    updateTeams(draftTeams)
    setEditingTeams(false)
    setLoading(true)
  }

  const formatDeadline = (str: string) =>
    new Date(str + 'T00:00:00').toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    })

  const formatMeetingTime = (start: string, end: string | null) => {
    const s = new Date(start)
    const dateStr = s.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    })
    const timeStr = s.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    if (end) {
      const endTime = new Date(end).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      return `${dateStr} ${timeStr}〜${endTime}`
    }
    return `${dateStr} ${timeStr}〜`
  }

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        <h1 className="text-xl font-bold text-gray-900 mb-5">👤 マイページ</h1>

        {/* 所属チーム */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">所属チーム</p>
            {!editingTeams ? (
              <button
                onClick={startEditTeams}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                ✏️ 変更
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTeams(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveTeams}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            )}
          </div>

          {!editingTeams ? (
            <div className="flex flex-wrap gap-1.5">
              {userTeams.length > 0 ? (
                userTeams.map((t) => (
                  <span
                    key={t}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      TEAM_COLORS[t] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {t}
                  </span>
                ))
              ) : (
                <p className="text-xs text-gray-400">未設定（「変更」から設定できます）</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {SELECTABLE_TEAMS.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() =>
                    setDraftTeams((prev) =>
                      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                    draftTeams.includes(team)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 text-sm py-16">読み込み中...</p>
        ) : (
          <>
            {/* 自分宛の依頼 */}
            <section className="mb-6">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                📋 自分宛の依頼
                {requests.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full normal-case">
                    {requests.length}件
                  </span>
                )}
              </p>

              {requests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 bg-white rounded-2xl border border-gray-100">
                  進行中の依頼はありません
                </p>
              ) : (
                <div className="space-y-2">
                  {requests.map((req) => {
                    const isOverdue =
                      req.deadline &&
                      new Date(req.deadline) < new Date(new Date().toDateString())
                    return (
                      <div key={req.id} className="relative group">
                        <Link
                          href={`/board/${req.id}`}
                          className="block bg-white rounded-2xl border border-gray-200 px-4 py-3 pr-12 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-2 mb-1.5">
                            {req.priority === 'urgent' && (
                              <span className="shrink-0 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">
                                すぐやって！
                              </span>
                            )}
                            <p className="text-sm font-semibold text-gray-900 flex-1 leading-snug">
                              {req.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {req.request_recipients?.map((r) => (
                              <span
                                key={r.id}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  r.recipient_type === 'team'
                                    ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {r.recipient_name}
                              </span>
                            ))}
                            {req.deadline && (
                              <span
                                className={`text-xs ml-auto ${
                                  isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'
                                }`}
                              >
                                期限 {formatDeadline(req.deadline)}
                                {isOverdue && ' ⚠️'}
                              </span>
                            )}
                          </div>
                        </Link>
                        {/* 確認済みボタン */}
                        <button
                          onClick={() => dismiss(req.id, 'request')}
                          title="確認済みにする（自分のマイページから消えます）"
                          className="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 rounded-full border-2 border-gray-200 text-gray-300 hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-all flex items-center justify-center text-sm font-bold"
                        >
                          ✓
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* 自分宛のミーティング */}
            <section>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                📅 自分宛の会議
                {meetings.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full normal-case">
                    {meetings.length}件
                  </span>
                )}
              </p>

              {meetings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 bg-white rounded-2xl border border-gray-100">
                  予定されている会議はありません
                </p>
              ) : (
                <div className="space-y-2">
                  {meetings.map((m) => (
                    <Link
                      key={m.id}
                      href={`/meetings/${m.id}`}
                      className="block bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {m.is_sos && (
                          <span className="shrink-0 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            🆘 SOS
                          </span>
                        )}
                        <p className="text-sm font-semibold text-gray-900 flex-1 leading-snug">
                          {m.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mb-1.5">
                        {formatMeetingTime(m.start_at, m.end_at)}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {m.meeting_recipients?.map((r) => (
                          <span
                            key={r.id}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              r.recipient_type === 'team'
                                ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {r.recipient_name}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
