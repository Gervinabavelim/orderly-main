import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient, isMissingSupabaseEnv } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isMissingSupabaseEnv()) redirect('/login')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const fullName = user.user_metadata?.full_name ?? user.email ?? 'Owner'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar userName={fullName} />
      <main className="md:pl-64">
        <div className="pt-18 pb-24 px-4 md:pt-8 md:pb-8 md:px-8 max-w-7xl mx-auto">
          <Suspense>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
