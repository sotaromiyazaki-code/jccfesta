'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS } from '@/lib/constants'
import Nav from '@/components/Nav'

interface Recipient { type: 'team' | 'individual'; name: string }

function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  durationMs: number,
  pattern: 'weekly' | 'biweekly'
): Array<{ start: Date; end: Date }> {
  const result: Array<{ start: Date; end: Date }> = []
  const interval = pattern === 'weekly' ? 7 : 14
  let cur = new Date(startDate)
  while (cur <= endDate && result.length < 52) {
    result.push({ start: new Date(cur), end: new Date(cur.getTime() + durationMs) })
    cur = new Date(cur)
    cur.setDate(cur.getDate() + interval)
  }
  return result
}

export default function NewMeetingPage() {
  const { isAuthenticated, isLoaded, userName } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [notesUrl, setNotesUrl] = useState('')
  const [otherUrl, setOtherUrl] = useState('')
  const [isSos, setIsSos] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [individuals, setIndividuals] = useState<string[]>([])
  const [individualInput, setIndividualInput] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly'>('weekly')
  const [recurringEnd, setRecurringEnd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoaded && !isAuthenticated) router.replace('/login')
  }, [isLoaded, isAuthenticated, router])

  const toggleTeam = (t: string) =>
    setSelectedTeams((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])

  const addIndividual = () => {
    const n = individualInput.trim()
    if (n && !individuals.includes(n)) setIndividuals((p) => [...p, n])
    setIndividualInput('')
  }

  const recipients: Recipient[] = [
    ...selectedTeams.map((t) => ({ type: 'team' as const, name: t })),
    ...individuals.map((n) => ({ type: 'individual' as const, name: n })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('タイトルを入力してください')
    if (!startAt) return setError('開始日時を入力してください')
    if (endAt && new Date(endAt) <= new Date(startAt)) return setError('終了日時は開始日時より後にしてください')
    if (recipients.length === 0) return setError('対象チームまたは個人を選択してください')
    if (isRecurring && !recurringEnd) return setError('繰り返し終了日を入力してください')

    setSubmitting(true)

    const startDate = new Date(startAt)
    const endDate = endAt ? new Date(endAt) : null
    const durationMs = endDate ? endDate.getTime() - startDate.getTime() : 0
    const seriesId = isRecurring ? uuidv4() : null

    const dates = isRecurring
      ? generateRecurringDates(startDate, new Date(recurringEnd + 'T23:59:59'), durationMs, recurringPattern)
      : [{ start: startDate, end: endDate }]

    for (const { start, end } of dates) {
      const { data: mtg, error: mtgErr } = await supabase
        .from('meetings')
        .insert({
          title: title.trim(),
          start_at: start.toISOString(),
          end_at: end ? end.toISOString() : null,
          meeting_url: meetingUrl || null,
          notes_url: notesUrl || null,
          other_url: otherUrl || null,
          is_sos: isSos,
          series_id: seriesId,
          created_by: userName!,
        })
        .select()
        .single()

      if (mtgErr || !mtg) {
        setError('登録に失敗しました。')
        setSubmitting(false)
        return
      }

      await supabase.from('meeting_recipients').insert(
        recipients.map((r) => ({ meeting_id: mtg.id, recipient_type: r.type, recipient_name: r.name }))
      )
    }

    router.push('/meetings')
  }

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <h1 className="text-xl font-bold text-gray-900">新しい会議</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="会議のタイトル"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* 開始・終了日時 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日時 <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了日時（任意）</label>
                <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* 対象チーム */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">対象チーム <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {TEAMS.map((team) => (
                  <button key={team} type="button" onClick={() => toggleTeam(team)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      selectedTeams.includes(team)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {team}
                  </button>
                ))}
              </div>
            </div>

            {/* 個人指定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">個人指定（任意）</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={individualInput} onChange={(e) => setIndividualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndividual() } }}
                  placeholder="名前を入力してEnter"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={addIndividual}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">追加</button>
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

            {/* リンク類 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会議URL（任意）</label>
                <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://zoom.us/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">議事録リンク（任意）</label>
                <input type="url" value={notesUrl} onChange={(e) => setNotesUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">その他リンク（任意）</label>
                <input type="url" value={otherUrl} onChange={(e) => setOtherUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* SOS設定 */}
            <label className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer">
              <div className={`w-11 h-6 rounded-full transition-colors relative ${isSos ? 'bg-orange-500' : 'bg-gray-300'}`}
                onClick={() => setIsSos(!isSos)}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSos ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-800">🆘 SOSフラグ</p>
                <p className="text-xs text-orange-600">そうたろう・すばる・りゅうせい・なな に対応を求める</p>
              </div>
            </label>

            {/* 繰り返し設定 */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm font-medium text-gray-700">🔁 繰り返し設定</span>
              </label>

              {isRecurring && (
                <div className="space-y-3 pl-7">
                  <div className="flex gap-3">
                    {(['weekly', 'biweekly'] as const).map((p) => (
                      <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        recurringPattern === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
                      }`}>
                        <input type="radio" name="pattern" value={p} checked={recurringPattern === p}
                          onChange={() => setRecurringPattern(p)} className="sr-only" />
                        <span className="text-sm font-medium">{p === 'weekly' ? '毎週' : '隔週'}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">繰り返し終了日</label>
                    <input type="date" value={recurringEnd} onChange={(e) => setRecurringEnd(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {startAt && recurringEnd && (
                    <p className="text-xs text-blue-600">
                      ※ {recurringPattern === 'weekly' ? '毎週' : '隔週'}
                      {new Date(startAt).toLocaleDateString('ja-JP', { weekday: 'long' })}
                      、{generateRecurringDates(new Date(startAt), new Date(recurringEnd + 'T23:59:59'), 0, recurringPattern).length}回分を一括登録します
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? '登録中...' : isRecurring ? '繰り返し会議を一括登録する' : '会議を登録する'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
