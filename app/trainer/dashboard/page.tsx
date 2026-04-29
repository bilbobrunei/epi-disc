'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateCode } from '@/lib/disc-data'
import type { Session } from '@/lib/supabase'

export default function TrainerDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/trainer')
  }, [router])

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
    loadSessions()
  }, [checkAuth, loadSessions])

  async function createSession() {
    if (!newName.trim()) return
    setCreating(true)
    let code = generateCode()
    // Ensure unique code
    let attempts = 0
    while (attempts < 10) {
      const { data } = await supabase.from('sessions').select('id').eq('code', code).maybeSingle()
      if (!data) break
      code = generateCode()
      attempts++
    }
    const { error } = await supabase.from('sessions').insert({ name: newName.trim(), code })
    if (!error) {
      setNewName('')
      setShowCreate(false)
      loadSessions()
    }
    setCreating(false)
  }

  async function updateSession(id: string, patch: Partial<Session>) {
    await supabase.from('sessions').update(patch).eq('id', id)
    loadSessions()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/trainer')
  }

  const statusBadge = (s: Session) => {
    if (s.submissions_closed) return { label: 'Closed', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' }
    if (s.is_active) return { label: 'Active', color: 'text-disc-d bg-disc-d/10 border-disc-d/30' }
    return { label: 'Draft', color: 'text-gray-400 bg-gray-400/10 border-gray-400/30' }
  }

  return (
    <main className="min-h-screen bg-brand-dark text-white">
      {/* Header */}
      <div className="border-b border-brand-dark-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h1 className="font-heading font-bold text-white text-base">EPI DISC</h1>
            <p className="text-gray-500 text-xs">Trainer Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-disc-d text-disc-D-text font-heading font-bold text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all">
            + New session
          </button>
          <button onClick={signOut} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Sign out</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Create modal */}
        {showCreate && (
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5 mb-6 animate-fade-up">
            <h2 className="font-heading font-semibold text-white mb-4">Create new session</h2>
            <div className="flex gap-3">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Session name (e.g. Shell Batch 3)"
                className="flex-1 px-4 py-2.5 bg-[#0d1117] border border-brand-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-disc-d transition-all"
                onKeyDown={e => e.key === 'Enter' && createSession()}
              />
              <button onClick={createSession} disabled={creating || !newName.trim()} className="px-5 py-2.5 bg-disc-d text-disc-D-text font-bold text-sm rounded-xl hover:brightness-105 disabled:opacity-50 transition-all">
                {creating ? '...' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 border border-brand-dark-border text-gray-400 text-sm rounded-xl hover:border-gray-500 transition-all">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-400">No sessions yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const badge = statusBadge(s)
              return (
                <div key={s.id} className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-heading font-semibold text-white">{s.name}</h3>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                        {s.reveal_results && <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border text-disc-i bg-disc-i/10 border-disc-i/30">Revealed</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-gray-400 font-mono">{s.code}</code>
                        <span className="text-gray-600 text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!s.is_active && (
                        <button onClick={() => updateSession(s.id, { is_active: true })}
                          className="px-3 py-1.5 bg-disc-d text-disc-D-text text-xs font-bold rounded-lg hover:brightness-105 transition-all">
                          Activate
                        </button>
                      )}
                      {s.is_active && !s.submissions_closed && (
                        <button onClick={() => updateSession(s.id, { submissions_closed: true })}
                          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-400/30 text-xs font-bold rounded-lg hover:bg-orange-500/30 transition-all">
                          Close submissions
                        </button>
                      )}
                      {s.is_active && !s.reveal_results && (
                        <button onClick={() => updateSession(s.id, { reveal_results: true })}
                          className="px-3 py-1.5 bg-disc-i/20 text-disc-i border border-disc-i/30 text-xs font-bold rounded-lg hover:bg-disc-i/30 transition-all">
                          Reveal results
                        </button>
                      )}
                      {s.is_active && (
                        <button onClick={() => router.push(`/trainer/session/${s.code}/live`)}
                          className="px-3 py-1.5 bg-disc-c/20 text-disc-c border border-disc-c/30 text-xs font-bold rounded-lg hover:bg-disc-c/30 transition-all">
                          Live screen →
                        </button>
                      )}
                      {s.is_active && (
                        <button onClick={() => updateSession(s.id, { is_active: false })}
                          className="px-3 py-1.5 border border-brand-dark-border text-gray-400 text-xs font-bold rounded-lg hover:border-gray-500 transition-all">
                          End
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
