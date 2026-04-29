import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Trait = 'D' | 'I' | 'S' | 'C'

export interface Session {
  id: string
  code: string
  name: string
  is_active: boolean
  submissions_closed: boolean
  reveal_results: boolean
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  name: string
  emoji: string
  submitted: boolean
  last_submitted_at: string | null
  created_at: string
}

export interface Response {
  id: string
  participant_id: string
  adjective: string
  trait: Trait
}

export interface ParticipantWithScores extends Participant {
  scores: Record<Trait, number>
  dom: Trait
}
