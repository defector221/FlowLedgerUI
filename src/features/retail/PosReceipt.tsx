import { useRef } from 'react'
import { CheckCircle2, Download, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { PosSale } from '@/types/api'
import { salesApi } from '@/services/api'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

export type PosReceiptStoreInfo = {
  name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
}

type Props = {
  sale: PosSale
  store?: PosReceiptStoreInfo | null
  /** @deprecated prefer store.name */
  storeName?: string
  customerName?: string | null
  gstin?: string | null
  legalName?: string | null
  onClose?: () => void
  compact?: boolean
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatStoreAddress(store?: PosReceiptStoreInfo | null) {
  if (!store) return []
  const lines: string[] = []
  if (store.address?.trim()) lines.push(store.address.trim())
  const cityLine = [store.city, store.state].filter((p) => p && p.trim()).join(', ')
  if (cityLine) lines.push(cityLine)
  if (store.phone?.trim()) lines.push(`Ph: ${store.phone.trim()}`)
  return lines
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildPrintHtml(
  sale: PosSale,
  opts: {
    storeName: string
    addressLines: string[]
    customerName?: string | null
    gstin?: string | null
    legalName?: string | null
  },
) {
  const bill = sale.billNumber || sale.id.slice(0, 8)
  const when = sale.completedAt ? new Date(sale.completedAt).toLocaleString('en-IN') : ''
  const lines = (sale.lines ?? [])
    .map(
      (line) => `<tr>
      <td>
        <div class="item">${escapeHtml(line.description ?? 'Item')}</div>
        <div class="meta">${Number(line.quantity)} × ${money(line.rate)}${
          Number(line.discountPercent) > 0 ? ` · −${Number(line.discountPercent)}%` : ''
        }</div>
      </td>
      <td class="right">${money(line.lineTotal)}</td>
    </tr>`,
    )
    .join('')
  const payments = (sale.payments ?? [])
    .map(
      (p) =>
        `<div class="row"><span>${escapeHtml(p.paymentMode)}</span><span>${money(p.amount)}</span></div>`,
    )
    .join('')
  const addressHtml = opts.addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${escapeHtml(bill)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 18px 16px;
      color: #0f172a;
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.45;
    }
    .ticket { max-width: 320px; margin: 0 auto; }
    .brand { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 12px; }
    .brand h1 { margin: 0; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; }
    .brand .legal { margin: 4px 0 0; color: #334155; font-size: 11px; }
    .brand .addr { margin: 6px 0 0; color: #64748b; font-size: 10px; line-height: 1.4; }
    .brand .gst { margin-top: 6px; font-size: 11px; font-weight: 700; color: #0f172a; letter-spacing: 0.02em; }
    .meta-block { margin-bottom: 12px; color: #475569; font-size: 11px; }
    .meta-block strong { color: #0f172a; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 0 0 6px; }
    th.right, td.right { text-align: right; }
    td { padding: 8px 0; vertical-align: top; border-bottom: 1px dotted #e2e8f0; }
    .item { color: #0f172a; font-weight: 600; }
    .meta { color: #64748b; font-size: 10px; margin-top: 2px; }
    .totals { margin-top: 10px; border-top: 1px dashed #94a3b8; padding-top: 10px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; color: #475569; }
    .grand { margin-top: 8px; padding-top: 8px; border-top: 2px solid #0f172a; font-size: 14px; font-weight: 700; color: #0f172a; }
    .paid { margin-top: 12px; text-align: center; border: 1px solid #0f172a; padding: 6px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    .thanks { margin-top: 14px; text-align: center; color: #64748b; font-size: 11px; }
    @media print {
      body { padding: 0; }
      @page { margin: 8mm; size: auto; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="brand">
      <h1>${escapeHtml(opts.storeName)}</h1>
      ${opts.legalName && opts.legalName !== opts.storeName ? `<div class="legal">${escapeHtml(opts.legalName)}</div>` : ''}
      ${addressHtml ? `<div class="addr">${addressHtml}</div>` : ''}
      ${opts.gstin ? `<div class="gst">GSTIN: ${escapeHtml(opts.gstin)}</div>` : ''}
      <p style="margin-top:8px;color:#64748b;font-size:10px;">Tax Invoice / Retail Receipt</p>
    </div>
    <div class="meta-block">
      <div><strong>Bill</strong> ${escapeHtml(bill)}</div>
      ${when ? `<div><strong>Date</strong> ${escapeHtml(when)}</div>` : ''}
      ${opts.customerName ? `<div><strong>Customer</strong> ${escapeHtml(opts.customerName)}</div>` : '<div><strong>Customer</strong> Walk-in</div>'}
    </div>
    <table>
      <thead><tr><th>Item</th><th class="right">Amount</th></tr></thead>
      <tbody>${lines}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
      <div class="row"><span>Discount</span><span>${money(sale.discountTotal)}</span></div>
      <div class="row"><span>Tax</span><span>${money(sale.taxTotal)}</span></div>
      <div class="row grand"><span>Total</span><span>₹ ${money(sale.grandTotal)}</span></div>
    </div>
    ${payments ? `<div class="totals">${payments}</div>` : ''}
    <div class="paid">Paid</div>
    <p class="thanks">Thank you for shopping with us</p>
  </div>
</body>
</html>`
}

export function PosReceiptActions({
  sale,
  store,
  storeName,
  customerName,
  gstin,
  legalName,
  onClose,
  compact,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const bill = sale.billNumber || sale.id.slice(0, 8)
  const when = sale.completedAt ? new Date(sale.completedAt).toLocaleString('en-IN') : null
  const displayStoreName = store?.name || storeName || 'FlowLedger POS'
  const addressLines = formatStoreAddress(store)
  const gst = gstin?.trim() || null
  const legal = legalName?.trim() || null

  const printReceipt = () => {
    const html = buildPrintHtml(sale, {
      storeName: displayStoreName,
      addressLines,
      customerName,
      gstin: gst,
      legalName: legal,
    })
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(iframe)

    const frameWindow = iframe.contentWindow
    const frameDoc = frameWindow?.document
    if (!frameWindow || !frameDoc) {
      document.body.removeChild(iframe)
      toast.error('Could not prepare the bill for printing')
      return
    }

    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()

    const cleanup = () => {
      try {
        document.body.removeChild(iframe)
      } catch {
        /* already removed */
      }
    }

    window.setTimeout(() => {
      try {
        frameWindow.focus()
        frameWindow.print()
      } catch {
        toast.error('Print failed. Try Invoice PDF instead.')
      } finally {
        window.setTimeout(cleanup, 800)
      }
    }, 150)
  }

  const downloadInvoicePdf = async () => {
    if (!sale.salesInvoiceId) return toast.error('No invoice linked to this sale')
    try {
      const blob = await salesApi.downloadInvoicePdf(sale.salesInvoiceId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `pos-bill-${bill}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div
        ref={printRef}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] text-slate-900 shadow-sm"
      >
        <div className="bg-slate-900 px-5 py-4 text-center text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-teal-300">Retail receipt</p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">{displayStoreName}</h3>
          {legal && legal !== displayStoreName ? (
            <p className="mt-0.5 text-xs text-slate-300">{legal}</p>
          ) : null}
          {addressLines.length ? (
            <div className="mt-2 space-y-0.5 text-[11px] leading-snug text-slate-400">
              {addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
          {gst ? (
            <p className="mt-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] tracking-wide text-teal-200 ring-1 ring-white/15">
              GSTIN {gst}
            </p>
          ) : null}
          <p className="mt-2 font-mono text-xs text-slate-300">{bill}</p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
            <div>
              <p className="font-medium text-slate-700">{customerName || 'Walk-in customer'}</p>
              {when ? <p className="mt-0.5">{when}</p> : null}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-3.5" />
              Paid
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Item</span>
              <span>Amount</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {(sale.lines ?? []).map((line) => (
                <li key={line.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{line.description ?? 'Item'}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {Number(line.quantity)} × {money(line.rate)}
                      {Number(line.discountPercent) > 0 ? ` · −${Number(line.discountPercent)}%` : ''}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-slate-900">{money(line.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono text-slate-700">{money(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span className="font-mono text-slate-700">−{money(sale.discountTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span className="font-mono text-slate-700">{money(sale.taxTotal)}</span>
            </div>
            <div className="mt-2 flex items-end justify-between border-t border-dashed border-slate-300 pt-3">
              <span className="text-sm font-semibold text-slate-800">Total paid</span>
              <span className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                ₹{money(sale.grandTotal)}
              </span>
            </div>
          </div>

          {(sale.payments ?? []).length ? (
            <div className="rounded-xl bg-slate-100/80 px-3 py-2.5 text-xs text-slate-600">
              {(sale.payments ?? []).map((p) => (
                <div key={p.id} className="flex justify-between py-0.5">
                  <span className="uppercase tracking-wide">{p.paymentMode}</span>
                  <span className="font-mono">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : null}

          <p className="text-center text-[11px] text-slate-400">Thank you for shopping with us</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="flex-1" onClick={printReceipt}>
          <Printer className="size-4" />
          Print bill
        </Button>
        {sale.salesInvoiceId ? (
          <Button type="button" variant="outline" className="flex-1" onClick={() => void downloadInvoicePdf()}>
            <Download className="size-4" />
            Invoice PDF
          </Button>
        ) : null}
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
