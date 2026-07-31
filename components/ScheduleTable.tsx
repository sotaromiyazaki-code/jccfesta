'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ScheduleCandidate, ScheduleResponse } from '@/types'

type ResponseType = 'available' | 'maybe' | 'unavailable'

interface Props {
  candidates: ScheduleCandidate[]
  responses: ScheduleResponse[]
  requestId: string
  currentUser: string
  onRefresh: () => void
}

const RESPONSE_CONFIG: Record<ResponseType, { label: string; bg: string; text: string; border: string }> = {
  available:   { label: '○', bg: 'bg-green-500',  text: 'text-white',      border: 'border-green-500'  },
  maybe:       { label: '△', bg: 'bg-yellow-400', text: 'text-white',      border: 'border-yellow-400' },
  unavailable: { label: '×', bg: 'bg-red-500',    text: 'text-white',      border: 'border-red-500'    },
}

const RESPONSE_DISPLAY: Record<ResponseType, { symbol: string; color: string }> = {
  available:   { symbol: '○', color: 'text-green-600'  },
  maybe:       { symbol: '△', color: 'text-yellow-500' },
  unavailable: { symbol: '×', color: 'text-red-500'    },
}

function formatCandidateDate(c: ScheduleCandidate): { date: string; time: string | null } {
  const d = new Date(c.date + 'T00:00:00')
  const date = d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
  const time = c.time_from
    ? `${c.time_from}${c.time_to ? `〜${c.time_to}` : ''}`
    : null
  return { date, time }
}

export default function ScheduleTable({ candidates, responses, requestId, currentUser, onRefresh }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 回答済みの人一覧（自分以外、回答順）
  const respondents = Array.from(
    new Set(responses.filter((r) => r.user_name !== currentUser).map((r) => r.user_name))
  )

  const myResponses = responses.filter((r) => r.user_name === currentUser)

  const handleResponse = async (candidateId: string, response: ResponseType) => {
    setUpdating(candidateId)
    const current = myResponses.find((r) => r.candidate_id === candidateId)

    if (current?.response === response) {
      // 同じを押したら取り消し
      await supabase.from('schedule_responses').delete().eq('id', current.id)
    } else {
      await supabase.from('schedule_responses').upsert(
        { candidate_id: candidateId, request_id: requestId, user_name: currentUser, response },
        { onConflict: 'candidate_id,user_name' }
      )
    }
    onRefresh()
    setUpdating(null)
  }

  const getCountByResponse = (candidateId: string) => {
    const candResps = responses.filter((r) => r.candidate_id === candidateId)
    return {
      available:   candResps.filter((r) => r.response === 'available').length,
      maybe:       candResps.filter((r) => r.response === 'maybe').length,
      unavailable: candResps.filter((r) => r.response === 'unavailable').length,
    }
  }

  const totalRespondents = respondents.length + (myResponses.length > 0 ? 1 : 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">📅 日程調整</p>
        {totalRespondents > 0 && (
          <span className="text-xs text-gray-400">{totalRespondents}人が回答済み</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2.5 font-medium text-gray-600 text-xs min-w-[110px]">
                候補日
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs min-w-[72px]">
                集計
              </th>
              {/* 自分の列（インタラクティブ） */}
              <th className="px-3 py-2.5 text-center font-medium text-blue-600 text-xs min-w-[90px] bg-blue-50/50">
                あなた
              </th>
              {/* 他の回答者 */}
              {respondents.map((name) => (
                <th key={name} className="px-3 py-2.5 text-center font-medium text-gray-500 text-xs min-w-[56px]">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, i) => {
              const { date, time } = formatCandidateDate(candidate)
              const counts = getCountByResponse(candidate.id)
              const myResp = myResponses.find((r) => r.candidate_id === candidate.id)
              const isUpdating = updating === candidate.id
              const isExpanded = expandedId === candidate.id
              const totalCols = 3 + respondents.length

              const namesByResponse = (['available', 'maybe', 'unavailable'] as ResponseType[]).map((r) => ({
                type: r,
                names: responses.filter((res) => res.candidate_id === candidate.id && res.response === r).map((res) => res.user_name),
              }))

              return (
                <React.Fragment key={candidate.id}>
                <tr
                  className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  {/* 候補日（タップで展開） */}
                  <td className="sticky left-0 z-10 px-3 py-2.5 bg-inherit">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : candidate.id)}
                      className="text-left w-full"
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-800 text-xs leading-tight">{date}</span>
                        <span className={`text-gray-300 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                      {time && <div className="text-gray-400 text-xs">{time}</div>}
                    </button>
                  </td>

                  {/* 集計 */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs font-medium">
                      <span className="text-green-600">○{counts.available}</span>
                      <span className="text-yellow-500">△{counts.maybe}</span>
                      <span className="text-red-500">×{counts.unavailable}</span>
                    </div>
                  </td>

                  {/* 自分の回答（ボタン） */}
                  <td className="px-2 py-2 text-center bg-blue-50/30">
                    <div className="flex items-center justify-center gap-1">
                      {(['available', 'maybe', 'unavailable'] as ResponseType[]).map((r) => {
                        const cfg = RESPONSE_CONFIG[r]
                        const isSelected = myResp?.response === r
                        return (
                          <button
                            key={r}
                            onClick={() => handleResponse(candidate.id, r)}
                            disabled={isUpdating}
                            className={`w-7 h-7 rounded-full text-sm font-bold border-2 transition-all disabled:opacity-50 ${
                              isSelected
                                ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                                : 'border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-500'
                            }`}
                          >
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>

                  {/* 他の回答者 */}
                  {respondents.map((name) => {
                    const resp = responses.find(
                      (r) => r.candidate_id === candidate.id && r.user_name === name
                    )
                    return (
                      <td key={name} className="px-3 py-2.5 text-center">
                        {resp ? (
                          <span className={`text-base font-bold ${RESPONSE_DISPLAY[resp.response].color}`}>
                            {RESPONSE_DISPLAY[resp.response].symbol}
                          </span>
                        ) : (
                          <span className="text-gray-200 text-sm">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
                {isExpanded && (
                  <tr key={`${candidate.id}-detail`} className="bg-gray-50/60 border-b border-gray-100">
                    <td colSpan={totalCols} className="px-4 py-3">
                      <div className="flex flex-wrap gap-4">
                        {namesByResponse.map(({ type, names }) => {
                          const disp = RESPONSE_DISPLAY[type]
                          return (
                            <div key={type} className="flex items-start gap-1.5">
                              <span className={`text-sm font-bold shrink-0 ${disp.color}`}>{disp.symbol}</span>
                              <span className="text-xs text-gray-600">
                                {names.length > 0 ? names.join('・') : <span className="text-gray-300">-</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {candidates.length === 0 && (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">候補日がありません</div>
      )}

      <div className="px-4 py-2 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
        <span><span className="text-green-600 font-bold">○</span> 参加可能</span>
        <span><span className="text-yellow-500 font-bold">△</span> 場合によっては</span>
        <span><span className="text-red-500 font-bold">×</span> 不可</span>
      </div>
    </div>
  )
}
