import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, ListPageShell, ListTablePanel, ListPanelMessage } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { generateEntityCode, slugifyName } from '@/lib/entity-code'
import {
  Badge,
  Button,
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
import { retailApi, warehouseApi } from '@/services/api'
import type { RetailStore } from '@/types/api'
import { RetailModuleGate } from './RetailModuleGate'

const empty = {
  code: '',
  name: '',
  warehouseId: '',
  storeTypeId: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  status: 'ACTIVE',
}

export function StoresPage() {
  const queryClient = useQueryClient()
  const stores = useQuery({ queryKey: ['retail', 'stores'], queryFn: () => retailApi.stores.list() })
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: () => warehouseApi.list() })
  const storeTypes = useQuery({ queryKey: ['retail', 'store-types'], queryFn: () => retailApi.storeTypes.list() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RetailStore | null>(null)
  const [form, setForm] = useState(empty)
  const [codeTouched, setCodeTouched] = useState(false)
  const [lastSlug, setLastSlug] = useState('')

  const showForm = (row?: RetailStore) => {
    setEditing(row ?? null)
    setForm(
      row
        ? {
            code: row.code,
            name: row.name,
            warehouseId: row.warehouseId,
            storeTypeId: row.storeTypeId ?? '',
            address: row.address ?? '',
            city: row.city ?? '',
            state: row.state ?? '',
            phone: row.phone ?? '',
            status: row.status || 'ACTIVE',
          }
        : { ...empty },
    )
    setCodeTouched(!!row)
    setLastSlug('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open || editing || codeTouched) return
    const source = form.name.trim()
    if (!source) {
      setForm((current) => (current.code ? { ...current, code: '' } : current))
      setLastSlug('')
      return
    }
    const slug = slugifyName(source)
    if (slug === lastSlug) return
    setLastSlug(slug)
    setForm((current) => ({ ...current, code: generateEntityCode(source, 'STR') }))
  }, [codeTouched, editing, form.name, lastSlug, open])

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.warehouseId) return toast.error('Warehouse is required')
    if (!form.code.trim()) return toast.error('Code is required')
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      warehouseId: form.warehouseId,
      storeTypeId: form.storeTypeId || null,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      phone: form.phone || undefined,
      status: form.status || 'ACTIVE',
    }
    try {
      if (editing) await retailApi.stores.update(editing.id, payload)
      else await retailApi.stores.create(payload)
      await queryClient.invalidateQueries({ queryKey: ['retail', 'stores'] })
      setOpen(false)
      toast.success(`Store ${editing ? 'updated' : 'created'}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <RetailModuleGate title="Stores">
      <ListPageShell
        header={
          <PageHeader
            title="Stores"
            subtitle="Manage retail store locations linked to warehouses."
            actions={
              <Button onClick={() => showForm()}>
                <Plus className="size-4" />
                Add store
              </Button>
            }
          />
        }
      >
        <ListTablePanel>
          {stores.isLoading ? (
            <ListPanelMessage>
              <p className="text-sm text-slate-500">Loading…</p>
            </ListPanelMessage>
          ) : (
            <Table fill stickyHeader>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">Code</th>
                  <th className="p-3 text-xs text-slate-500">Name</th>
                  <th className="p-3 text-xs text-slate-500">City</th>
                  <th className="p-3 text-xs text-slate-500">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(stores.data ?? []).map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3 font-mono text-sm">{row.code}</td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3 text-slate-600">{row.city ?? '—'}</td>
                    <td className="p-3">
                      <Badge>{row.status}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => showForm(row)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!stores.data?.length && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-slate-500">
                      No stores yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </ListTablePanel>
      </ListPageShell>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? 'Edit store' : 'Add store'}</DialogTitle>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => {
                  setCodeTouched(true)
                  setForm((v) => ({ ...v, code: e.target.value }))
                }}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={(warehouseId) => setForm((v) => ({ ...v, warehouseId }))}>
                <SelectTrigger>
                  {warehouses.data?.find((wh) => wh.id === form.warehouseId)?.warehouseName ?? 'Select warehouse'}
                </SelectTrigger>
                <SelectContent>
                  {(warehouses.data ?? []).map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Store type</Label>
              <Select
                value={form.storeTypeId || '__none__'}
                onValueChange={(storeTypeId) =>
                  setForm((v) => ({ ...v, storeTypeId: storeTypeId === '__none__' ? '' : storeTypeId }))
                }
              >
                <SelectTrigger>
                  {storeTypes.data?.find((t) => t.id === form.storeTypeId)?.name ?? 'Optional'}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(storeTypes.data ?? []).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((v) => ({ ...v, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm((v) => ({ ...v, state: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </RetailModuleGate>
  )
}
