import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { Button, Card, CardContent } from '@/components/ui'
import { organizationApi } from '@/services/api'
import { useAuth } from '@/features/auth/auth'

export function useRetailEnabled() {
  return useQuery({
    queryKey: ['organization', 'ops-settings'],
    queryFn: organizationApi.settings,
    staleTime: 30_000,
  })
}

export function RetailModuleGate({ children, title }: { children: ReactNode; title?: string }) {
  const { canManageOrganization } = useAuth()
  const { data: settings, isLoading } = useRetailEnabled()

  if (isLoading) {
    return (
      <PageShell>
        {title ? <PageHeader title={title} /> : null}
        <p className="text-sm text-slate-500">Loading…</p>
      </PageShell>
    )
  }

  if (settings && settings.retailEnabled === false) {
    return (
      <PageShell>
        {title ? <PageHeader title={title} /> : null}
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-base font-semibold text-slate-900">Retail module is disabled</p>
            <p className="text-sm text-slate-600">
              Enable Retail in organization settings to use stores, shifts, POS, and related features.
            </p>
            {canManageOrganization() ? (
              <Button asChild>
                <Link to="/settings/organization">Open organization settings</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return <>{children}</>
}
