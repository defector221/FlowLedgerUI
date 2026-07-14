export type PartyLike = {
  id?: string
  customerName?: string | null
  supplierName?: string | null
  companyName?: string | null
  customerCode?: string | null
  supplierCode?: string | null
  gstin?: string | null
}

export function partyParts(party: PartyLike) {
  const contact = (party.customerName ?? party.supplierName)?.trim() || ''
  const company = party.companyName?.trim() || ''
  const code = (party.customerCode ?? party.supplierCode)?.trim() || ''
  const gstin = party.gstin?.trim() || ''
  return {
    primary: company || contact || party.id || '—',
    secondary: company ? contact : contact ? 'Individual' : '',
    meta: [code, gstin].filter(Boolean).join(' · '),
    hasCompany: Boolean(company),
  }
}

/** Single-line label for tables, maps, and simple selects. Company-first when present. */
export function customerLabel(customer: PartyLike) {
  const { primary, secondary, hasCompany } = partyParts(customer)
  if (hasCompany && secondary) return `${primary} · ${secondary}`
  return primary
}

export function supplierLabel(supplier: PartyLike) {
  return customerLabel(supplier)
}
