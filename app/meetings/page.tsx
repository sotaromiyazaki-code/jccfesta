'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Meeting } from '@/types'
import { LEGEND_ITEMS } from '@/lib/meeting-colors'
import Nav from '@/components/Nav'
import CalendarMonth from '@/components/CalendarMonth'
import CalendarWeek from '@/components/CalendarWeek'

type ViewMode = 'month' | 'week'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function MeetingsPage() {
  const { isAuthenticated, isLoaded } = useAuth()
  const router = useRouter()

  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showLegend, setShowLegend] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weekStart = getMonday(currentDate)

  const fetchMeetings = useCallback(async () => {
    let rangeStart: Date, rangeEnd: Date

    if (view === 'month') {
      // カレンダーグリッドは前後の週も含むため余裕を持たせる
      rangeStart = new Date(year, month - 1, 20)
      rangeEnd = new Date(year, month + 2, 10)
    } else {
      rangeStart = new Date(weekStart)
      rangeEnd = new Date(weekStart)
      rangeEnd.setDate(rangeEnd.getDate() + 7)
    }

    const { data } = await supabase
      .from('meetings')
      .select('*, meeting_recipients(*), meeting_participants(*)')
      .gte('start_at', rangeStart.toISOString())
      .lt('start_at', rangeEnd.toISOString())
      .order('start_at')

    setMeetings(data ?? [])
    setLoading(false)
  }, [view, year, month, weekStart.toISOString()])

  useEffect(() => {
    if (!isLoaded) return
    if (!isAuthenticated) { router.replace('/login'); return }
    fetchMeetings()
  }, [isLoaded, isAuthenticated, fetchMeetings, router])

  const navigate = (direction: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (view === 'month') {
        d.setMonth(d.getMonth() + direction)
      } else {
        d.setDate(d.getDate() + direction * 7)
      }
      return d
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const periodLabel =
    view === 'month'
      ? `${year}年${month + 1}月`
      : `${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${
          (() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return `${e.getMonth() + 1}/${e.getDate()}` })()
        }`

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-4">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">ミーティング</h1>
          <Link
            href="/meetings/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            ＋ 新しい会議
          </Link>
        </div>

        {/* コントロールバー */}
        <div className="flex items-center gap-2 mb-3">
          {/* 週/月切り替え */}
          <div className="flex bg-gray-200 rounded-lg p-0.5">
            {(['month', 'week'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {v === 'month' ? '月' : '週'}
              </button>
            ))}
          </div>

          {/* ナビゲーション */}
          <button onClick={() => navigate(-1)} className="px-2 py-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200">
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[100px] text-center">{periodLabel}</span>
          <button onClick={() => navigate(1)} className="px-2 py-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200">
            ›
          </button>

          <button
            onClick={goToday}
            className="ml-auto text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            今日
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            凡例
          </button>
        </div>

        {/* 凡例 */}
        {showLegend && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
            <div className="flex flex-wrap gap-2">
              {LEGEND_ITEMS.map(({ name, color }) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600">{name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs text-gray-600">🆘 SOS(未対応)</span>
              </div>
            </div>
          </div>
        )}

        {/* カレンダー本体 */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
        ) : view === 'month' ? (
          <CalendarMonth year={year} month={month} meetings={meetings} />
        ) : (
          <CalendarWeek weekStart={weekStart} meetings={meetings} />
        )}
      </main>
    </div>
  )
}
