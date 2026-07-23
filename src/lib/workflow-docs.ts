/** Maps workflow approval entity types to in-app document routes. */
export function workflowDocumentPath(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null
  switch (entityType.toUpperCase()) {
    case 'QUOTATION':
      return `/sales/quotations/${entityId}`
    case 'SALES_ORDER':
      return `/sales/orders/${entityId}`
    case 'DELIVERY_CHALLAN':
      return `/sales/challans/${entityId}`
    case 'SALES_INVOICE':
      return `/sales/invoices/${entityId}`
    case 'PURCHASE_ORDER':
      return `/purchases/orders/${entityId}`
    case 'PURCHASE_INVOICE':
      return `/purchases/invoices/${entityId}`
    case 'SHIPMENT':
      return `/transport/shipments/${entityId}`
    default:
      return null
  }
}

export function workflowDocumentLabel(entityType: string | null | undefined): string {
  if (!entityType) return 'Open document'
  switch (entityType.toUpperCase()) {
    case 'QUOTATION':
      return 'Open quotation'
    case 'SALES_ORDER':
      return 'Open sales order'
    case 'DELIVERY_CHALLAN':
      return 'Open delivery challan'
    case 'SALES_INVOICE':
      return 'Open invoice'
    case 'PURCHASE_ORDER':
      return 'Open purchase order'
    case 'PURCHASE_INVOICE':
      return 'Open purchase invoice'
    case 'SHIPMENT':
      return 'Open shipment'
    default:
      return 'Open document'
  }
}

export function humanizeWorkflowToken(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
