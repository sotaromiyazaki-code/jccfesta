'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS } from '@/lib/constants'
import Nav from '@/components/Nav'
import MultiSelectCalendar from '@/components/MultiSelectCalendar'

interface Recipient {
  type: 'team' | 'individual'
  name: string
}

interface DateTimeEntry {
  enabled: boolean
  from: string
  to: string
}

export default function NewRequestPage() {
  const { isAuthenticated, isLoaded, userName } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<'urgent' | 'normal'>('normal')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [individualInput, setIndividualInput] = useState('')
  const [individuals, setIndividuals] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 日程調整
  const [schedulingEnabled, setSchedulingEnabled] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [dateTimes, setDateTimes] = useState<Record<string, DateTimeEntry>>({})

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

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

  const toggleDate = (ymd: string) =>
    setSelectedDates((prev) =>
      prev.includes(ymd) ? prev.filter((d) => d !== ymd) : [...prev, ymd]
    )

  const setTimeEnabled = (ymd: string, enabled: boolean) =>
    setDateTimes((prev) => ({
      ...prev,
      [ymd]: { enabled, from: prev[ymd]?.from ?? '', to: prev[ymd]?.to ?? '' },
    }))

  const setTimeFrom = (ymd: string, from: string) =>
    setDateTimes((prev) => ({ ...prev, [ymd]: { ...prev[ymd], from } }))

  const setTimeTo = (ymd: string, to: string) =>
    setDateTimes((prev) => ({ ...prev, [ymd]: { ...prev[ymd], to } }))

  const recipients: Recipient[] = [
    ...selectedTeams.map((t) => ({ type: 'team' as const, name: t })),
    ...individuals.map((n) => ({ type: 'individual' as const, name: n })),
  ]

  const sortedDates = [...selectedDates].sort()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!content.trim()) return setError('内容を入力してください')
    if (recipients.length === 0) return setError('送信先を1つ以上選択してください')

    setSubmitting(true)

    const { data: reqData, error: reqError } = await supabase
      .from('requests')
      .insert({
        title: title.trim(),
        content: content.trim(),
        deadline: deadline || null,
        priority,
        status: 'in_progress',
        created_by: userName!,
      })
      .select()
      .single()

    if (reqError || !reqData) {
      setError('送信に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }

    const { error: recError } = await supabase.from('request_recipients').insert(
      recipients.map((r) => ({
        request_id: reqData.id,
        recipient_type: r.type,
        recipient_name: r.name,
      }))
    )

    if (recError) {
      setError('送信先の保存に失敗しました。')
      setSubmitting(false)
      return
    }

    if (schedulingEnabled && sortedDates.length > 0) {
      const { error: scError } = await supabase.from('schedule_candidates').insert(
        sortedDates.map((date, i) => {
          const dt = dateTimes[date]
          return {
            request_id: reqData.id,
            date,
            time_from: dt?.enabled && dt.from ? dt.from : null,
            time_to: dt?.enabled && dt.to ? dt.to : null,
            sort_order: i,
          }
        })
      )
      if (scError) {
        console.error('schedule_candidates insert error:', scError)
        setError(`日程候補の保存に失敗しました: ${scError.message}`)
        setSubmitting(false)
        return
      }
    }

    router.push('/board')
  }

  if (!isLoaded) return null

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
          <h1 className="text-xl font-bold text-gray-900">新しい依頼</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="依頼のタイトル"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="依頼の詳細を書いてください"
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 優先度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">優先度</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${priority === 'urgent' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <input type="radio" name="priority" value="urgent" checked={priority === 'urgent'} onChange={() => setPriority('urgent')} className="sr-only" />
                  <span className="text-base">🔴</span>
                  <span className="text-sm font-medium">すぐやって！</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${priority === 'normal' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <input type="radio" name="priority" value="normal" checked={priority === 'normal'} onChange={() => setPriority('normal')} className="sr-only" />
                  <span className="text-base">🔵</span>
                  <span className="text-sm font-medium">通常</span>
                </label>
              </div>
            </div>

            {/* 期限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限（任意）</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 送信先チーム */}
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
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${selectedTeams.includes(team) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            {/* 個人宛 */}
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
                <button type="button" onClick={addIndividual} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">
                  追加
                </button>
              </div>
              {individuals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {individuals.map((name) => (
                    <span key={name} className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      {name}
                      <button type="button" onClick={() => removeIndividual(name)} className="text-indigo-400 hover:text-indigo-700 font-bold leading-none">×</button>
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

            {/* ─── 日程調整 ─── */}
            <div className={`border rounded-xl p-4 transition-colors ${schedulingEnabled ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
              {/* トグル */}
              <button
                type="button"
                onClick={() => setSchedulingEnabled(!schedulingEnabled)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${schedulingEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${schedulingEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">📅 日程調整を追加</span>
              </button>

              {schedulingEnabled && (
                <div className="mt-5">
                  {/* カレンダー */}
                  <MultiSelectCalendar selected={selectedDates} onToggle={toggleDate} />

                  {/* 選択した候補日の時間帯設定 */}
                  {sortedDates.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        選択した候補日 — 時間帯（任意）
                      </p>
                      <div className="space-y-2">
                        {sortedDates.map((ymd) => {
                          const d = new Date(ymd + 'T00:00:00')
                          const label = d.toLocaleDateString('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                            weekday: 'short',
                          })
                          const dt = dateTimes[ymd]
                          return (
                            <div key={ymd} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5">
                              <div className="flex items-center gap-3">
                                {/* 選択解除 */}
                                <button
                                  type="button"
                                  onClick={() => toggleDate(ymd)}
                                  className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center shrink-0 hover:bg-blue-600"
                                >
                                  ✓
                                </button>
                                <span className="text-sm font-semibold text-gray-800 flex-1">{label}</span>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={dt?.enabled ?? false}
                                    onChange={(e) => setTimeEnabled(ymd, e.target.checked)}
                                    className="rounded accent-blue-500"
                                  />
                                  時間帯を設定
                                </label>
                              </div>
                              {dt?.enabled && (
                                <div className="flex items-center gap-2 mt-2 pl-8">
                                  <input
                                    type="time"
                                    value={dt.from}
                                    onChange={(e) => setTimeFrom(ymd, e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-400 text-sm shrink-0">〜</span>
                                  <input
                                    type="time"
                                    value={dt.to}
                                    onChange={(e) => setTimeTo(ymd, e.target.value)}
                                    placeholder="任意"
                                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        ✓ をタップすると選択を解除できます
                      </p>
                    </div>
                  )}

                  {sortedDates.length === 0 && (
                    <p className="mt-4 text-xs text-gray-400 text-center py-2">
                      カレンダーの日付をタップして候補日を選択してください
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '送信中...' : '依頼を送信する'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
