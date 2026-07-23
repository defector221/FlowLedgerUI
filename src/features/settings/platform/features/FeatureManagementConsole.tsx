import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { platformApi } from '@/services/api'
import { CAPABILITIES_QUERY_KEY } from '@/platform'
import type {
  ModuleCatalogItem,
  ModuleFeatureCatalogItem,
  OrganizationFeatureResponse,
  OrganizationModuleResponse,
} from '@/platform'
import { FeatureFilters } from './FeatureFilters'
import { FeatureGrid } from './FeatureGrid'
import { FeatureSearch } from './FeatureSearch'
import { ModuleHeader } from './ModuleHeader'
import { ModuleSummary } from './ModuleSummary'
import { StickyActionBar } from './StickyActionBar'
import {
  featureKey,
  resolveFeatureEnabled,
  resolveModuleEnabled,
  statusForFeature,
  type FeatureFilter,
} from './feature-types'

export function FeatureManagementConsole({
  catalog,
  catalogFeatures,
  orgModules,
  orgFeatures,
  editionCode,
  editionLabel,
  loading,
}: {
  catalog: ModuleCatalogItem[]
  catalogFeatures: ModuleFeatureCatalogItem[]
  orgModules: OrganizationModuleResponse[]
  orgFeatures: OrganizationFeatureResponse[]
  editionCode?: string
  editionLabel?: string
  loading?: boolean
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FeatureFilter>('active_modules')
  const [moduleDraft, setModuleDraft] = useState<Record<string, boolean>>({})
  const [featureDraft, setFeatureDraft] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const serverModules = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of orgModules) map[row.moduleCode] = row.effectivelyEnabled
    return map
  }, [orgModules])

  const serverFeatures = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of orgFeatures) map[featureKey(row.moduleCode, row.featureCode)] = row.effectivelyEnabled
    return map
  }, [orgFeatures])

  // Drafts start empty and inherit server values until the user edits.
  // They are cleared after a successful save.
  useEffect(() => {
    if (!catalogFeatures.length) return
    setExpanded((prev) => {
      const next = { ...prev }
      const modules = new Set(catalogFeatures.map((f) => f.moduleCode))
      for (const code of modules) {
        if (next[code] === undefined) next[code] = true
      }
      return next
    })
  }, [catalogFeatures])

  const modulesWithFeatures = useMemo(() => {
    const codes = new Set(catalogFeatures.map((f) => f.moduleCode))
    return catalog.filter((m) => m.status === 'ACTIVE' && codes.has(m.code))
  }, [catalog, catalogFeatures])

  const dirty =
    Object.keys(moduleDraft).some((code) => moduleDraft[code] !== (serverModules[code] ?? false)) ||
    Object.keys(featureDraft).some((key) => {
      const [moduleCode, featureCode] = key.split('.')
      const catalogFeature = catalogFeatures.find(
        (f) => f.moduleCode === moduleCode && f.featureCode === featureCode,
      )
      const baseline =
        key in serverFeatures ? serverFeatures[key] : (catalogFeature?.enabledByDefault ?? false)
      return featureDraft[key] !== baseline
    })

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return modulesWithFeatures
      .map((module) => {
        const moduleEnabled = resolveModuleEnabled(module.code, moduleDraft, serverModules, false)
        const features = catalogFeatures
          .filter((f) => f.moduleCode === module.code)
          .filter((f) => {
            if (q) {
              const hay = `${f.displayName} ${f.description ?? ''} ${f.featureCode} ${module.displayName}`.toLowerCase()
              if (!hay.includes(q)) return false
            }
            const enabled = resolveFeatureEnabled(
              f.moduleCode,
              f.featureCode,
              f.enabledByDefault,
              featureDraft,
              serverFeatures,
            )
            const status = statusForFeature(enabled, f.status)
            if (filter === 'enabled') return enabled
            if (filter === 'disabled') return !enabled
            if (filter === 'beta') return status === 'beta' || status === 'preview'
            return true
          })
        const enabledCount = catalogFeatures
          .filter((f) => f.moduleCode === module.code)
          .filter((f) =>
            resolveFeatureEnabled(
              f.moduleCode,
              f.featureCode,
              f.enabledByDefault,
              featureDraft,
              serverFeatures,
            ),
          ).length
        return { module, features, enabledCount, moduleEnabled, totalFeatures: catalogFeatures.filter((f) => f.moduleCode === module.code).length }
      })
      .filter((group) => {
        if (filter === 'active_modules' && !group.moduleEnabled) return false
        if (filter === 'all' || filter === 'active_modules') {
          return q ? group.features.length > 0 : true
        }
        return group.features.length > 0
      })
  }, [
    modulesWithFeatures,
    catalogFeatures,
    moduleDraft,
    featureDraft,
    serverModules,
    serverFeatures,
    query,
    filter,
  ])

  const stats = useMemo(() => {
    let features = 0
    let enabled = 0
    for (const module of modulesWithFeatures) {
      const moduleFeatures = catalogFeatures.filter((f) => f.moduleCode === module.code)
      features += moduleFeatures.length
      for (const f of moduleFeatures) {
        if (
          resolveFeatureEnabled(f.moduleCode, f.featureCode, f.enabledByDefault, featureDraft, serverFeatures)
        ) {
          enabled += 1
        }
      }
    }
    return {
      modules: modulesWithFeatures.length,
      features,
      enabled,
      disabled: Math.max(0, features - enabled),
    }
  }, [modulesWithFeatures, catalogFeatures, featureDraft, serverFeatures])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const moduleUpdates = Object.entries(moduleDraft)
        .filter(([code, enabled]) => enabled !== (serverModules[code] ?? false))
        .map(([moduleCode, enabled]) => ({
          moduleCode,
          enabled,
          ...(enabled ? { licensed: true } : {}),
        }))

      const featureUpdates = Object.entries(featureDraft)
        .filter(([key, enabled]) => {
          const [moduleCode, featureCode] = key.split('.')
          const catalogFeature = catalogFeatures.find(
            (f) => f.moduleCode === moduleCode && f.featureCode === featureCode,
          )
          const baseline =
            key in serverFeatures ? serverFeatures[key] : (catalogFeature?.enabledByDefault ?? false)
          return enabled !== baseline
        })
        .map(([key, enabled]) => {
          const [moduleCode, featureCode] = key.split('.')
          return { moduleCode, featureCode, enabled, ...(enabled ? { licensed: true } : {}) }
        })

      if (moduleUpdates.length) {
        await platformApi.updateOrganizationModules(moduleUpdates)
      }
      if (featureUpdates.length) {
        await platformApi.updateOrganizationFeatures(featureUpdates)
      }
      return { moduleUpdates, featureUpdates }
    },
    onSuccess: async () => {
      toast.success('Feature settings saved')
      setModuleDraft({})
      setFeatureDraft({})
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CAPABILITIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['platform'] }),
        queryClient.invalidateQueries({ queryKey: ['organization', 'ops-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-health'] }),
      ])
      await queryClient.refetchQueries({ queryKey: CAPABILITIES_QUERY_KEY })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const resetDrafts = () => {
    setModuleDraft({})
    setFeatureDraft({})
  }

  return (
    <div className="space-y-5">
      {(editionCode ?? '').toUpperCase() === 'CUSTOM' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          Custom edition keeps whatever modules you already had. Turn modules off on the{' '}
          <span className="font-semibold text-slate-800">Modules</span> tab — the sidebar and this list only
          reflect modules that are On. Use <span className="font-semibold text-slate-800">Save</span> after
          changing feature switches.
        </div>
      ) : null}

      {dirty ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
          You have unsaved feature changes. Click <span className="font-semibold">Save</span> at the bottom to
          apply them to the app and sidebar.
        </div>
      ) : null}

      <ModuleSummary
        modules={stats.modules}
        features={stats.features}
        enabled={stats.enabled}
        disabled={stats.disabled}
        loading={loading}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FeatureSearch value={query} onChange={setQuery} />
        <FeatureFilters value={filter} onChange={setFilter} />
      </div>

      {loading ? (
        <FeatureGrid features={[]} isEnabled={() => false} moduleEnabled={false} onToggle={() => undefined} loading />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center text-sm text-slate-500">
          No configurable features match your filters.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const isOpen = expanded[group.module.code] !== false
            return (
              <section key={group.module.code} className="space-y-3" aria-labelledby={`module-title-${group.module.code}`}>
                <ModuleHeader
                  module={group.module}
                  editionLabel={editionLabel ?? editionCode}
                  featureCount={group.totalFeatures}
                  enabledCount={group.enabledCount}
                  moduleEnabled={group.moduleEnabled}
                  expanded={isOpen}
                  coreLocked={group.module.core}
                  onToggleExpanded={() =>
                    setExpanded((prev) => ({ ...prev, [group.module.code]: !isOpen }))
                  }
                  onModuleToggle={(enabled) =>
                    setModuleDraft((prev) => ({ ...prev, [group.module.code]: enabled }))
                  }
                />
                <div
                  id={`module-panel-${group.module.code}`}
                  hidden={!isOpen}
                  className="overflow-hidden transition-[opacity,transform] duration-200"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(-4px)',
                  }}
                >
                  {isOpen ? (
                    <FeatureGrid
                      features={group.features}
                      moduleEnabled={group.moduleEnabled}
                      isEnabled={(feature) =>
                        resolveFeatureEnabled(
                          feature.moduleCode,
                          feature.featureCode,
                          feature.enabledByDefault,
                          featureDraft,
                          serverFeatures,
                        )
                      }
                      onToggle={(feature, enabled) =>
                        setFeatureDraft((prev) => ({
                          ...prev,
                          [featureKey(feature.moduleCode, feature.featureCode)]: enabled,
                        }))
                      }
                    />
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {dirty ? (
        <StickyActionBar
          dirty={dirty}
          saving={saveMutation.isPending}
          onSave={() => saveMutation.mutate()}
          onReset={resetDrafts}
        />
      ) : null}
    </div>
  )
}
