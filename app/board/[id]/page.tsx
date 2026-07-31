'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Request, Comment, Reaction, ScheduleCandidate, ScheduleResponse } from '@/types'
import { EMOJIS, TEAM_COLORS } from '@/lib/constants'
import Nav from '@/components/Nav'
import ScheduleTable from '@/components/ScheduleTable'

export default function RequestDetailPage() {
  const { isAuthenticated, isLoaded, userName } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [request, setRequest] = useState<Request | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [tooltipEmoji, setTooltipEmoji] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [scheduleCandidates, setScheduleCandidates] = useState<ScheduleCandidate[]>([])
  const [scheduleResponses, setScheduleResponses] = useState<ScheduleResponse[]>([])

  const fetchData = useCallback(async () => {
    const [reqRes, cmtRes, rxnRes, scRes, srRes] = await Promise.all([
      supabase.from('requests').select('*, request_recipients(*)').eq('id', id).single(),
      supabase.from('comments').select('*').eq('request_id', id).order('created_at'),
      supabase.from('reactions').select('*').eq('request_id', id),
      supabase.from('schedule_candidates').select('*').eq('request_id', id).order('sort_order').order('date'),
      supabase.from('schedule_responses').select('*').eq('request_id', id),
    ])
    if (reqRes.data) setRequest(reqRes.data)
    if (cmtRes.data) setComments(cmtRes.data)
    if (rxnRes.data) setReactions(rxnRes.data)
    if (scRes.error) console.error('schedule_candidates fetch error:', scRes.error)
    if (scRes.data) setScheduleCandidates(scRes.data)
    if (srRes.error) console.error('schedule_responses fetch error:', srRes.error)
    if (srRes.data) setScheduleResponses(srRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!isLoaded) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    fetchData()
  }, [isLoaded, isAuthenticated, fetchData, router])

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const { error } = await supabase.from('requests').delete().eq('id', id)
    if (!error) router.push('/board')
    else setDeleting(false)
  }

  const toggleStatus = async () => {
    if (!request) return
    setStatusUpdating(true)
    const newStatus = request.status === 'in_progress' ? 'completed' : 'in_progress'
    const { error } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', id)
    if (!error) {
      setRequest((prev) => prev ? { ...prev, status: newStatus } : prev)
    }
    setStatusUpdating(false)
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setCommenting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ request_id: id, content: newComment.trim(), created_by: userName! })
      .select()
      .single()
    if (!error && data) {
      setComments((prev) => [...prev, data])
      setNewComment('')
    }
    setCommenting(false)
  }

  const toggleReaction = async (emoji: string) => {
    const existing = reactions.find(
      (r) => r.emoji === emoji && r.created_by === userName
    )
    if (existing) {
      const { error } = await supabase.from('reactions').delete().eq('id', existing.id)
      if (!error) setReactions((prev) => prev.filter((r) => r.id !== existing.id))
    } else {
      const { data, error } = await supabase
        .from('reactions')
        .insert({ request_id: id, emoji, created_by: userName! })
        .select()
        .single()
      if (!error && data) setReactions((prev) => [...prev, data])
    }
  }

  const reactionCounts = EMOJIS.map((emoji) => ({
    emoji,
    count: reactions.filter((r) => r.emoji === emoji).length,
    reacted: reactions.some((r) => r.emoji === emoji && r.created_by === userName),
    names: reactions.filter((r) => r.emoji === emoji).map((r) => r.created_by),
  }))

  const formatDate = (str: string) =>
    new Date(str).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatDeadline = (str: string) =>
    new Date(str + 'T00:00:00').toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
          依頼が見つかりません
        </div>
      </div>
    )
  }

  const isOverdue =
    request.deadline &&
    request.status === 'in_progress' &&
    new Date(request.deadline) < new Date(new Date().toDateString())

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* 戻るボタン + 編集・削除 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/board')}
            className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"
          >
            ← 掲示板に戻る
          </button>
          <div className="flex items-center gap-2">
            <Link
              href={`/board/${id}/edit`}
              className="text-xs font-medium text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200"
            >
              ✏️ 編集
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                confirmDelete
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  : 'text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-300 hover:bg-red-50'
              } disabled:opacity-50`}
            >
              {deleting ? '削除中...' : confirmDelete ? '本当に削除する？' : '🗑 削除'}
            </button>
          </div>
        </div>

        {/* 依頼カード */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-start gap-2 flex-1">
              {request.priority === 'urgent' && (
                <span className="shrink-0 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">
                  すぐやって！
                </span>
              )}
              <h1 className="text-lg font-bold text-gray-900">{request.title}</h1>
            </div>
            <span
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                request.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {request.status === 'in_progress' ? '進行中' : '✓ 完了'}
            </span>
          </div>

          <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
            {request.content}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {request.request_recipients?.map((r) => (
              <span
                key={r.id}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  r.recipient_type === 'team'
                    ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {r.recipient_name}
              </span>
            ))}
          </div>

          <div className="text-xs text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
            {request.deadline && (
              <p className={isOverdue ? 'text-red-500 font-medium' : ''}>
                期限：{formatDeadline(request.deadline)}
                {isOverdue && ' ⚠️ 期限超過'}
              </p>
            )}
            <p>
              依頼者：{request.created_by}　{formatDate(request.created_at)}
            </p>
          </div>
        </div>

        {/* 日程調整 */}
        {scheduleCandidates.length > 0 && (
          <div className="mb-4">
            <ScheduleTable
              candidates={scheduleCandidates}
              responses={scheduleResponses}
              requestId={id}
              currentUser={userName!}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* ステータス変更ボタン */}
        <button
          onClick={toggleStatus}
          disabled={statusUpdating}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors mb-6 ${
            request.status === 'in_progress'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {statusUpdating
            ? '更新中...'
            : request.status === 'in_progress'
            ? '✓ 完了にする'
            : '↩ 進行中に戻す'}
        </button>

        {/* リアクション */}
        <div
          className="bg-white rounded-2xl border border-gray-200 p-4 mb-4"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-reaction]')) return
            setTooltipEmoji(null)
          }}
        >
          <p className="text-xs font-medium text-gray-500 mb-3">リアクション</p>
          <div className="flex flex-wrap gap-2">
            {reactionCounts.map(({ emoji, count, reacted, names }) => (
              <div key={emoji} className="relative" data-reaction>
                {/* ツールチップ */}
                {tooltipEmoji === emoji && names.length > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                      {names.join('・')}
                    </div>
                    {/* 吹き出し三角 */}
                    <div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
                  </div>
                )}

                <div className="flex items-center rounded-full border-2 overflow-hidden transition-all"
                  style={{ borderColor: reacted ? '#60a5fa' : '#e5e7eb' }}
                >
                  {/* 絵文字部分：クリックでリアクション切り替え */}
                  <button
                    onClick={() => toggleReaction(emoji)}
                    className={`px-2.5 py-1.5 text-sm transition-colors ${
                      reacted ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {emoji}
                  </button>

                  {/* カウント部分：ホバー/タップで名前表示 */}
                  {count > 0 && (
                    <button
                      onMouseEnter={() => setTooltipEmoji(emoji)}
                      onMouseLeave={() => setTooltipEmoji(null)}
                      onTouchStart={() => setTooltipEmoji((prev) => prev === emoji ? null : emoji)}
                      className={`pr-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        reacted ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {count}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* コメント */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">
            コメント {comments.length > 0 && `(${comments.length})`}
          </p>

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">まだコメントはありません</p>
          )}

          <div className="space-y-3 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <div className="shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                  {comment.created_by[0]}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">
                      {comment.created_by}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* コメント投稿 */}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="コメントを入力..."
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={commenting || !newComment.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              送信
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
