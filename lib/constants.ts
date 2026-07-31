export const TEAMS = [
  '全体',
  '総務',
  '制作',
  '司会',
  'コンテンツ1',
  'コンテンツ2',
  'コンテンツ3',
  'インターン',
  'その他',
] as const

export const EMOJIS = ['👍', '❤️', '😊', '🙏', '✅', '🔥', '💪']

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'すぐやって！',
  normal: '通常',
}

export const STATUS_LABELS: Record<string, string> = {
  in_progress: '進行中',
  completed: '完了',
}

export const SOS_MEMBERS = ['そうたろう', 'すばる', 'りゅうせい', 'なな'] as const

export const TEAM_COLORS: Record<string, string> = {
  全体: 'bg-gray-100 text-gray-700',
  総務: 'bg-blue-100 text-blue-700',
  制作: 'bg-purple-100 text-purple-700',
  司会: 'bg-green-100 text-green-700',
  コンテンツ1: 'bg-yellow-100 text-yellow-700',
  コンテンツ2: 'bg-orange-100 text-orange-700',
  コンテンツ3: 'bg-red-100 text-red-700',
  インターン: 'bg-teal-100 text-teal-700',
  その他: 'bg-gray-100 text-gray-600',
}
