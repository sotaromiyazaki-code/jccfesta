'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS } from '@/lib/constants'
import Nav from '@/components/Nav'

interface Recipient {
  type: 'team' | 'individual'
  name: string
}

export default function EditRequestPage() {
  const { isAuthenticated, isLoaded } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<'urgent' | 'normal'>('normal')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [individuals, setIndividuals] = useState<string[]>([])
  const [individualInput, setIndividualInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isAuthenticated) { router.replace('/login'); return }

    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*, request_recipients(*)')
        .eq('id', id)
        .single()

      if (error || !data) { router.replace('/board'); return }

      setTitle(data.title)
      setContent(data.content)
      setDeadline(data.deadline ?? '')
      setPriority(data.priority)

      const teams = data.request_recipients
        .filter((r: { recipient_type: string }) => r.recipient_type === 'team')
        .map((r: { recipient_name: string }) => r.recipient_name)
      const inds = data.request_recipients
        .filter((r: { recipient_type: string }) => r.recipient_type === 'individual')
        .map((r: { recipient_name: string }) => r.recipient_name)
      setSelectedTeams(teams)
      setIndividuals(inds)
      setLoading(false)
    }
    fetchRequest()
  }, [isLoaded, isAuthenticated, id, router])

  const toggleTeam = (team: string) =>
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )

  const addIndividual = () => {
    const name = individualInput.trim()
    if (name && !individuals.includes(name)) setIndividuals((prev) => [...prev, name])
    setIndividualInput('')
  }

  const removeIndividual = (name: string) =>
    setIndividuals((prev) => prev.filter((n) => n !== name))

  const recipients: Recipient[] = [
    ...selectedTeams.map((t) => ({ type: 'team' as const, name: t })),
    ...individuals.map((n) => ({ type: 'individual' as const, name: n })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!content.trim()) return setError('内容を入力してください')
    if (recipients.length === 0) return setError('送信先を1つ以上選択してください')

    setSubmitting(true)

    const { error: updateErr } = await supabase
      .from('requests')
      .update({ title: title.trim(), content: content.trim(), deadline: deadline || null, priority })
      .eq('id', id)

    if (updateErr) {
      setError('更新に失敗しました。')
      setSubmitting(false)
      return
    }

    // 宛先を一旦全削除して再挿入
    await supabase.from('request_recipients').delete().eq('request_id', id)
    const { error: recErr } = await supabase.from('request_recipients').insert(
      recipients.map((r) => ({ request_id: id, recipient_type: r.type, recipient_name: r.name }))
    )

    if (recErr) {
      setError('送信先の更新に失敗しました。')
      setSubmitting(false)
      return
    }

    router.push(`/board/${id}`)
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">依頼を編集</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">優先度</label>
              <div className="flex gap-3">
                {(['urgent', 'normal'] as const).map((p) => (
                  <label
                    key={p}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      priority === p
                        ? p === 'urgent'
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="sr-only"
                    />
                    <span>{p === 'urgent' ? '🔴 すぐやって！' : '🔵 通常'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限（任意）</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                送信先チーム <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TEAMS.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => toggleTeam(team)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      selectedTeams.includes(team)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">個人宛（任意）</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={individualInput}
                  onChange={(e) => setIndividualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndividual() } }}
                  placeholder="名前を入力してEnter"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addIndividual}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
                >
                  追加
                </button>
              </div>
              {individuals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {individuals.map((name) => (
                    <span key={name} className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      {name}
                      <button type="button" onClick={() => removeIndividual(name)} className="text-indigo-400 hover:text-indigo-700 font-bold">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {recipients.length > 0 && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                送信先：{recipients.map((r) => r.name).join('、')}
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '保存中...' : '変更を保存する'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
