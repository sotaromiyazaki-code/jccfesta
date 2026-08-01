'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const tabs = [
  { href: '/board',     label: '📋 依頼',  activeColor: 'border-blue-600 text-blue-600'   },
  { href: '/meetings',  label: '📅 会議',  activeColor: 'border-blue-600 text-blue-600'   },
  { href: '/thanks',    label: '✨ Thanks', activeColor: 'border-yellow-500 text-yellow-600' },
  { href: '/questions', label: '❓ 質問箱', activeColor: 'border-purple-600 text-purple-600' },
  { href: '/mypage',    label: '👤 マイページ', activeColor: 'border-purple-600 text-purple-600' },
]

export default function Nav() {
  const { userName, logout } = useAuth()
  const pathname = usePathname()

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

        {/* 下段：タブ（横スクロール対応） */}
        <div
          className="tab-bar flex -mb-px overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {tabs.map(({ href, label, activeColor }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 whitespace-nowrap px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? activeColor
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
