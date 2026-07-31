'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { TEAMS } from '@/lib/constants'

const SELECTABLE_TEAMS = TEAMS.filter((t) => t !== '全体')

export default function LoginPage() {
  const { isAuthenticated, isLoaded, login } = useAuth()
  const router = useRouter()
  const [passphrase, setPassphrase] = useState('')
  const [name, setName] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      router.replace('/board')
    }
  }, [isLoaded, isAuthenticated, router])

  const toggleTeam = (team: string) =>
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('名前を入力してください')
      return
    }
    if (!passphrase.trim()) {
      setError('合言葉を入力してください')
      return
    }
    setLoading(true)
    const ok = login(passphrase, name.trim(), selectedTeams)
    if (ok) {
      router.replace('/board')
    } else {
      setError('合言葉が違います。LINEで確認してください。')
    }
    setLoading(false)
  }

  if (!isLoaded) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">JCC 管理アプリ</h1>
          <p className="text-gray-500 text-sm mt-1">Habitat for Humanity Japan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                あなたの名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：そうたろう"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属チーム <span className="text-gray-400 font-normal text-xs">（複数選択可・任意）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SELECTABLE_TEAMS.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => toggleTeam(team)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      selectedTeams.includes(team)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                合言葉
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="LINEで共有された合言葉"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              入室する
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          名前・所属チームはブラウザに保存されます
        </p>
      </div>
    </div>
  )
}
