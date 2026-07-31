'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Meeting } from '@/types'
import { getMeetingColor, MEETING_TEAM_COLORS } from '@/lib/meeting-colors'
import { SOS_MEMBERS, TEAM_COLORS } from '@/lib/constants'
import Nav from '@/components/Nav'

export default function MeetingDetailPage() {
  const { isAuthenticated, isLoaded, userName } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [participating, setParticipating] = useState(false)

  const fetchMeeting = useCallback(async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*, meeting_recipients(*), meeting_participants(*)')
      .eq('id', id)
      .single()
    if (data) setMeeting(data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!isLoaded) return
    if (!isAuthenticated) { router.replace('/login'); return }
    fetchMeeting()
  }, [isLoaded, isAuthenticated, fetchMeeting, router])

  const toggleParticipation = async () => {
    if (!meeting) return
    setParticipating(true)
    const already = meeting.meeting_participants?.some((p) => p.user_name === userName)
    if (already) {
      await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', id)
        .eq('user_name', userName!)
    } else {
      await supabase
        .from('meeting_participants')
        .insert({ meeting_id: id, user_name: userName! })
    }
    await fetchMeeting()
    setParticipating(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await supabase.from('meetings').delete().eq('id', id)
    router.push('/meetings')
  }

  const fmt = (iso: string, opts?: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleString('ja-JP', opts ?? { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  if (!isLoaded || loading) return (
    <div className="min-h-screen bg-gray-50"><Nav />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">読み込み中...</div>
    </div>
  )

  if (!meeting) return (
    <div className="min-h-screen bg-gray-50"><Nav />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">会議が見つかりません</div>
    </div>
  )

  const color = getMeetingColor(meeting)
  const isSosMember = SOS_MEMBERS.includes(userName as typeof SOS_MEMBERS[number])
  const hasParticipated = meeting.meeting_participants?.some((p) => p.user_name === userName)
  const participants = meeting.meeting_participants ?? []
  const isUnattendedSos = meeting.is_sos && participants.length === 0

  const durationMin = meeting.end_at
    ? Math.round((new Date(meeting.end_at).getTime() - new Date(meeting.start_at).getTime()) / 60000)
    : null
  const durationLabel = durationMin === null ? null
    : durationMin < 60 ? `${durationMin}分`
    : `${Math.floor(durationMin / 60)}時間${durationMin % 60 > 0 ? `${durationMin % 60}分` : ''}`

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* 戻る + 編集・削除 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/meetings')}
            className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            ← ミーティングに戻る
          </button>
          <div className="flex items-center gap-2">
            <Link href={`/meetings/${id}/edit`}
              className="text-xs font-medium text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-gray-200 transition-colors">
              ✏️ 編集
            </Link>
            <button onClick={handleDelete} disabled={deleting}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                confirmDelete ? 'bg-red-500 text-white border-red-500' : 'text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-300'
              } disabled:opacity-50`}>
              {deleting ? '削除中...' : confirmDelete ? '本当に削除する？' : '🗑 削除'}
            </button>
          </div>
        </div>

        {/* SOS未対応アラート */}
        {isUnattendedSos && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-xl">🆘</span>
            <div>
              <p className="text-sm font-bold text-red-700">SOS！まだ誰も参加表明していません</p>
              <p className="text-xs text-red-500">そうたろう・すばる・りゅうせい・なな のうち誰かが参加してください</p>
            </div>
          </div>
        )}

        {/* 会議詳細カード */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          {/* カラーバー */}
          <div className="h-1.5" style={{ backgroundColor: color }} />

          <div className="p-5">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {meeting.is_sos && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isUnattendedSos ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {isUnattendedSos ? '🆘 SOS' : '✓ SOS対応済'}
                    </span>
                  )}
                  {meeting.series_id && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">🔁 定例</span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900">{meeting.title}</h1>
              </div>
            </div>

            {/* 日時 */}
            <div className="flex items-start gap-3 mb-3 text-sm text-gray-700">
              <span className="text-base">📅</span>
              <div>
                <p className="font-medium">{fmtDate(meeting.start_at)}</p>
                <p className="text-gray-500">
                  {fmtTime(meeting.start_at)}
                  {meeting.end_at && ` 〜 ${fmtTime(meeting.end_at)}`}
                  {durationLabel && `（${durationLabel}）`}
                </p>
              </div>
            </div>

            {/* 対象チーム */}
            {meeting.meeting_recipients && meeting.meeting_recipients.length > 0 && (
              <div className="flex items-start gap-3 mb-3">
                <span className="text-base">👥</span>
                <div className="flex flex-wrap gap-1.5">
                  {meeting.meeting_recipients.map((r) => (
                    <span key={r.id} className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.recipient_type === 'team'
                        ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {r.recipient_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* リンク */}
            <div className="space-y-2">
              {meeting.meeting_url && (
                <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                  <span>🎥</span><span className="truncate">会議に参加する</span>
                  <span className="text-xs text-gray-400 ml-auto">↗</span>
                </a>
              )}
              {meeting.notes_url && (
                <a href={meeting.notes_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                  <span>📝</span><span className="truncate">議事録を開く</span>
                  <span className="text-xs text-gray-400 ml-auto">↗</span>
                </a>
              )}
              {meeting.other_url && (
                <a href={meeting.other_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                  <span>🔗</span><span className="truncate">その他リンク</span>
                  <span className="text-xs text-gray-400 ml-auto">↗</span>
                </a>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
              登録者：{meeting.created_by}　{new Date(meeting.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>

        {/* SOS参加セクション */}
        {meeting.is_sos && (
          <div className={`rounded-2xl border p-4 mb-4 ${
            isUnattendedSos ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <p className="text-sm font-semibold text-gray-800 mb-3">
              🆘 SOS参加者
              {participants.length > 0 && ` (${participants.length}人)`}
            </p>

            {participants.length === 0 ? (
              <p className="text-sm text-gray-500 mb-3">まだ誰も参加表明していません</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {participants.map((p) => (
                  <span key={p.id} className="bg-white border border-orange-200 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
                    ✓ {p.user_name}
                  </span>
                ))}
              </div>
            )}

            {isSosMember && (
              <button
                onClick={toggleParticipation}
                disabled={participating}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  hasParticipated
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                } disabled:opacity-50`}
              >
                {participating ? '更新中...' : hasParticipated ? '✓ 参加済み（取り消す）' : '参加する'}
              </button>
            )}

            {!isSosMember && (
              <p className="text-xs text-gray-400 text-center">
                参加表明できるのは対象メンバーのみです
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
