export const MEETING_TEAM_COLORS: Record<string, string> = {
  全体: '#6B7280',
  総務: '#3B82F6',
  制作: '#8B5CF6',
  司会: '#10B981',
  コンテンツ1: '#D97706',
  コンテンツ2: '#EA580C',
  コンテンツ3: '#DC2626',
  インターン: '#0D9488',
  その他: '#9CA3AF',
}

export const SOS_UNATTENDED_COLOR = '#EF4444'

export interface MeetingColorable {
  is_sos: boolean
  meeting_participants?: { user_name: string }[]
  meeting_recipients?: { recipient_type: string; recipient_name: string }[]
}

export function getMeetingColor(meeting: MeetingColorable): string {
  if (meeting.is_sos && (!meeting.meeting_participants || meeting.meeting_participants.length === 0)) {
    return SOS_UNATTENDED_COLOR
  }
  const firstTeam = meeting.meeting_recipients?.find((r) => r.recipient_type === 'team')
  if (!firstTeam) return '#6B7280'
  return MEETING_TEAM_COLORS[firstTeam.recipient_name] ?? '#6B7280'
}

// カレンダーの凡例
export const LEGEND_ITEMS = Object.entries(MEETING_TEAM_COLORS).map(([name, color]) => ({
  name,
  color,
}))
