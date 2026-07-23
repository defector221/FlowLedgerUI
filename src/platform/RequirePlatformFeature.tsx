import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { Button, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/features/auth/auth'
import { useCapabilities, useHasFeature, useHasModule } from '@/platform'

export function RequirePlatformFeature({
  module,
  feature,
  title,
  children,
}: {
  module: string
  feature?: string
  title: string
  children: ReactNode
}) {
  const { canManageOrganization } = useAuth()
  const { isLoading } = useCapabilities()
  const moduleOn = useHasModule(module)
  const featureOn = useHasFeature(module, feature ?? '')

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title={title} />
        <p className="text-sm text-slate-500">Loading…</p>
      </PageShell>
    )
  }

  if (!moduleOn || (feature && !featureOn)) {
    return (
      <PageShell>
        <PageHeader title={title} />
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-base font-semibold text-slate-900">
              {!moduleOn ? `${module} module is disabled` : `${module}.${feature} is disabled`}
            </p>
            <p className="text-sm text-slate-600">
              Enable it in Platform Settings to use this screen.
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
