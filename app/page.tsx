'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMOJIS } from '@/lib/disc-data'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🦁')
  const [showEmojis, setShowEmojis] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return
    setLoading(true)
    setError('')

    const cleanCode = code.trim().toUpperCase()

    // Find session
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, is_active, submissions_closed')
      .eq('code', cleanCode)
      .single()

    if (sessionErr || !session) {
      setError('Session not found. Check your code with the trainer.')
      setLoading(false)
      return
    }
    if (!session.is_active) {
      setError('This session is not active yet. Ask your trainer to start it.')
      setLoading(false)
      return
    }
    if (session.submissions_closed) {
      setError('Submissions are closed for this session.')
      setLoading(false)
      return
    }

    // Create or find participant
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('name', name.trim())
      .maybeSingle()

    let participantId: string

    if (existing) {
      participantId = existing.id
      // Update emoji in case they changed it
      await supabase.from('participants').update({ emoji }).eq('id', participantId)
    } else {
      const { data: newP, error: pErr } = await supabase
        .from('participants')
        .insert({ session_id: session.id, name: name.trim(), emoji })
        .select('id')
        .single()

      if (pErr || !newP) {
        setError('Could not join session. Please try again.')
        setLoading(false)
        return
      }
      participantId = newP.id
    }

    // Store in localStorage for quiz page
    localStorage.setItem('epi_participant_id', participantId)
    localStorage.setItem('epi_session_code', cleanCode)
    localStorage.setItem('epi_participant_name', name.trim())
    localStorage.setItem('epi_emoji', emoji)

    router.push(`/session/${cleanCode}/quiz`)
  }

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💡</div>
          <h1 className="font-heading text-2xl font-bold text-brand-text">EPI DISC</h1>
          <p className="text-brand-muted text-sm mt-1">by Epipeople Management & Consultancy</p>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-brand-text mb-5">Join a session</h2>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1.5">Session code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. EPI-X7K2"
                maxLength={8}
                className="w-full px-4 py-3 rounded-xl border border-brand-border text-brand-text font-mono text-lg tracking-widest focus:outline-none focus:border-disc-d focus:ring-2 focus:ring-disc-d/20 transition-all uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1.5">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl border border-brand-border text-brand-text focus:outline-none focus:border-disc-d focus:ring-2 focus:ring-disc-d/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-text mb-1.5">Pick your emoji</label>
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white flex items-center gap-3 hover:border-disc-d transition-all"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-brand-muted text-sm">{showEmojis ? 'Close' : 'Change emoji'}</span>
                <span className="ml-auto text-brand-muted text-xs">{showEmojis ? '▲' : '▼'}</span>
              </button>

              {showEmojis && (
                <div className="mt-2 p-3 bg-white border border-brand-border rounded-xl grid grid-cols-6 gap-2">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setEmoji(e); setShowEmojis(false) }}
                      className={`text-2xl p-1.5 rounded-lg transition-all hover:scale-110 ${emoji === e ? 'bg-disc-d/20 ring-2 ring-disc-d' : 'hover:bg-gray-100'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim() || !name.trim()}
              className="w-full py-3.5 rounded-xl bg-disc-d text-disc-D-text font-heading font-bold text-base hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Session →'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
