'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAM_COLORS } from '@/lib/constants'
import { Question, QuestionComment } from '@/types'
import Nav from '@/components/Nav'

export default function QuestionDetailPage() {
  const { isAuthenticated, isLoaded, userName } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [question, setQuestion] = useState<Question | null>(null)
  const [comments, setComments] = useState<QuestionComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

  const fetchData = useCallback(async () => {
    const [qRes, cRes] = await Promise.all([
      supabase.from('questions').select('*, question_recipients(*)').eq('id', id).single(),
      supabase.from('question_comments').select('*').eq('question_id', id).order('created_at'),
    ])
    if (qRes.data) setQuestion(qRes.data)
    if (cRes.data) setComments(cRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (isLoaded && isAuthenticated) fetchData()
  }, [isLoaded, isAuthenticated, fetchData])

  const toggleStatus = async () => {
    if (!question) return
    setStatusUpdating(true)
    const newStatus = question.status === 'unanswered' ? 'answered' : 'unanswered'
    const { error } = await supabase.from('questions').update({ status: newStatus }).eq('id', id)
    if (!error) setQuestion((prev) => prev ? { ...prev, status: newStatus } : prev)
    setStatusUpdating(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (!error) router.push('/questions')
    else setDeleting(false)
  }

  // 削除確認タイムアウト
  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDelete])

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setCommenting(true)
    const { data, error } = await supabase
      .from('question_comments')
      .insert({ question_id: id, content: newComment.trim(), created_by: userName! })
      .select()
      .single()
    if (!error && data) {
      setComments((prev) => [...prev, data])
      setNewComment('')
    }
    setCommenting(false)
  }

  const formatDate = (str: string) =>
    new Date(str).toLocaleString('ja-JP', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50"><Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50"><Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">質問が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* 戻る + 編集・削除 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/questions')} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            ← 質問箱に戻る
          </button>
          <div className="flex items-center gap-2">
            <Link
              href={`/questions/${id}/edit`}
              className="text-xs font-medium text-gray-500 hover:text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors border border-gray-200"
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

        {/* 質問カード */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              question.status === 'unanswered'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {question.status === 'unanswered' ? '未回答' : '✓ 回答済み'}
            </span>
            <div className="flex flex-wrap gap-1">
              {question.question_recipients?.map((r) => (
                <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.recipient_type === 'team'
                    ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {r.recipient_name}
                </span>
              ))}
            </div>
          </div>

          <p className="text-gray-800 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
            {question.content}
          </p>

          <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            <p>送信元：{question.from_team}チーム・{question.from_name}　{formatDate(question.created_at)}</p>
          </div>
        </div>

        {/* ステータス切替 */}
        <button
          onClick={toggleStatus}
          disabled={statusUpdating}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors mb-6 ${
            question.status === 'unanswered'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {statusUpdating ? '更新中...' : question.status === 'unanswered' ? '✓ 回答済みにする' : '↩ 未回答に戻す'}
        </button>

        {/* コメント */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">
            コメント {comments.length > 0 && `(${comments.length})`}
          </p>

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">まだコメントはありません</p>
          )}

          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="shrink-0 w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                  {c.created_by[0]}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{c.created_by}</span>
                    <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="コメントを入力..."
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={commenting || !newComment.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              送信
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
