'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DISC_COLORS, DISC_TEXT, DISC_LABELS, computeScores, getDominant } from '@/lib/disc-data'
import type { Trait } from '@/lib/supabase'

export default function DonePage() {
  const { code } = useParams<{ code: string }>()
  const [revealed, setRevealed] = useState(false)
  const [scores, setScores] = useState<Record<Trait, number> | null>(null)
  const [dominant, setDominant] = useState<Trait | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [emoji, setEmoji] = useState('🦁')
  const [name, setName] = useState('')

  useEffect(() => {
    setEmoji(localStorage.getItem('epi_emoji') || '🦁')
    setName(localStorage.getItem('epi_participant_name') || '')

    async function init() {
      const { data: session } = await supabase
        .from('sessions')
        .select('id, reveal_results')
        .eq('code', code)
        .single()

      if (!session) return
      setSessionId(session.id)

      if (session.reveal_results) await loadResults()
      else setRevealed(false)
    }
    init()
  }, [code])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel('reveal-watch')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new.reveal_results) loadResults()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  async function loadResults() {
    const pid = localStorage.getItem('epi_participant_id')
    if (!pid) return
    const { data } = await supabase
      .from('responses')
      .select('trait')
      .eq('participant_id', pid)
    if (!data) return
    const s = computeScores(data as { trait: Trait }[])
    setScores(s)
    setDominant(getDominant(s))
    setRevealed(true)
  }

  const traits: Trait[] = ['D', 'I', 'S', 'C']
  const maxScore = scores ? Math.max(...Object.values(scores)) : 12

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        {!revealed ? (
          /* Waiting state */
          <div className="animate-fade-up">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-brand-border animate-ring-out" />
              <div className="absolute inset-2 rounded-full border-2 border-disc-d opacity-30 animate-ring-out-delay" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">{emoji}</div>
            </div>
            <h1 className="font-heading text-xl font-bold text-brand-text mb-2">Results submitted!</h1>
            <p className="text-brand-muted text-sm leading-relaxed">
              Your trainer will reveal your DISC profile shortly.<br />Keep this screen open.
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-6 text-brand-muted text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-disc-d animate-pulse-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-disc-i animate-pulse-dot [animation-delay:0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-disc-s animate-pulse-dot [animation-delay:0.6s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-disc-c animate-pulse-dot [animation-delay:0.9s]" />
              <span className="ml-1">Waiting for reveal...</span>
            </div>
          </div>
        ) : (
          /* Results revealed */
          dominant && scores && (
            <div className="animate-fade-up">
              <div className="text-5xl mb-4 animate-emoji-in">{emoji}</div>
              <p className="text-brand-muted text-sm mb-1">{name}</p>
              <h1 className="font-heading text-2xl font-bold text-brand-text mb-2">Your DISC Profile</h1>

              {/* Dominant badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-heading font-bold text-lg mb-6 animate-badge-pop"
                style={{ backgroundColor: DISC_COLORS[dominant] + '25', color: DISC_COLORS[dominant] }}>
                High {dominant} — {DISC_LABELS[dominant]}
              </div>

              {/* Score bars */}
              <div className="bg-white border border-brand-border rounded-2xl p-5 text-left space-y-3">
                {traits.map(t => (
                  <div key={t}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-heading font-semibold text-sm" style={{ color: DISC_COLORS[t] }}>
                        {t} — {DISC_LABELS[t]}
                      </span>
                      <span className="text-brand-muted text-xs">{scores[t]} / 12</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bar-fill"
                        style={{
                          width: `${(scores[t] / maxScore) * 100}%`,
                          backgroundColor: DISC_COLORS[t],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-brand-muted text-xs mt-5 leading-relaxed">
                These results show which traits you identify with most.<br />
                Your trainer will explain what this means for you.
              </p>
            </div>
          )
        )}
      </div>
    </main>
  )
}
