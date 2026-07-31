'use client'

import Link from 'next/link'
import { Meeting } from '@/types'
import { getMeetingColor, MEETING_TEAM_COLORS } from '@/lib/meeting-colors'

interface Props {
  weekStart: Date // その週の月曜日
  meetings: Meeting[]
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getMeetingsForDay(day: Date, meetings: Meeting[]): Meeting[] {
  return meetings
    .filter((m) => isSameDay(new Date(m.start_at), day))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return null
  const diff = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  if (diff < 60) return `${diff}分`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `${h}時間${m}分` : `${h}時間`
}

const DOW_JA = ['月', '火', '水', '木', '金', '土', '日']

export default function CalendarWeek({ weekStart, meetings }: Props) {
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  return (
    <div className="space-y-2">
      {weekDays.map((day, i) => {
        const dayMeetings = getMeetingsForDay(day, meetings)
        const isToday = isSameDay(day, today)
        const isSat = i === 5
        const isSun = i === 6

        return (
          <div
            key={i}
            className={`bg-white rounded-xl border overflow-hidden ${
              isToday ? 'border-blue-300' : 'border-gray-200'
            }`}
          >
            {/* 日付ヘッダー */}
            <div
              className={`flex items-center gap-2 px-3 py-2 ${
                isToday ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <span
                className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' :
                  isSun ? 'text-red-500' :
                  isSat ? 'text-blue-500' :
                  'text-gray-700'
                }`}
              >
                {day.getDate()}
              </span>
              <span
                className={`text-xs font-medium ${
                  isToday ? 'text-blue-700' :
                  isSun ? 'text-red-400' :
                  isSat ? 'text-blue-400' :
                  'text-gray-500'
                }`}
              >
                {DOW_JA[i]}
              </span>
              <span className="text-xs text-gray-400">
                {day.getMonth() + 1}/{day.getDate()}
              </span>
              {dayMeetings.length > 0 && (
                <span className="ml-auto text-xs text-gray-400">{dayMeetings.length}件</span>
              )}
            </div>

            {/* イベント一覧 */}
            {dayMeetings.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-300">予定なし</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dayMeetings.map((m) => {
                  const color = getMeetingColor(m)
                  const isUnattendedSos = m.is_sos && (!m.meeting_participants || m.meeting_participants.length === 0)
                  const firstTeam = m.meeting_recipients?.find((r) => r.recipient_type === 'team')

                  return (
                    <Link key={m.id} href={`/meetings/${m.id}`}>
                      <div
                        className={`flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                          isUnattendedSos ? 'bg-red-50 animate-pulse' : ''
                        }`}
                      >
                        {/* 左ライン */}
                        <div
                          className="w-1 self-stretch rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {isUnattendedSos && <span className="text-xs">🆘</span>}
                            {m.is_sos && m.meeting_participants && m.meeting_participants.length > 0 && (
                              <span className="text-xs text-green-600">✓SOS</span>
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">{m.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              {formatTime(m.start_at)}
                              {m.end_at && ` 〜 ${formatTime(m.end_at)}`}
                            </span>
                            {formatDuration(m.start_at, m.end_at) && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>{formatDuration(m.start_at, m.end_at)}</span>
                              </>
                            )}
                            {firstTeam && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>{firstTeam.recipient_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
