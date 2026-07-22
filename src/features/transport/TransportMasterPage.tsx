import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'

type Row = Record<string, unknown> & { id: string }
type Field = { key: string; label: string; required?: boolean; options?: string[] }

export function TransportMasterPage({
  title,
  singular,
  fields,
  api,
  columns,
  initial,
}: {
  title: string
  singular: string
  fields: Field[]
  api: {
    list: () => Promise<unknown[]>
    create: (payload: never) => Promise<unknown>
    update: (id: string, payload: never) => Promise<unknown>
    remove: (id: string) => Promise<unknown>
  }
  columns: { key: string; label: string }[]
  initial: Record<string, unknown>
}) {
  const queryClient = useQueryClient()
  const key = ['transport', title.toLowerCase()]
  const { data = [], isLoading } = useQuery({ queryKey: key, queryFn: api.list })
  const rows = data as Row[]
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState(initial)

  const showForm = (row?: Row) => {
    setEditing(row ?? null)
    setForm(row ? { ...initial, ...row } : initial)
    setOpen(true)
  }
  const save = async () => {
    const missing = fields.find((field) => field.required && !String(form[field.key] ?? '').trim())
    if (missing) return toast.error(`${missing.label} is required`)
    try {
      if (editing) await api.update(editing.id, form as never)
      else await api.create(form as never)
      await queryClient.invalidateQueries({ queryKey: key })
      setOpen(false)
      toast.success(`${singular} ${editing ? 'updated' : 'created'}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const remove = async (row: Row) => {
    if (!window.confirm(`Delete this ${singular.toLowerCase()}?`)) return
    try {
      await api.remove(row.id)
      await queryClient.invalidateQueries({ queryKey: key })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={`Manage transport ${title.toLowerCase()}.`}
        actions={
          <Button onClick={() => showForm()}>
            <Plus className="size-4" />
            Add {singular}
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th key={column.key} className="p-3 text-xs text-slate-500">
                      {column.label}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    {columns.map((column) => (
                      <td key={column.key} className="p-3">
                        /status$/i.test(column.key) ? <Badge>{String(row[column.key] ?? '—')}</Badge> :
                        String(row[column.key] ?? '—')
                      </td>
                    ))}
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => showForm(row)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(row)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-16 text-center text-sm text-slate-500">
                      No {title.toLowerCase()} found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? `Edit ${singular}` : `Add ${singular}`}</DialogTitle>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                {field.options ? (
                  <Select
                    value={String(form[field.key] ?? '')}
                    onValueChange={(value) => setForm((v) => ({ ...v, [field.key]: value }))}
                  >
                    <SelectTrigger>{String(form[field.key] || `Select ${field.label.toLowerCase()}`)}</SelectTrigger>
                    <SelectContent>
                      {field.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={String(form[field.key] ?? '')}
                    onChange={(event) => setForm((v) => ({ ...v, [field.key]: event.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
