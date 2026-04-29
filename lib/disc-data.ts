import type { Trait } from './supabase'

export const DISC_ADJECTIVES: Record<Trait, string[]> = {
  D: ['Bold', 'Decisive', 'Driven', 'Assertive', 'Competitive', 'Commanding', 'Ambitious', 'Forceful', 'Determined', 'Blunt', 'Fearless', 'Resolute'],
  I: ['Enthusiastic', 'Charming', 'Outgoing', 'Persuasive', 'Optimistic', 'Energetic', 'Expressive', 'Spontaneous', 'Inspiring', 'Sociable', 'Lively', 'Talkative'],
  S: ['Patient', 'Loyal', 'Reliable', 'Calm', 'Consistent', 'Supportive', 'Gentle', 'Dependable', 'Accommodating', 'Stable', 'Sincere', 'Cooperative'],
  C: ['Analytical', 'Meticulous', 'Accurate', 'Thorough', 'Systematic', 'Logical', 'Careful', 'Precise', 'Organized', 'Diligent', 'Methodical', 'Cautious'],
}

export const ALL_ADJECTIVES = Object.entries(DISC_ADJECTIVES).flatMap(
  ([trait, words]) => words.map(word => ({ word, trait: trait as Trait }))
)

export const DISC_COLORS: Record<Trait, string> = {
  D: '#52C272',
  I: '#F5D04A',
  S: '#F2557A',
  C: '#5B9BD5',
}

export const DISC_TEXT: Record<Trait, string> = {
  D: '#1a5c30',
  I: '#5a4200',
  S: '#6b1030',
  C: '#0a2d5a',
}

export const DISC_BG: Record<Trait, string> = {
  D: '#52C27218',
  I: '#F5D04A18',
  S: '#F2557A18',
  C: '#5B9BD518',
}

export const DISC_LABELS: Record<Trait, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Conscientiousness',
}

export const EMOJIS = [
  '🦁','🐯','🦊','🐻','🐼','🦋','🦄','🐲',
  '🦅','🦉','🌟','⚡','🔥','💎','🚀','🎯',
  '🐬','🐙','🌈','🎸','🏆','💫','🌊','🦜',
  '🐉','🎪','🦩','🌺','🎭','🍀',
]

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getDominant(scores: Record<Trait, number>): Trait {
  return (Object.entries(scores) as [Trait, number][])
    .sort((a, b) => b[1] - a[1])[0][0]
}

export function getSecondary(scores: Record<Trait, number>, primary: Trait): number {
  return Math.max(
    ...(['D', 'I', 'S', 'C'] as Trait[])
      .filter(t => t !== primary)
      .map(t => scores[t])
  )
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'EPI-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function computeScores(responses: { trait: Trait }[]): Record<Trait, number> {
  const scores: Record<Trait, number> = { D: 0, I: 0, S: 0, C: 0 }
  responses.forEach(r => scores[r.trait]++)
  return scores
}
