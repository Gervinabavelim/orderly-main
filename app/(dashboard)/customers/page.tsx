import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Customers' }
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Phone, Users, ChevronRight } from 'lucide-react'
import { CustomerSearch } from '@/components/customers/customer-search'
import { ExportButton } from '@/components/export-button'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  const { data: allCustomers } = await supabase
    .from('customers')
    .select('*, orders:orders(count)')
    .order('created_at', { ascending: false })

  const customers = q
    ? allCustomers?.filter((c) => {
        const search = q.toLowerCase()
        return c.name?.toLowerCase().includes(search) || c.phone?.includes(search)
      })
    : allCustomers

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">{customers?.length ?? 0} customers</p>
        </div>
        <ExportButton type="customers" />
      </div>

      <CustomerSearch defaultValue={q ?? ''} />

      {!customers?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{q ? 'No customers found' : 'No customers yet'}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {q ? 'Try a different search term' : "They'll appear here when they place their first order"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer, i) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className={`block animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
            >
              <Card className="bg-card border-border hover:border-border transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0">
                      {getInitials(customer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {customer.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 shrink-0" />
                        {customer.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {(customer.orders as Array<{ count: number }>)?.[0]?.count ?? 0} orders
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
