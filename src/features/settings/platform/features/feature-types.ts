import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Gift,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  Percent,
  RotateCcw,
  ScanBarcode,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Truck,
  Users,
  Wallet,
  Workflow,
  Tag,
  Lightbulb,
  Clock3,
} from 'lucide-react'
import type { ModuleCatalogItem, ModuleFeatureCatalogItem } from '@/platform'

export type FeatureFilter = 'all' | 'active_modules' | 'enabled' | 'disabled' | 'beta'

export type FeatureStatus = 'enabled' | 'disabled' | 'beta' | 'preview'

export function featureKey(moduleCode: string, featureCode: string) {
  return `${moduleCode}.${featureCode}`
}

export function resolveFeatureEnabled(
  moduleCode: string,
  featureCode: string,
  enabledByDefault: boolean,
  draft: Record<string, boolean>,
  server: Record<string, boolean>,
): boolean {
  const key = featureKey(moduleCode, featureCode)
  if (key in draft) return draft[key]
  if (key in server) return server[key]
  return enabledByDefault
}

export function resolveModuleEnabled(
  moduleCode: string,
  draft: Record<string, boolean>,
  server: Record<string, boolean>,
  fallback = false,
): boolean {
  if (moduleCode in draft) return draft[moduleCode]
  if (moduleCode in server) return server[moduleCode]
  return fallback
}

export function statusForFeature(enabled: boolean, catalogStatus: string): FeatureStatus {
  if (catalogStatus === 'COMING_SOON' || catalogStatus === 'PREVIEW') return 'preview'
  if (catalogStatus === 'BETA' || catalogStatus === 'DEPRECATED') return 'beta'
  return enabled ? 'enabled' : 'disabled'
}

const MODULE_ICONS: Record<string, LucideIcon> = {
  AI: Sparkles,
  RETAIL: Store,
  TRANSPORT: Truck,
  SALES: ShoppingCart,
  PURCHASE: ShoppingCart,
  INVENTORY: Boxes,
  ACCOUNTING: BookOpen,
  CRM: Target,
  PAYMENTS: Wallet,
  REPORTS: BarChart3,
  DASHBOARD: LayoutDashboard,
  SETTINGS: Settings,
  AUDIT: ShieldCheck,
  WAREHOUSE: Building2,
  MANUFACTURING: Workflow,
  HR: Users,
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  ASSISTANT: MessageSquare,
  AUTOMATION: Workflow,
  FORECASTS: LineChart,
  INSIGHTS: Lightbulb,
  POS: ScanBarcode,
  STORES: Store,
  CATALOG: Tag,
  RETURNS: RotateCcw,
  PRICING: Percent,
  GIFT_CARDS: Gift,
  LOYALTY: Gift,
  BARCODE: ScanBarcode,
  INVENTORY_SYNC: Package,
  VEHICLES: Truck,
  DRIVERS: Users,
  TRACKING: Truck,
  GPS: Target,
  ROUTE_OPTIMIZATION: Workflow,
  DELIVERY_PLANNING: Clock3,
  POD: Package,
}

export function moduleIcon(code: string): LucideIcon {
  return MODULE_ICONS[code] ?? Package
}

export function featureIcon(featureCode: string, moduleCode: string): LucideIcon {
  return FEATURE_ICONS[featureCode] ?? moduleIcon(moduleCode)
}

export type ModuleFeatureGroup = {
  module: ModuleCatalogItem
  features: ModuleFeatureCatalogItem[]
  enabledCount: number
  moduleEnabled: boolean
}
