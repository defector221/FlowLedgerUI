import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, ListPageShell, ListTablePanel, ListPanelMessage } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { generateEntityCode, slugifyName } from '@/lib/entity-code'
import { Button, Dialog, DialogContent, DialogTitle, Input, Label, Table } from '@/components/ui'
import { retailApi } from '@/services/api'
import { RetailModuleGate } from './RetailModuleGate'

export function RetailCatalogPage() {
  const queryClient = useQueryClient()
  const brands = useQuery({ queryKey: ['retail', 'brands'], queryFn: () => retailApi.catalog.brands.list() })
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)
  const [lastSlug, setLastSlug] = useState('')

  useEffect(() => {
    if (!open || codeTouched) return
    const source = name.trim()
    if (!source) {
      setCode('')
      setLastSlug('')
      return
    }
    const slug = slugifyName(source)
    if (slug === lastSlug) return
    setLastSlug(slug)
    setCode(generateEntityCode(source, 'BR'))
  }, [codeTouched, lastSlug, name, open])

  const save = async () => {
    if (!name.trim() || !code.trim()) return toast.error('Code and name are required')
    try {
      await retailApi.catalog.brands.create({ code: code.trim(), name: name.trim() })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'brands'] })
      setOpen(false)
      toast.success('Brand created')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <RetailModuleGate title="Catalog">
      <ListPageShell
        header={
          <PageHeader
            title="Retail catalog"
            subtitle="Brands for retail products and variants."
            actions={
              <Button
                onClick={() => {
                  setOpen(true)
                  setName('')
                  setCode('')
                  setCodeTouched(false)
                  setLastSlug('')
                }}
              >
                <Plus className="size-4" />
                Add brand
              </Button>
            }
          />
        }
      >
        <ListTablePanel>
          {brands.isLoading ? (
            <ListPanelMessage>
              <p className="text-sm text-slate-500">Loading…</p>
            </ListPanelMessage>
          ) : (
            <Table fill stickyHeader>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">Code</th>
                  <th className="p-3 text-xs text-slate-500">Name</th>
                </tr>
              </thead>
              <tbody>
                {(brands.data ?? []).map((brand) => (
                  <tr key={brand.id} className="border-b">
                    <td className="p-3 font-mono text-sm">{brand.code}</td>
                    <td className="p-3">{brand.name}</td>
                  </tr>
                ))}
                {!brands.data?.length && (
                  <tr>
                    <td colSpan={2} className="py-16 text-center text-sm text-slate-500">
                      No brands yet.
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
          <DialogTitle>Add brand</DialogTitle>
          <div className="mt-5 grid gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(e) => {
                  setCodeTouched(true)
                  setCode(e.target.value)
                }}
              />
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
