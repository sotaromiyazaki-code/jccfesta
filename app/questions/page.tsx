'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAM_COLORS } from '@/lib/constants'
import { Question, QuestionComment } from '@/types'
import Nav from '@/components/Nav'

type Tab = 'unanswered' | 'answered'

export default function QuestionsPage() {
  const { isAuthenticated, isLoaded } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('unanswered')
  const [questions, setQuestions] = useState<Question[]>([])
  const [comments, setComments] = useState<QuestionComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

  const fetchAll = useCallback(async () => {
    const [qRes, cRes] = await Promise.all([
      supabase
        .from('questions')
        .select('*, question_recipients(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('question_comments')
        .select('*')
        .order('created_at'),
    ])
    if (qRes.data) setQuestions(qRes.data)
    if (cRes.data) setComments(cRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isLoaded && isAuthenticated) fetchAll()
  }, [isLoaded, isAuthenticated, fetchAll])

  const formatDate = (str: string) =>
    new Date(str).toLocaleString('ja-JP', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const filtered = questions.filter((q) => q.status === tab)

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">❓ 質問箱</h1>
          <Link
            href="/questions/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            ＋ 質問を送る
          </Link>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-4">
          {([['unanswered', '未回答'], ['answered', '回答済み（FAQ）']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {questions.filter((q) => q.status === t).length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {questions.filter((q) => q.status === t).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 text-sm py-16">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-16">
            {tab === 'unanswered' ? '未回答の質問はありません' : '回答済みの質問はありません'}
          </p>
        ) : tab === 'unanswered' ? (
          /* ── 未回答一覧 ── */
          <div className="space-y-3">
            {filtered.map((q) => {
              const qComments = comments.filter((c) => c.question_id === q.id)
              return (
                <Link
                  key={q.id}
                  href={`/questions/${q.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      未回答
                    </span>
                    <span className="text-xs text-gray-500">{q.from_team}チーム・{q.from_name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(q.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {q.question_recipients?.map((r) => (
                      <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.recipient_type === 'team'
                          ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {r.recipient_name}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{q.content}</p>
                  {qComments.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">💬 {qComments.length}件の回答</p>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          /* ── 回答済み（FAQ）一覧 ── */
          <div className="space-y-4">
            {filtered.map((q) => {
              const qComments = comments.filter((c) => c.question_id === q.id)
              return (
                <div key={q.id} className="bg-white rounded-2xl border border-green-100 overflow-hidden">
                  {/* 質問ヘッダー */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                        回答済み
                      </span>
                      <span className="text-xs text-gray-500">{q.from_team}チーム・{q.from_name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{formatDate(q.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {q.question_recipients?.map((r) => (
                        <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.recipient_type === 'team'
                            ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {r.recipient_name}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      Q: {q.content}
                    </p>
                  </div>

                  {/* コメント（回答）一覧 */}
                  {qComments.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-2.5 bg-gray-50/50">
                      {qComments.map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <div className="shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                            {c.created_by[0]}
                          </div>
                          <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-gray-700">{c.created_by}</span>
                              <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-4 py-2 text-right">
                    <Link href={`/questions/${q.id}`} className="text-xs text-gray-400 hover:text-purple-600">
                      詳細・コメントを見る →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
