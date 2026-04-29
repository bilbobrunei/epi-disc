'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DISC_COLORS, DISC_TEXT, DISC_LABELS,
  computeScores, getDominant, getSecondary,
} from '@/lib/disc-data'
import type { Trait, Session, Participant, ParticipantWithScores } from '@/lib/supabase'

const TRAITS: Trait[] = ['D', 'I', 'S', 'C']

function calcAvg(parts: ParticipantWithScores[], t: Trait) {
  if (!parts.length) return 0
  return parseFloat((parts.reduce((s, p) => s + p.scores[t], 0) / parts.length).toFixed(1))
}

// ─── Participant card ─────────────────────────────────────────────────────────
function ParticipantCard({ p, isNew }: { p: ParticipantWithScores; isNew: boolean }) {
  const first = p.name.split(' ')[0]
  return (
    <div className={`bg-[#111722] border border-[#1e2a3a] rounded-xl p-3 ${isNew ? 'opacity-0 animate-slide-up' : ''}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${isNew ? 'animate-emoji-in' : ''}`}
          style={{ background: DISC_COLORS[p.dom] + '22', border: `1.5px solid ${DISC_COLORS[p.dom]}55` }}>
          {p.emoji}
        </div>
        <span className="text-[11px] font-semibold text-gray-200 truncate">{first}</span>
      </div>
      {TRAITS.map(t => (
        <div key={t} className="flex items-center gap-1.5 mb-1">
          <span className="text-[8px] font-bold w-2 flex-shrink-0" style={{ color: DISC_COLORS[t] }}>{t}</span>
          <div className="flex-1 bg-[#1a2233] rounded-full h-[5px] overflow-hidden">
            <div className="h-full rounded-full bar-fill" style={{ width: `${(p.scores[t] / 12) * 100}%`, background: DISC_COLORS[t] }} />
          </div>
          <span className="text-[8px] text-gray-600 w-2.5 text-right">{p.scores[t]}</span>
        </div>
      ))}
      <div className="mt-2 text-center">
        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${isNew ? 'opacity-0 animate-badge-pop [animation-delay:880ms]' : ''}`}
          style={{ background: DISC_COLORS[p.dom], color: DISC_TEXT[p.dom] }}>
          High {p.dom}
        </span>
      </div>
    </div>
  )
}

// ─── Dashboard view ───────────────────────────────────────────────────────────
function DashboardView({ parts, avgs }: { parts: ParticipantWithScores[]; avgs: Record<Trait, number> }) {
  const total = parts.length || 1
  return (
    <div>
      {/* Avg stat cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {TRAITS.map(t => (
          <div key={t} className="bg-[#111722] rounded-xl p-3 text-center"
            style={{ border: `1px solid ${DISC_COLORS[t]}30` }}>
            <div className="text-[9px] font-bold mb-1 uppercase tracking-wider" style={{ color: DISC_COLORS[t] }}>{t}</div>
            <div className="text-2xl font-bold text-white leading-none">{avgs[t].toFixed(1)}</div>
            <div className="text-[9px] text-gray-500 mt-0.5">avg</div>
          </div>
        ))}
      </div>

      {/* Quadrant grid — always D top-left, I top-right, C bottom-left, S bottom-right */}
      <div className="grid grid-cols-2 gap-2 mb-4 h-56">
        {(['D', 'I', 'C', 'S'] as Trait[]).map(t => {
          const inQ = parts.filter(p => p.dom === t)
          return (
            <div key={t} className="rounded-xl p-2.5 overflow-hidden flex flex-col"
              style={{ background: DISC_COLORS[t] + '12', border: `1px solid ${DISC_COLORS[t]}30` }}>
              <div className="text-[9px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: DISC_COLORS[t] }}>
                {t} — {DISC_LABELS[t]}
              </div>
              <div className="flex flex-wrap gap-1 content-start">
                {inQ.map(p => (
                  <span key={p.id} title={p.name} className="text-xl leading-none">{p.emoji}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribution bars */}
      <div className="bg-[#111722] border border-[#1e2a3a] rounded-xl p-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Group distribution</p>
        <div className="space-y-2.5">
          {TRAITS.map(t => {
            const cnt = parts.filter(p => p.dom === t).length
            const pct = Math.round((cnt / total) * 100)
            return (
              <div key={t} className="flex items-center gap-2">
                <span className="text-xs font-bold w-3 flex-shrink-0" style={{ color: DISC_COLORS[t] }}>{t}</span>
                <div className="flex-1 bg-[#1a2233] rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bar-fill" style={{ width: `${pct}%`, background: DISC_COLORS[t] }} />
                </div>
                <span className="text-xs font-bold text-white w-4 text-right">{cnt}</span>
                <span className="text-[10px] text-gray-500 w-8">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main live page ───────────────────────────────────────────────────────────
export default function LivePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [parts, setParts] = useState<ParticipantWithScores[]>([])
  const partsRef = useRef<ParticipantWithScores[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'cards' | 'dash'>('cards')
  const [sortTrait, setSortTrait] = useState<Trait>('D')
  const [toasts, setToasts] = useState<Array<{ id: string; name: string; emoji: string; dom: Trait }>>([])

  // Dashboard avg values — animate from previous to new
  const [avgs, setAvgs] = useState<Record<Trait, number>>({ D: 0, I: 0, S: 0, C: 0 })
  const avgsRef = useRef<Record<Trait, number>>({ D: 0, I: 0, S: 0, C: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confettiFn = useRef<((opts: object) => void) | null>(null)

  // Keep partsRef in sync
  useEffect(() => { partsRef.current = parts }, [parts])

  // Sorted participants for cards view
  const sorted = useMemo(() => [...parts].sort((a, b) => {
    if (b.scores[sortTrait] !== a.scores[sortTrait]) return b.scores[sortTrait] - a.scores[sortTrait]
    return getSecondary(b.scores, sortTrait) - getSecondary(a.scores, sortTrait)
  }), [parts, sortTrait])

  // Load initial data
  const loadData = useCallback(async () => {
    const { data: s } = await supabase.from('sessions').select('*').eq('code', code).single()
    if (!s) { router.push('/trainer/dashboard'); return }
    setSession(s)

    const { data: existing } = await supabase
      .from('participants').select('*')
      .eq('session_id', s.id).eq('submitted', true)
    if (!existing?.length) return

    const enriched = await Promise.all(existing.map(async p => {
      const { data: res } = await supabase.from('responses').select('trait').eq('participant_id', p.id)
      const scores = computeScores((res || []) as { trait: Trait }[])
      return { ...p, scores, dom: getDominant(scores) } as ParticipantWithScores
    }))
    setParts(enriched)
  }, [code, router])

  useEffect(() => { loadData() }, [loadData])

  // Init confetti
  useEffect(() => {
    if (!canvasRef.current) return
    import('canvas-confetti').then(mod => {
      confettiFn.current = mod.default.create(canvasRef.current!, { resize: true, useWorker: false }) as unknown as (opts: object) => void
    })
  }, [])

  // Animate avg numbers whenever parts changes
  useEffect(() => {
    TRAITS.forEach(t => {
      const target = calcAvg(parts, t)
      const from = avgsRef.current[t]
      if (Math.abs(target - from) < 0.05) return
      const dur = 600
      const start = performance.now()
      function tick(now: number) {
        const progress = Math.min((now - start) / dur, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const val = parseFloat((from + (target - from) * eased).toFixed(1))
        setAvgs(prev => ({ ...prev, [t]: val }))
        if (progress < 1) requestAnimationFrame(tick)
        else { avgsRef.current[t] = target; setAvgs(prev => ({ ...prev, [t]: target })) }
      }
      requestAnimationFrame(tick)
    })
  }, [parts])

  // Realtime
  useEffect(() => {
    if (!session) return
    const channel = supabase.channel(`live-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'participants',
        filter: `session_id=eq.${session.id}`,
      }, async (payload) => {
        const p = payload.new
        if (!p.submitted) return
        const { data: res } = await supabase.from('responses').select('trait').eq('participant_id', p.id)
        const scores = computeScores((res || []) as { trait: Trait }[])
        const dom = getDominant(scores)
        const enriched: ParticipantWithScores = { ...(p as Participant), scores, dom }

        const isNew = !partsRef.current.find(x => x.id === p.id)
        setParts(prev => isNew ? [...prev, enriched] : prev.map(x => x.id === p.id ? enriched : x))

        if (isNew) {
          setNewIds(prev => new Set([...prev, p.id as string]))
          setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(p.id as string); return n }), 1200)

          const toast = { id: p.id + Date.now(), name: p.name as string, emoji: p.emoji as string, dom }
          setToasts(prev => [toast, ...prev].slice(0, 4))
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 3300)

          if (confettiFn.current) {
            confettiFn.current({
              particleCount: 65, spread: 75,
              origin: { y: 0.6, x: 0.4 + Math.random() * 0.2 },
              colors: [DISC_COLORS[dom], '#ffffff', DISC_COLORS[dom]],
              startVelocity: 28, gravity: 1.1, ticks: 160, scalar: 0.85,
            })
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        setSession(prev => prev ? { ...prev, ...payload.new } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function updateSession(patch: Partial<Session>) {
    if (!session) return
    await supabase.from('sessions').update(patch).eq('id', session.id)
    setSession(prev => prev ? { ...prev, ...patch } : prev)
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-white relative overflow-hidden p-5" style={{ fontFamily: 'var(--font-poppins)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

      {/* Toasts */}
      <div className="absolute top-16 right-5 z-30 flex flex-col gap-1.5 w-48">
        {toasts.map(t => (
          <div key={t.id} className="bg-[#111722] rounded-r-lg px-3 py-2 text-xs text-gray-400 flex items-center gap-2 animate-toast border-l-[3px]"
            style={{ borderColor: DISC_COLORS[t.dom] }}>
            <span className="text-sm">{t.emoji}</span>
            <span><span className="font-bold text-white">{t.name.split(' ')[0]}</span> just submitted</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-[3px] font-mono mb-1">Live Session</p>
          <h1 className="text-3xl font-bold tracking-[6px] font-mono">{code}</h1>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">submitted</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{parts.length}</span>
            <span className="text-gray-500 text-sm">/ ∞</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#0f1520] border border-[#1e2535] rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#52C272] animate-pulse-dot" />
          <span className="text-xs font-bold text-[#52C272] tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[#0f1520] rounded-full mb-4 overflow-hidden">
        <div className="h-full rounded-full bar-fill" style={{
          width: parts.length ? '100%' : '0%',
          background: 'linear-gradient(90deg,#52C272,#5B9BD5)',
          transition: 'none',
        }} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        {/* View toggle */}
        <div className="flex bg-[#0f1520] border border-[#1e2535] rounded-lg p-0.5 gap-0.5">
          {(['cards', 'dash'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${view === v ? 'bg-[#1e2a3a] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {v === 'dash' ? 'Dashboard' : 'Cards'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort — cards only */}
          {view === 'cards' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Sort</span>
              {TRAITS.map(t => (
                <button key={t} onClick={() => setSortTrait(t)}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all"
                  style={sortTrait === t
                    ? { background: DISC_COLORS[t], color: DISC_TEXT[t], borderColor: DISC_COLORS[t] }
                    : { background: 'transparent', color: '#555', borderColor: '#1e2535' }}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Session controls */}
          {session && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {session.is_active && !session.submissions_closed && (
                <button onClick={() => updateSession({ submissions_closed: true })}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-500/20 text-orange-400 border border-orange-400/30 hover:bg-orange-500/30 transition-all">
                  Close submissions
                </button>
              )}
              {session.submissions_closed && !session.reveal_results && (
                <button onClick={() => updateSession({ reveal_results: true })}
                  className="px-3 py-1 text-xs font-bold rounded-lg transition-all"
                  style={{ background: DISC_COLORS.I + '20', color: DISC_COLORS.I, border: `1px solid ${DISC_COLORS.I}50` }}>
                  Reveal results ✨
                </button>
              )}
              {session.submissions_closed && (
                <span className="text-xs font-bold text-orange-400">Submissions closed</span>
              )}
              {session.reveal_results && (
                <span className="text-xs font-bold" style={{ color: DISC_COLORS.I }}>Results revealed ✨</span>
              )}
              <button onClick={() => router.push('/trainer/dashboard')}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1">← Dashboard</button>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {parts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#1e2535] animate-ring-out" />
            <div className="absolute inset-2 rounded-full border-2 border-[#52C272] opacity-30 animate-ring-out-delay" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#52C272] animate-pulse-dot" />
            </div>
          </div>
          <p className="text-sm">Waiting for participants to submit...</p>
          <p className="text-xs text-gray-600 mt-2">Share code <span className="font-mono font-bold text-gray-400">{code}</span> with your audience</p>
        </div>
      )}

      {/* Cards — keep mounted, just hide */}
      <div className={view === 'cards' && parts.length > 0 ? 'block' : 'hidden'}>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {sorted.map(p => (
            <ParticipantCard key={p.id} p={p} isNew={newIds.has(p.id)} />
          ))}
        </div>
      </div>

      {/* Dashboard — keep mounted, just hide */}
      <div className={view === 'dash' && parts.length > 0 ? 'block' : 'hidden'}>
        <DashboardView parts={parts} avgs={avgs} />
      </div>
    </main>
  )
}
