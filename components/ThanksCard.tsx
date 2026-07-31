'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Thanks, ThanksReaction, ThanksComment } from '@/types'
import { EMOJIS, TEAM_COLORS } from '@/lib/constants'

interface Props {
  thanks: Thanks
  reactions: ThanksReaction[]
  comments: ThanksComment[]
  currentUser: string
  onRefresh: () => void
}

export default function ThanksCard({ thanks, reactions, comments, currentUser, onRefresh }: Props) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [tooltipEmoji, setTooltipEmoji] = useState<string | null>(null)

  const isTeam = thanks.recipient_type === 'team'
  const tagColor = isTeam
    ? (TEAM_COLORS[thanks.recipient_name] ?? 'bg-gray-100 text-gray-700')
    : 'bg-indigo-100 text-indigo-700'

  const formatDate = (str: string) =>
    new Date(str).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const reactionCounts = EMOJIS.map((emoji) => ({
    emoji,
    count: reactions.filter((r) => r.emoji === emoji).length,
    reacted: reactions.some((r) => r.emoji === emoji && r.created_by === currentUser),
    names: reactions.filter((r) => r.emoji === emoji).map((r) => r.created_by),
  }))

  const toggleReaction = async (emoji: string) => {
    const existing = reactions.find((r) => r.emoji === emoji && r.created_by === currentUser)
    if (existing) {
      await supabase.from('thanks_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('thanks_reactions').insert({
        thanks_id: thanks.id,
        emoji,
        created_by: currentUser,
      })
    }
    onRefresh()
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setCommenting(true)
    await supabase.from('thanks_comments').insert({
      thanks_id: thanks.id,
      content: newComment.trim(),
      created_by: currentUser,
    })
    setNewComment('')
    onRefresh()
    setCommenting(false)
  }

  return (
    <div
      className="bg-white rounded-2xl border border-yellow-100 shadow-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-reaction]')) return
        setTooltipEmoji(null)
      }}
    >
      {/* カード本体 */}
      <div className="px-4 pt-4 pb-3">
        {/* 宛先・送り主・日時 */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tagColor}`}>
            {isTeam ? '👥' : '👤'} {thanks.recipient_name}
          </span>
          <span className="text-gray-300 text-xs">←</span>
          <span className="text-xs text-gray-500 font-medium">{thanks.from_name}</span>
          <span className="text-gray-300 text-xs ml-auto">{formatDate(thanks.created_at)}</span>
        </div>

        {/* メッセージ */}
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {thanks.message}
        </p>
      </div>

      {/* リアクション */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {reactionCounts.map(({ emoji, count, reacted, names }) => (
          <div key={emoji} className="relative" data-reaction>
            {tooltipEmoji === emoji && names.length > 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                  {names.join('・')}
                </div>
                <div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
              </div>
            )}
            <div
              className="flex items-center rounded-full border-2 overflow-hidden transition-all"
              style={{ borderColor: reacted ? '#fbbf24' : '#e5e7eb' }}
            >
              <button
                onClick={() => toggleReaction(emoji)}
                className={`px-2 py-1 text-sm transition-colors ${reacted ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
              >
                {emoji}
              </button>
              {count > 0 && (
                <button
                  onMouseEnter={() => setTooltipEmoji(emoji)}
                  onMouseLeave={() => setTooltipEmoji(null)}
                  onTouchStart={() => setTooltipEmoji((prev) => (prev === emoji ? null : emoji))}
                  className={`pr-2 py-1 text-xs font-semibold transition-colors ${
                    reacted ? 'bg-yellow-50 text-yellow-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {count}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* コメントトグル */}
      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors rounded-b-2xl"
        >
          <span>💬</span>
          <span>
            {comments.length > 0 ? `コメント (${comments.length})` : 'コメントを書く'}
          </span>
          {comments.length > 0 && (
            <span className={`ml-auto transition-transform text-gray-300 ${commentsOpen ? 'rotate-180' : ''}`}>▼</span>
          )}
        </button>

        {/* コメント一覧＋入力 */}
        {commentsOpen && (
          <div className="px-4 pb-4">
            {comments.length > 0 && (
              <div className="space-y-2.5 mb-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-bold text-yellow-600">
                      {c.created_by[0]}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-700">{c.created_by}</span>
                        <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={submitComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力..."
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="submit"
                disabled={commenting || !newComment.trim()}
                className="bg-yellow-400 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-yellow-500 disabled:opacity-40 transition-colors"
              >
                送信
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
