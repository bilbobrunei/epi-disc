'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DISC_ADJECTIVES, DISC_COLORS, DISC_LABELS } from '@/lib/disc-data'
import type { Trait } from '@/lib/supabase'

interface Override {
  original: string
  custom_label: string
  trait: string
}

export default function AdjectivesPage() {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/trainer')
  }, [router])

  const loadOverrides = useCallback(async () => {
    const { data } = await supabase.from('adjective_overrides').select('original, custom_label')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((r: { original: string; custom_label: string }) => { map[r.original] = r.custom_label })
      setOverrides(map)
    }
  }, [])

  useEffect(() => {
    checkAuth()
    loadOverrides()
  }, [checkAuth, loadOverrides])

  function startEdit(word: string) {
    setEditing(prev => ({ ...prev, [word]: overrides[word] ?? word }))
  }

  function cancelEdit(word: string) {
    setEditing(prev => { const n = { ...prev }; delete n[word]; return n })
  }

  async function saveLabel(word: string, trait: Trait) {
    const label = editing[word]?.trim()
    if (!label) return
    setSaving(word)
    if (label === word) {
      // Remove override (reset to default)
      await supabase.from('adjective_overrides').delete().eq('original', word)
      setOverrides(prev => { const n = { ...prev }; delete n[word]; return n })
    } else {
      await supabase.from('adjective_overrides').upsert(
        { original: word, custom_label: label, trait },
        { onConflict: 'original' }
      )
      setOverrides(prev => ({ ...prev, [word]: label }))
    }
    setEditing(prev => { const n = { ...prev }; delete n[word]; return n })
    setSaving(null)
    setSaved(word)
    setTimeout(() => setSaved(null), 1500)
  }

  async function resetAll() {
    if (!confirm('Reset ALL adjectives to their defaults?')) return
    await supabase.from('adjective_overrides').delete().neq('original', '')
    setOverrides({})
    setEditing({})
  }

  const traits: Trait[] = ['D', 'I', 'S', 'C']

  return (
    <main className="min-h-screen bg-brand-dark text-white">
      {/* Header */}
      <div className="border-b border-brand-dark-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/trainer/dashboard')} className="text-gray-400 hover:text-white transition-colors text-sm">← Dashboard</button>
          <span className="text-gray-600">|</span>
          <div>
            <h1 className="font-heading font-bold text-white text-base">Adjective Editor</h1>
            <p className="text-gray-500 text-xs">Customise words shown to participants</p>
          </div>
        </div>
        {Object.keys(overrides).length > 0 && (
          <button onClick={resetAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors border border-gray-700 px-3 py-1.5 rounded-lg">
            Reset all to defaults
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <p className="text-gray-400 text-sm">
          Click any adjective to rename it. Participants will see your custom label instead of the default.
          Saving the original word back resets it to default.
        </p>

        {traits.map(trait => {
          const color = DISC_COLORS[trait]
          const label = DISC_LABELS[trait]
          const words = DISC_ADJECTIVES[trait]
          return (
            <div key={trait}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="font-heading font-semibold text-white text-sm">
                  {trait} — {label}
                </h2>
                <span className="text-gray-600 text-xs">({words.length} adjectives)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {words.map(word => {
                  const isEditing = word in editing
                  const customLabel = overrides[word]
                  const isModified = !!customLabel && customLabel !== word
                  const isSaved = saved === word

                  return (
                    <div key={word}>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={editing[word]}
                            onChange={e => setEditing(prev => ({ ...prev, [word]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveLabel(word, trait)
                              if (e.key === 'Escape') cancelEdit(word)
                            }}
                            className="flex-1 min-w-0 px-3 py-2 bg-[#0d1117] border rounded-xl text-white text-sm focus:outline-none transition-all"
                            style={{ borderColor: color }}
                          />
                          <button
                            onClick={() => saveLabel(word, trait)}
                            disabled={saving === word}
                            className="px-2.5 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ backgroundColor: color + '30', color }}
                          >
                            {saving === word ? '…' : '✓'}
                          </button>
                          <button
                            onClick={() => cancelEdit(word)}
                            className="px-2.5 py-2 rounded-xl text-xs border border-gray-700 text-gray-400 hover:text-white transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(word)}
                          className="w-full px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-all hover:brightness-110"
                          style={isModified || isSaved ? {
                            backgroundColor: color + '18',
                            borderColor: color + '60',
                            color: 'white',
                          } : {
                            backgroundColor: '#161b22',
                            borderColor: '#30363d',
                            color: '#e6edf3',
                          }}
                        >
                          <span className="block truncate">
                            {isSaved ? '✓ ' : ''}{customLabel ?? word}
                          </span>
                          {isModified && (
                            <span className="block text-xs opacity-50 truncate">{word}</span>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
