'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Request } from '@/types'
import { TEAM_COLORS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

interface Props {
  request: Request
  onDelete: (id: string) => void
}

export default function RequestCard({ request, onDelete }: Props) {
  const isUrgent = request.priority === 'urgent'
  const deadline = request.deadline
    ? new Date(request.deadline + 'T00:00:00').toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
      })
    : null

  const isOverdue =
    request.deadline && request.status === 'in_progress'
      ? new Date(request.deadline) < new Date(new Date().toDateString())
      : false

  const commentCount = request.comments?.length ?? 0
  const reactionCount = request.reactions?.length ?? 0

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 3秒で確認状態をリセット
  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    const { error } = await supabase.from('requests').delete().eq('id', request.id)
    if (!error) onDelete(request.id)
    setDeleting(false)
  }

  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
        isUrgent ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      {/* カード本体 → タップで詳細へ */}
      <Link href={`/board/${request.id}`} className="block p-4">
        <div className="flex items-start gap-2 mb-2">
          {isUrgent && (
            <span className="shrink-0 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              すぐやって！
            </span>
          )}
          <h3 className="font-semibold text-gray-900 leading-tight">{request.title}</h3>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{request.content}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          {request.request_recipients?.map((r) => (
            <span
              key={r.id}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                r.recipient_type === 'team'
                  ? (TEAM_COLORS[r.recipient_name] ?? 'bg-gray-100 text-gray-700')
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {r.recipient_name}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            {deadline && (
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                期限：{deadline}
                {isOverdue && ' ⚠️'}
              </span>
            )}
            <span>{request.created_by}</span>
          </div>
          <div className="flex items-center gap-2">
            {commentCount > 0 && <span>💬 {commentCount}</span>}
            {reactionCount > 0 && <span>👍 {reactionCount}</span>}
          </div>
        </div>
      </Link>

      {/* 編集・削除ボタン */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50">
        <Link
          href={`/board/${request.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-medium text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          ✏️ 編集
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
            confirming
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          } disabled:opacity-50`}
        >
          {deleting ? '削除中...' : confirming ? '本当に削除する？' : '🗑 削除'}
        </button>
      </div>
    </div>
  )
}
