import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/features/auth/auth'
import { useCapabilities } from '@/platform'

export function useRetailEnabled() {
  const query = useCapabilities()
  return {
    ...query,
    data: query.data ? { retailEnabled: query.data.modules.RETAIL === true } : undefined,
  }
}

export function RetailModuleGate({ children, title }: { children: ReactNode; title?: string }) {
  const { canManageOrganization } = useAuth()
  const { data: capabilities, isLoading } = useCapabilities()

  if (isLoading) {
    return (
      <PageShell>
        {title ? <PageHeader title={title} /> : null}
        <p className="text-sm text-slate-500">Loading…</p>
      </PageShell>
    )
  }

  if (capabilities && capabilities.modules.RETAIL !== true) {
    return (
      <PageShell>
        {title ? <PageHeader title={title} /> : null}
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-base font-semibold text-slate-900">Retail module is disabled</p>
            <p className="text-sm text-slate-600">
              Enable Retail in Platform Settings (or Organization Settings) to use stores, shifts, POS, and related
              features.
            </p>
            {canManageOrganization() ? (
              <Button asChild>
                <Link to="/settings/platform">Open Platform Settings</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return <>{children}</>
}
