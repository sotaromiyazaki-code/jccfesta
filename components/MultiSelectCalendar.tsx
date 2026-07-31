'use client'

import { useState } from 'react'

interface Props {
  selected: string[] // YYYY-MM-DD
  onToggle: (date: string) => void
}

const DOW = ['月', '火', '水', '木', '金', '土', '日']

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // 月曜始まり
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )
}

export default function MultiSelectCalendar({ selected, onToggle }: Props) {
  const today = new Date()
  const todayYMD = toYMD(today)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const days = getCalendarDays(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  return (
    <div className="select-none">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between px-1 mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-lg"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-gray-800">
          {viewYear}年{viewMonth + 1}月
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-lg"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-1 ${
              i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const ymd = toYMD(day)
          const isCurrentMonth = day.getMonth() === viewMonth
          const isToday = ymd === todayYMD
          const isSelected = selected.includes(ymd)
          const dow = (day.getDay() + 6) % 7 // 0=月, 5=土, 6=日

          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onToggle(ymd)}
              className={`
                relative h-9 mx-0.5 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-blue-500 text-white shadow-sm scale-105'
                  : isToday && isCurrentMonth
                  ? 'ring-2 ring-blue-400 ring-inset text-blue-600 font-bold'
                  : !isCurrentMonth
                  ? 'text-gray-200'
                  : dow === 5
                  ? 'text-blue-400 hover:bg-blue-50'
                  : dow === 6
                  ? 'text-red-400 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* 選択件数バッジ */}
      {selected.length > 0 && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            ✓ {selected.length}件選択中
          </span>
        </div>
      )}
    </div>
  )
}
