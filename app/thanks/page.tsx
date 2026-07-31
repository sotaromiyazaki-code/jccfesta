'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS } from '@/lib/constants'
import { Thanks, ThanksReaction, ThanksComment } from '@/types'
import Nav from '@/components/Nav'
import ThanksCard from '@/components/ThanksCard'

type RecipientMode = 'team' | 'individual'

export default function ThanksPage() {
  const { isAuthenticated, isLoaded, userName } = useAuth()
  const router = useRouter()

  const [thanks, setThanks] = useState<Thanks[]>([])
  const [reactions, setReactions] = useState<ThanksReaction[]>([])
  const [comments, setComments] = useState<ThanksComment[]>([])
  const [loading, setLoading] = useState(true)

  // フォーム
  const [formOpen, setFormOpen] = useState(false)
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('team')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [individualName, setIndividualName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

  const fetchAll = useCallback(async () => {
    const [thanksRes, reactionsRes, commentsRes] = await Promise.all([
      supabase.from('thanks').select('*').order('created_at', { ascending: false }),
      supabase.from('thanks_reactions').select('*'),
      supabase.from('thanks_comments').select('*').order('created_at'),
    ])
    if (thanksRes.data) setThanks(thanksRes.data)
    if (reactionsRes.data) setReactions(reactionsRes.data)
    if (commentsRes.data) setComments(commentsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isLoaded && isAuthenticated) fetchAll()
  }, [isLoaded, isAuthenticated, fetchAll])

  const resetForm = () => {
    setRecipientMode('team')
    setSelectedTeam('')
    setIndividualName('')
    setMessage('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const recipientName =
      recipientMode === 'team' ? selectedTeam : individualName.trim()

    if (!recipientName) {
      setError(recipientMode === 'team' ? '送り先のチームを選んでください' : '宛名を入力してください')
      return
    }
    if (!message.trim()) {
      setError('メッセージを入力してください')
      return
    }

    setSubmitting(true)
    const { data, error: insertError } = await supabase
      .from('thanks')
      .insert({
        message: message.trim(),
        from_name: userName!,
        recipient_type: recipientMode,
        recipient_name: recipientName,
      })
      .select()
      .single()

    if (insertError || !data) {
      setError('送信に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }

    setThanks((prev) => [data, ...prev])
    resetForm()
    setFormOpen(false)
    setSubmitting(false)
  }

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-amber-50/40">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">✨ Thanks</h1>
            <p className="text-xs text-gray-400 mt-0.5">頑張りを称え合おう</p>
          </div>
          <button
            onClick={() => { setFormOpen((v) => !v); if (formOpen) resetForm() }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              formOpen
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-yellow-400 text-white hover:bg-yellow-500 shadow-sm'
            }`}
          >
            {formOpen ? 'キャンセル' : '＋ Thanksを送る'}
          </button>
        </div>

        {/* 送信フォーム */}
        {formOpen && (
          <div className="bg-white rounded-2xl border border-yellow-200 shadow-sm p-5 mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Thanksを送る</p>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* チーム / 個人 切替 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">宛先の種類</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
                  {(['team', 'individual'] as RecipientMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setRecipientMode(mode); setSelectedTeam(''); setIndividualName('') }}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        recipientMode === mode
                          ? 'bg-yellow-400 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {mode === 'team' ? '👥 チーム' : '👤 個人'}
                    </button>
                  ))}
                </div>
              </div>

              {/* チーム選択 */}
              {recipientMode === 'team' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">チームを選択</label>
                  <div className="flex flex-wrap gap-2">
                    {TEAMS.map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => setSelectedTeam(team)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                          selectedTeam === team
                            ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 個人入力 */}
              {recipientMode === 'individual' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">宛名</label>
                  <input
                    type="text"
                    value={individualName}
                    onChange={(e) => setIndividualName(e.target.value)}
                    placeholder="名前を入力"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              )}

              {/* メッセージ */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">メッセージ</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="感謝や称賛のメッセージを書いてください"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-yellow-400 text-white py-3 rounded-xl font-semibold hover:bg-yellow-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? '送信中...' : '✨ Thanksを送る'}
              </button>
            </form>
          </div>
        )}

        {/* フィード */}
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-16">読み込み中...</p>
        ) : thanks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-gray-400 text-sm">まだThanksがありません</p>
            <p className="text-gray-300 text-xs mt-1">最初のThanksを送ってみよう！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {thanks.map((t) => (
              <ThanksCard
                key={t.id}
                thanks={t}
                reactions={reactions.filter((r) => r.thanks_id === t.id)}
                comments={comments.filter((c) => c.thanks_id === t.id)}
                currentUser={userName!}
                onRefresh={fetchAll}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
