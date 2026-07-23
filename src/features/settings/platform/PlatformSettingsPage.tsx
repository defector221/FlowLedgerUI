import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { Button, Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { platformApi } from '@/services/api'
import { CAPABILITIES_QUERY_KEY } from '@/platform'
import type { OrganizationModuleResponse } from '@/platform'
import { FeatureManagementConsole } from './features'
import { EditionConsole } from './EditionConsole'
import { ModulesConsole } from './ModulesConsole'

export function PlatformSettingsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('features')

  const catalogQuery = useQuery({
    queryKey: ['platform', 'modules'],
    queryFn: platformApi.modules,
  })
  const editionsQuery = useQuery({
    queryKey: ['platform', 'editions'],
    queryFn: platformApi.editions,
  })
  const editionQuery = useQuery({
    queryKey: ['platform', 'edition'],
    queryFn: platformApi.edition,
  })
  const orgModulesQuery = useQuery({
    queryKey: ['platform', 'organization-modules'],
    queryFn: platformApi.organizationModules,
  })
  const featuresQuery = useQuery({
    queryKey: ['platform', 'organization-features'],
    queryFn: platformApi.organizationFeatures,
  })
  const allFeaturesQuery = useQuery({
    queryKey: ['platform', 'all-features'],
    queryFn: platformApi.allFeatures,
  })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CAPABILITIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['platform'] }),
      queryClient.invalidateQueries({ queryKey: ['organization', 'ops-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-health'] }),
    ])
    await queryClient.refetchQueries({ queryKey: CAPABILITIES_QUERY_KEY })
  }

  const changeEdition = useMutation({
    mutationFn: (editionCode: string) => platformApi.updateEdition(editionCode),
    onSuccess: async (data) => {
      queryClient.setQueryData(['platform', 'edition'], data)
      toast.success(data.editionCode === 'CUSTOM' ? 'Custom edition active — manage modules below' : 'Edition updated')
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const toggleModule = useMutation({
    mutationFn: (payload: { moduleCode: string; enabled: boolean }) =>
      platformApi.updateOrganizationModules([
        {
          moduleCode: payload.moduleCode,
          enabled: payload.enabled,
          ...(payload.enabled ? { licensed: true } : {}),
        },
      ]),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(['platform', 'organization-modules'], data)
      queryClient.setQueryData(
        CAPABILITIES_QUERY_KEY,
        (prev: import('@/platform').CapabilitiesResponse | undefined) => {
          if (!prev) return prev
          return {
            ...prev,
            modules: { ...prev.modules, [variables.moduleCode]: variables.enabled },
            moduleDetails: data,
          }
        },
      )
      toast.success(`${variables.moduleCode} ${variables.enabled ? 'enabled' : 'disabled'}`)
      await invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const orgModuleByCode = useMemo(() => {
    const map = new Map<string, OrganizationModuleResponse>()
    for (const row of orgModulesQuery.data ?? []) map.set(row.moduleCode, row)
    return map
  }, [orgModulesQuery.data])

  const featureCountByModule = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of allFeaturesQuery.data ?? []) {
      map.set(f.moduleCode, (map.get(f.moduleCode) ?? 0) + 1)
    }
    return map
  }, [allFeaturesQuery.data])

  const featuresLoading =
    catalogQuery.isLoading || allFeaturesQuery.isLoading || orgModulesQuery.isLoading || featuresQuery.isLoading

  const isCustomEdition = (editionQuery.data?.editionCode ?? '').toUpperCase() === 'CUSTOM'

  const openConfigure = (moduleCode: string) => {
    setTab('features')
    requestAnimationFrame(() => {
      document.getElementById(`module-panel-${moduleCode}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const goCustom = () => {
    if (isCustomEdition) {
      setTab('modules')
      return
    }
    changeEdition.mutate('CUSTOM', {
      onSuccess: () => setTab('modules'),
    })
  }

  return (
    <PageShell>
      <PageHeader
        title="Platform Settings"
        subtitle="Manage edition, modules, and feature entitlements for this organization."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="edition">Edition</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
        </TabsList>

        <TabsContent value="edition" className="space-y-4">
          <EditionConsole
            editions={editionsQuery.data ?? []}
            currentCode={editionQuery.data?.editionCode}
            currentLabel={editionQuery.data?.displayName}
            currentDescription={editionQuery.data?.description}
            loading={editionsQuery.isLoading || editionQuery.isLoading}
            switching={changeEdition.isPending}
            onSwitch={(editionCode) => changeEdition.mutate(editionCode)}
            onGoCustom={goCustom}
          />
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <ModulesConsole
            catalog={catalogQuery.data ?? []}
            orgModuleByCode={orgModuleByCode}
            featureCountByModule={featureCountByModule}
            isCustomEdition={isCustomEdition}
            loading={catalogQuery.isLoading || orgModulesQuery.isLoading}
            toggling={toggleModule.isPending}
            onToggle={(moduleCode, enabled) => toggleModule.mutate({ moduleCode, enabled })}
            onConfigure={openConfigure}
            onSwitchToCustom={goCustom}
          />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <FeatureManagementConsole
            catalog={catalogQuery.data ?? []}
            catalogFeatures={allFeaturesQuery.data ?? []}
            orgModules={orgModulesQuery.data ?? []}
            orgFeatures={featuresQuery.data ?? []}
            editionCode={editionQuery.data?.editionCode}
            editionLabel={editionQuery.data?.displayName}
            loading={featuresLoading}
          />
        </TabsContent>

        <TabsContent value="licenses">
          <Card>
            <CardContent className="space-y-2 p-5 text-sm text-slate-600">
              <p>
                Licensed modules:{' '}
                {(orgModulesQuery.data ?? []).filter((m) => m.licensed && m.effectivelyEnabled).length}
              </p>
              <p>Trial modules: {(orgModulesQuery.data ?? []).filter((m) => m.trial && m.effectivelyEnabled).length}</p>
              <p className="text-xs text-slate-400">
                Seat and invoice limits continue to be managed under Billing. Editions control module composition only.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/billing">Open Billing</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
