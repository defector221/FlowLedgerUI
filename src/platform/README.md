# Platform module registry (UI)

Phase 1 registry lives under `src/platform`.

- `types.ts` — capabilities / catalog DTOs and RBAC→platform code map
- `registry.ts` — `registerModule`, entitlement helpers
- `useCapabilities.ts` — React Query hook for `GET /platform/organization/capabilities`
- `FeatureGate.tsx` — render children only when module/feature enabled
- `modules/index.ts` — side-effect registration of known modules

Sidebar and Ctrl+K filter with `isPlatformModuleEnabled` + existing `canAccessModule` RBAC.
