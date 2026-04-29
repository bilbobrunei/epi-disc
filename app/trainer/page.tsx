'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TrainerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    router.push('/trainer/dashboard')
  }

  return (
    <main className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💡</div>
          <h1 className="font-heading text-2xl font-bold text-white">EPI DISC</h1>
          <p className="text-gray-500 text-sm mt-1">Trainer Portal</p>
        </div>

        <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-6">
          <h2 className="font-heading text-base font-semibold text-white mb-5">Sign in</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-brand-dark-border text-white text-sm focus:outline-none focus:border-disc-d transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0d1117] border border-brand-dark-border text-white text-sm focus:outline-none focus:border-disc-d transition-all"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-disc-d text-disc-D-text font-heading font-bold text-sm hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Need an account? Contact your Epipeople admin.
        </p>
      </div>
    </main>
  )
}
