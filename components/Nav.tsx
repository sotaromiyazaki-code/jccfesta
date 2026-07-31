'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Nav() {
  const { userName, logout } = useAuth()
  const pathname = usePathname()

  const isBoard = pathname.startsWith('/board')
  const isMeetings = pathname.startsWith('/meetings')
  const isThanks = pathname.startsWith('/thanks')
  const isMyPage = pathname.startsWith('/mypage')

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* 上段：ロゴ + ユーザー情報 */}
        <div className="h-12 flex items-center justify-between">
          <span className="font-bold text-blue-600 text-lg">JCC</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{userName}</span>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
              ログアウト
            </button>
          </div>
        </div>

        {/* 下段：タブ */}
        <div className="flex -mb-px">
          <Link
            href="/board"
            className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
              isBoard
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 依頼
          </Link>
          <Link
            href="/meetings"
            className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
              isMeetings
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 会議
          </Link>
          <Link
            href="/thanks"
            className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
              isThanks
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ✨ Thanks
          </Link>
          <Link
            href="/mypage"
            className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
              isMyPage
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 マイページ
          </Link>
        </div>
      </div>
    </nav>
  )
}
