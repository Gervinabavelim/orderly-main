'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

function getPasswordStrength(pw: string): { score: number; label: string; color: string; requirements: { met: boolean; text: string }[] } {
  const requirements = [
    { met: pw.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(pw) && /[a-z]/.test(pw), text: 'Upper & lowercase letters' },
    { met: /\d/.test(pw), text: 'At least one number' },
    { met: /[^A-Za-z0-9]/.test(pw), text: 'At least one special character' },
  ]

  let score = requirements.filter(r => r.met).length
  if (pw.length >= 12) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', requirements }
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500', requirements }
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-blue-500', requirements }
  return { score: 4, label: 'Strong', color: 'bg-green-500', requirements }
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const strength = useMemo(() => password ? getPasswordStrength(password) : null, [password])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const s = getPasswordStrength(password)
    if (s.score < 3) {
      setError('Password is too weak. Please meet the requirements below.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await createClient().auth.updateUser({ password })

    if (error) {
      if (error.message.includes('session') || error.message.includes('token')) {
        setError('This reset link has expired. Please request a new one.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    toast.success('Password updated successfully')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-card border-border animate-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600">
            <span className="text-lg font-bold text-white">O</span>
          </div>
          <CardTitle className="text-foreground text-xl">Set New Password</CardTitle>
          <p className="text-sm text-indigo-300/60">Enter your new password below</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="bg-muted border-border text-foreground text-base h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80 touch-manipulation"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength.score ? strength.color : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{strength.label}</p>
                  <ul className="space-y-0.5">
                    {strength.requirements.map((req) => (
                      <li key={req.text} className={`text-[11px] flex items-center gap-1.5 ${req.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <span>{req.met ? '✓' : '○'}</span>
                        {req.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground/80">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-muted border-border text-foreground text-base h-11"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-red-400">Passwords don&apos;t match</p>
              )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 h-12 text-base">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
