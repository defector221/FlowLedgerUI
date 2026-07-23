import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import type { AuditLogResponse } from '@/types/api'
import { downloadText, rowsToCsv } from '../audit-model'

export function ExportMenu({ rows }: { rows: AuditLogResponse[] }) {
  const ensureRows = () => {
    if (!rows.length) {
      toast.error('Nothing to export on this page')
      return false
    }
    return true
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Download className="size-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onSelect={() => {
            if (!ensureRows()) return
            downloadText(`activity-center-${Date.now()}.csv`, rowsToCsv(rows), 'text/csv')
            toast.success('CSV exported')
          }}
        >
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (!ensureRows()) return
            downloadText(`activity-center-${Date.now()}.xls`, rowsToCsv(rows), 'application/vnd.ms-excel')
            toast.success('Excel-compatible CSV exported')
          }}
        >
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (!ensureRows()) return
            downloadText(`activity-center-${Date.now()}.json`, JSON.stringify(rows, null, 2), 'application/json')
            toast.success('JSON exported')
          }}
        >
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (!ensureRows()) return
            const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
            if (!popup) {
              toast.error('Popup blocked — allow popups to export PDF')
              return
            }
            popup.document.write(`<!doctype html><html><head><title>Activity Center</title>
              <style>body{font-family:ui-sans-serif,system-ui;padding:24px;color:#0f172a}
              table{width:100%;border-collapse:collapse;font-size:12px}
              th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}</style></head><body>
              <h1>Activity Center</h1><table><thead><tr>
              <th>Action</th><th>Entity</th><th>User</th><th>IP</th><th>Date</th></tr></thead><tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr><td>${escapeHtml(row.action)}</td><td>${escapeHtml(row.entityType)}</td><td>${escapeHtml(row.userName ?? '')}</td><td>${escapeHtml(row.ipAddress ?? '')}</td><td>${escapeHtml(new Date(row.createdAt).toLocaleString())}</td></tr>`,
                )
                .join('')}
              </tbody></table></body></html>`)
            popup.document.close()
            popup.focus()
            popup.print()
          }}
        >
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}
