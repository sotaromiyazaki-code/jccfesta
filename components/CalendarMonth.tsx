'use client'

import Link from 'next/link'
import { Meeting } from '@/types'
import { getMeetingColor } from '@/lib/meeting-colors'

interface Props {
  year: number
  month: number // 0-indexed
  meetings: Meeting[]
}

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function getCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  // Monday-first: Sun=6, Mon=0, ...
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) =>
    new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
  )
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

export default function CalendarMonth({ year, month, meetings }: Props) {
  const days = getCalendarDays(year, month)
  const today = new Date()

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-semibold ${
              i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const dayMeetings = getMeetingsForDay(day, meetings)
          const dow = i % 7 // 0=Mon, 5=Sat, 6=Sun

          return (
            <div
              key={i}
              className={`min-h-[72px] border-b border-r border-gray-100 p-1 ${
                !isCurrentMonth ? 'bg-gray-50/60' : ''
              } ${dow === 6 ? 'border-r-0' : ''}`}
            >
              {/* 日付 */}
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-0.5 ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : dow === 5
                    ? 'text-blue-400'
                    : dow === 6
                    ? 'text-red-400'
                    : isCurrentMonth
                    ? 'text-gray-800'
                    : 'text-gray-300'
                }`}
              >
                {day.getDate()}
              </div>

              {/* イベントチップ */}
              {dayMeetings.slice(0, 2).map((m) => {
                const color = getMeetingColor(m)
                const isUnattendedSos = m.is_sos && (!m.meeting_participants || m.meeting_participants.length === 0)
                return (
                  <Link key={m.id} href={`/meetings/${m.id}`} onClick={(e) => e.stopPropagation()}>
                    <div
                      style={{ backgroundColor: color }}
                      className={`text-white text-[10px] leading-tight px-1 py-0.5 rounded mb-0.5 truncate ${
                        isUnattendedSos ? 'ring-1 ring-red-300 animate-pulse' : ''
                      }`}
                      title={`${formatTime(m.start_at)} ${m.title}`}
                    >
                      {isUnattendedSos ? '🆘' : ''}{m.title}
                    </div>
                  </Link>
                )
              })}
              {dayMeetings.length > 2 && (
                <div className="text-[10px] text-gray-400 pl-1">+{dayMeetings.length - 2}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
