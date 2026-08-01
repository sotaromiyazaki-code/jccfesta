'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS } from '@/lib/constants'
import Nav from '@/components/Nav'

const DEFAULT_RECIPIENT = 'インターン'

interface Recipient { type: 'team' | 'individual'; name: string }

export default function EditQuestionPage() {
  const { isAuthenticated, isLoaded, userName, userTeams } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [content, setContent] = useState('')
  const [fromTeam, setFromTeam] = useState('')
  const [extraEnabled, setExtraEnabled] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [individuals, setIndividuals] = useState<string[]>([])
  const [individualInput, setIndividualInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

  useEffect(() => {
    if (!isLoaded || !isAuthenticated) return
    const fetch = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*, question_recipients(*)')
        .eq('id', id)
        .single()
      if (!data) { router.push('/questions'); return }
      setContent(data.content)
      setFromTeam(data.from_team)
      const recipients = data.question_recipients ?? []
      const extraTeams = recipients
        .filter((r: { recipient_type: string; recipient_name: string }) => r.recipient_type === 'team' && r.recipient_name !== DEFAULT_RECIPIENT)
        .map((r: { recipient_name: string }) => r.recipient_name)
      const extraIndividuals = recipients
        .filter((r: { recipient_type: string }) => r.recipient_type === 'individual')
        .map((r: { recipient_name: string }) => r.recipient_name)
      if (extraTeams.length > 0 || extraIndividuals.length > 0) {
        setExtraEnabled(true)
        setSelectedTeams(extraTeams)
        setIndividuals(extraIndividuals)
      }
      setLoading(false)
    }
    fetch()
  }, [isLoaded, isAuthenticated, id, router])

  const toggleTeam = (t: string) =>
    setSelectedTeams((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])

  const addIndividual = () => {
    const n = individualInput.trim()
    if (n && !individuals.includes(n)) setIndividuals((p) => [...p, n])
    setIndividualInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!content.trim()) return setError('質問内容を入力してください')
    if (!fromTeam) return setError('送信元チームを選択してください')

    setSubmitting(true)

    const { error: qErr } = await supabase
      .from('questions')
      .update({ content: content.trim(), from_team: fromTeam })
      .eq('id', id)

    if (qErr) {
      setError('更新に失敗しました。')
      setSubmitting(false)
      return
    }

    // 宛先を一旦削除して再挿入
    await supabase.from('question_recipients').delete().eq('question_id', id)

    const extraRecipients: Recipient[] = extraEnabled
      ? [
          ...selectedTeams.filter((t) => t !== DEFAULT_RECIPIENT).map((t) => ({ type: 'team' as const, name: t })),
          ...individuals.map((n) => ({ type: 'individual' as const, name: n })),
        ]
      : []

    const allRecipients: Recipient[] = [
      { type: 'team', name: DEFAULT_RECIPIENT },
      ...extraRecipients,
    ]

    await supabase.from('question_recipients').insert(
      allRecipients.map((r) => ({
        question_id: id,
        recipient_type: r.type,
        recipient_name: r.name,
      }))
    )

    router.push(`/questions/${id}`)
  }

  const fromTeamOptions = userTeams.length > 0 ? userTeams : TEAMS.filter((t) => t !== '全体')

  if (!isLoaded || loading) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <h1 className="text-xl font-bold text-gray-900">質問を編集</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 送信元チーム */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                送信元チーム <span className="text-red-500">*</span>
              </label>
              {userTeams.length === 1 ? (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5">
                  {userTeams[0]}チーム・{userName}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fromTeamOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFromTeam(t)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                        fromTeam === t
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 質問内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                質問内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* 宛先 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">宛先</label>
              <span className="bg-teal-100 text-teal-700 text-sm font-medium px-3 py-1 rounded-full">
                インターン（デフォルト）
              </span>
            </div>

            {/* 他にも聞くトグル */}
            <div className={`border rounded-xl p-4 transition-colors ${extraEnabled ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setExtraEnabled(!extraEnabled)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${extraEnabled ? 'bg-purple-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${extraEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">他のチーム・人にも聞く</span>
              </button>

              {extraEnabled && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">追加の宛先チーム</p>
                    <div className="flex flex-wrap gap-2">
                      {TEAMS.filter((t) => t !== DEFAULT_RECIPIENT).map((team) => (
                        <button
                          key={team}
                          type="button"
                          onClick={() => toggleTeam(team)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                            selectedTeams.includes(team)
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">個人指名（任意）</p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={individualInput}
                        onChange={(e) => setIndividualInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndividual() } }}
                        placeholder="名前を入力してEnter"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button type="button" onClick={addIndividual}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">
                        追加
                      </button>
                    </div>
                    {individuals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {individuals.map((n) => (
                          <span key={n} className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                            {n}
                            <button type="button" onClick={() => setIndividuals((p) => p.filter((x) => x !== n))}
                              className="text-indigo-400 hover:text-indigo-700 font-bold">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '更新中...' : '変更を保存する'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
