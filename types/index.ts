export interface Request {
  id: string
  title: string
  content: string
  deadline: string | null
  priority: 'urgent' | 'normal'
  status: 'in_progress' | 'completed'
  created_by: string
  created_at: string
  request_recipients?: Recipient[]
  comments?: Comment[]
  reactions?: Reaction[]
}

export interface Recipient {
  id: string
  request_id: string
  recipient_type: 'team' | 'individual'
  recipient_name: string
}

export interface Comment {
  id: string
  request_id: string
  content: string
  created_by: string
  created_at: string
}

export interface Reaction {
  id: string
  request_id: string
  emoji: string
  created_by: string
  created_at: string
}

// ---- 日程調整 ----

export interface ScheduleCandidate {
  id: string
  request_id: string
  date: string // YYYY-MM-DD
  time_from: string | null
  time_to: string | null
  sort_order: number
  created_at: string
}

export interface ScheduleResponse {
  id: string
  candidate_id: string
  request_id: string
  user_name: string
  response: 'available' | 'maybe' | 'unavailable'
  created_at: string
  updated_at: string
}

// ---- 質問箱 ----

export interface Question {
  id: string
  content: string
  from_name: string
  from_team: string
  status: 'unanswered' | 'answered'
  created_at: string
  question_recipients?: QuestionRecipient[]
}

export interface QuestionRecipient {
  id: string
  question_id: string
  recipient_type: 'team' | 'individual'
  recipient_name: string
}

export interface QuestionComment {
  id: string
  question_id: string
  content: string
  created_by: string
  created_at: string
}

// ---- Thanks ----

export interface Thanks {
  id: string
  message: string
  from_name: string
  recipient_type: 'team' | 'individual'
  recipient_name: string
  created_at: string
}

export interface ThanksReaction {
  id: string
  thanks_id: string
  emoji: string
  created_by: string
  created_at: string
}

export interface ThanksComment {
  id: string
  thanks_id: string
  content: string
  created_by: string
  created_at: string
}

// ---- マイページ確認済み ----

export interface MyPageDismissal {
  id: string
  user_name: string
  item_type: 'request' | 'meeting'
  item_id: string
  created_at: string
}

// ---- ミーティング ----

export interface Meeting {
  id: string
  title: string
  start_at: string
  end_at: string | null
  meeting_url: string | null
  notes_url: string | null
  other_url: string | null
  is_sos: boolean
  series_id: string | null
  created_by: string
  created_at: string
  meeting_recipients?: MeetingRecipient[]
  meeting_participants?: MeetingParticipant[]
}

export interface MeetingRecipient {
  id: string
  meeting_id: string
  recipient_type: 'team' | 'individual'
  recipient_name: string
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  user_name: string
  created_at: string
}
