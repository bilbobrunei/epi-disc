'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ALL_ADJECTIVES, DISC_COLORS, shuffle } from '@/lib/disc-data'
import type { Trait } from '@/lib/supabase'

export default function QuizPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()

  const [participantId, setParticipantId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [adjectives, setAdjectives] = useState<{ word: string; label: string; trait: Trait }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [closed, setClosed] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🦁')

  const loadSession = useCallback(async () => {
    const pid = localStorage.getItem('epi_participant_id')
    const storedName = localStorage.getItem('epi_participant_name') || ''
    const storedEmoji = localStorage.getItem('epi_emoji') || '🦁'
    setName(storedName)
    setEmoji(storedEmoji)

    if (!pid) { router.push('/'); return }
    setParticipantId(pid)

    const { data: session } = await supabase
      .from('sessions')
      .select('id, submissions_closed, is_active')
      .eq('code', code)
      .single()

    if (!session || !session.is_active) { router.push('/'); return }
    setSessionId(session.id)
    if (session.submissions_closed) { setClosed(true); return }

    // Check if already submitted + load existing selections
    const { data: participant } = await supabase
      .from('participants')
      .select('submitted')
      .eq('id', pid)
      .single()

    if (participant?.submitted) {
      setAlreadySubmitted(true)
      const { data: existing } = await supabase
        .from('responses')
        .select('adjective')
        .eq('participant_id', pid)
      if (existing) setSelected(new Set(existing.map(r => r.adjective)))
    }

    // Fetch custom labels and merge with defaults
    const { data: overridesData } = await supabase
      .from('adjective_overrides')
      .select('original, custom_label')
    const overrideMap: Record<string, string> = {}
    if (overridesData) {
      overridesData.forEach((r: { original: string; custom_label: string }) => {
        overrideMap[r.original] = r.custom_label
      })
    }
    const withLabels = ALL_ADJECTIVES.map(a => ({
      ...a,
      label: overrideMap[a.word] ?? a.word,
    }))
    setAdjectives(shuffle(withLabels))
  }, [code, router])

  useEffect(() => { loadSession() }, [loadSession])

  // Listen for session closing in real-time
  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel('session-status')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new.submissions_closed) setClosed(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  function toggleWord(word: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  async function handleSubmit() {
    if (!participantId) return
    setSubmitting(true)
    setError('')

    try {
      // Delete previous responses
      await supabase.from('responses').delete().eq('participant_id', participantId)

      // Insert new responses
      const responseRows = ALL_ADJECTIVES
        .filter(a => selected.has(a.word))
        .map(a => ({ participant_id: participantId, adjective: a.word, trait: a.trait }))

      if (responseRows.length > 0) {
        const { error: insertErr } = await supabase.from('responses').insert(responseRows)
        if (insertErr) throw insertErr
      }

      // Mark participant as submitted
      await supabase.from('participants').update({
        submitted: true,
        last_submitted_at: new Date().toISOString(),
      }).eq('id', participantId)

      router.push(`/session/${code}/done`)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (closed) {
    return (
      <main className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-heading text-xl font-bold text-brand-text mb-2">Submissions closed</h2>
          <p className="text-brand-muted text-sm">Your trainer has closed the session. Thank you!</p>
        </div>
      </main>
    )
  }

  if (!adjectives.length) {
    return (
      <main className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-3xl animate-spin">⚙️</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-bg pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-brand-border px-4 py-3 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span className="font-heading font-semibold text-brand-text text-sm">{name}</span>
          </div>
          <div className="text-sm text-brand-muted">
            <span className="font-bold text-brand-text">{selected.size}</span> selected
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <h1 className="font-heading text-xl font-bold text-brand-text">Which words describe you?</h1>
          <p className="text-brand-muted text-sm mt-1">Select all that apply — be honest!</p>
          {alreadySubmitted && (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg">
              You already submitted. You can update your selections and resubmit.
            </div>
          )}
        </div>

        {/* Adjective grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {adjectives.map(({ word, label, trait }) => {
            const isSelected = selected.has(word)
            const color = DISC_COLORS[trait]
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                style={isSelected ? {
                  backgroundColor: color + '20',
                  borderColor: color,
                  color: color,
                } : {}}
                className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95
                  ${isSelected
                    ? 'shadow-sm'
                    : 'border-brand-border bg-white text-brand-text hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Fixed submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border px-4 py-4 z-20">
        <div className="max-w-2xl mx-auto">
          {error && <p className="text-red-600 text-sm mb-2 text-center">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className="w-full py-4 rounded-xl bg-disc-d text-disc-D-text font-heading font-bold text-base hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : alreadySubmitted ? `Update my results (${selected.size} selected)` : `Submit my results (${selected.size} selected)`}
          </button>
        </div>
      </div>
    </main>
  )
}
