import type { WarehouseResponse } from '@/types/api'

/** Prefer org settings default, then warehouse flagged default, else first warehouse. */
export function resolveDefaultWarehouseId(warehouses: WarehouseResponse[], orgDefaultWarehouseId?: string | null) {
  if (orgDefaultWarehouseId && warehouses.some((w) => w.id === orgDefaultWarehouseId)) {
    return orgDefaultWarehouseId
  }
  const flagged = warehouses.find((w) => w.defaultWarehouse)
  if (flagged) return flagged.id
  return warehouses[0]?.id ?? ''
}
