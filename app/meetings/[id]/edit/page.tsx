'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAMS } from '@/lib/constants'
import Nav from '@/components/Nav'

interface Recipient { type: 'team' | 'individual'; name: string }

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditMeetingPage() {
  const { isAuthenticated, isLoaded } = useAuth()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isAuthenticated) { router.replace('/login'); return }

    const fetch = async () => {
      const { data } = await supabase
        .from('meetings')
        .select('*, meeting_recipients(*)')
        .eq('id', id)
        .single()

      if (!data) { router.replace('/meetings'); return }

      setTitle(data.title)
      setStartAt(toLocalDatetime(data.start_at))
      setEndAt(toLocalDatetime(data.end_at))
      setMeetingUrl(data.meeting_url ?? '')
      setNotesUrl(data.notes_url ?? '')
      setOtherUrl(data.other_url ?? '')
      setIsSos(data.is_sos)
      setSelectedTeams(data.meeting_recipients.filter((r: { recipient_type: string }) => r.recipient_type === 'team').map((r: { recipient_name: string }) => r.recipient_name))
      setIndividuals(data.meeting_recipients.filter((r: { recipient_type: string }) => r.recipient_type === 'individual').map((r: { recipient_name: string }) => r.recipient_name))
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

    setSubmitting(true)

    const { error: upErr } = await supabase.from('meetings').update({
      title: title.trim(),
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      meeting_url: meetingUrl || null,
      notes_url: notesUrl || null,
      other_url: otherUrl || null,
      is_sos: isSos,
    }).eq('id', id)

    if (upErr) { setError('更新に失敗しました。'); setSubmitting(false); return }

    await supabase.from('meeting_recipients').delete().eq('meeting_id', id)
    await supabase.from('meeting_recipients').insert(
      recipients.map((r) => ({ meeting_id: id, recipient_type: r.type, recipient_name: r.name }))
    )

    router.push(`/meetings/${id}`)
  }

  if (!isLoaded || loading) return (
    <div className="min-h-screen bg-gray-50"><Nav />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">読み込み中...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <h1 className="text-xl font-bold text-gray-900">会議を編集</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">対象チーム <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {TEAMS.map((team) => (
                  <button key={team} type="button" onClick={() => toggleTeam(team)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      selectedTeams.includes(team) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
                    }`}>
                    {team}
                  </button>
                ))}
              </div>
            </div>

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

            <div className="space-y-3">
              {[
                { label: '会議URL', value: meetingUrl, set: setMeetingUrl, placeholder: 'https://zoom.us/...' },
                { label: '議事録リンク', value: notesUrl, set: setNotesUrl, placeholder: 'https://...' },
                { label: 'その他リンク', value: otherUrl, set: setOtherUrl, placeholder: 'https://...' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}（任意）</label>
                  <input type="url" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>

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

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? '保存中...' : '変更を保存する'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
