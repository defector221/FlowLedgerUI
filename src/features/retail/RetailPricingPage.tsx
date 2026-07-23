import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { generateEntityCode } from '@/lib/entity-code'
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
import { retailApi } from '@/services/api'
import type { RetailPriceType, RetailPromoType } from '@/types/api'
import { RetailModuleGate } from './RetailModuleGate'

const PRICE_TYPES: RetailPriceType[] = ['RETAIL', 'WHOLESALE', 'MRP', 'SPECIAL', 'CLEARANCE']
const PROMO_TYPES: RetailPromoType[] = ['PERCENT_OFF', 'AMOUNT_OFF', 'BUY_X_GET_Y', 'BILL_DISCOUNT', 'COUPON']

export function RetailPricingPage() {
  const queryClient = useQueryClient()
  const priceLists = useQuery({
    queryKey: ['retail', 'price-lists'],
    queryFn: () => retailApi.pricing.priceLists.list(),
  })
  const promotions = useQuery({
    queryKey: ['retail', 'promotions'],
    queryFn: () => retailApi.pricing.promotions.list(),
  })

  const [listOpen, setListOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [listForm, setListForm] = useState({ code: '', name: '', priceType: 'RETAIL' as RetailPriceType })
  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    promoType: 'PERCENT_OFF' as RetailPromoType,
    discountPercent: '10',
  })
  const [listCodeTouched, setListCodeTouched] = useState(false)
  const [promoCodeTouched, setPromoCodeTouched] = useState(false)

  useEffect(() => {
    if (!listOpen || listCodeTouched) return
    const source = listForm.name.trim()
    if (!source) return
    setListForm((v) => ({ ...v, code: generateEntityCode(source, 'PL') }))
  }, [listForm.name, listOpen, listCodeTouched])

  useEffect(() => {
    if (!promoOpen || promoCodeTouched) return
    const source = promoForm.name.trim()
    if (!source) return
    setPromoForm((v) => ({ ...v, code: generateEntityCode(source, 'PR') }))
  }, [promoForm.name, promoOpen, promoCodeTouched])

  const saveList = async () => {
    if (!listForm.code.trim() || !listForm.name.trim()) return toast.error('Code and name are required')
    try {
      await retailApi.pricing.priceLists.create({
        code: listForm.code.trim(),
        name: listForm.name.trim(),
        priceType: listForm.priceType,
        active: true,
      })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'price-lists'] })
      setListOpen(false)
      toast.success('Price list created')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const savePromo = async () => {
    if (!promoForm.code.trim() || !promoForm.name.trim()) return toast.error('Code and name are required')
    try {
      await retailApi.pricing.promotions.create({
        code: promoForm.code.trim(),
        name: promoForm.name.trim(),
        promoType: promoForm.promoType,
        discountPercent:
          promoForm.promoType === 'PERCENT_OFF' || promoForm.promoType === 'BILL_DISCOUNT'
            ? Number(promoForm.discountPercent)
            : undefined,
        active: true,
      })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'promotions'] })
      setPromoOpen(false)
      toast.success('Promotion created')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <RetailModuleGate title="Pricing">
      <PageShell>
        <PageHeader
          title="Pricing & promotions"
          subtitle="Manage retail price lists and store promotions."
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setListForm({ code: '', name: '', priceType: 'RETAIL' })
                  setListCodeTouched(false)
                  setListOpen(true)
                }}
              >
                <Plus className="size-4" />
                Price list
              </Button>
              <Button
                onClick={() => {
                  setPromoForm({ code: '', name: '', promoType: 'PERCENT_OFF', discountPercent: '10' })
                  setPromoCodeTouched(false)
                  setPromoOpen(true)
                }}
              >
                <Plus className="size-4" />
                Promotion
              </Button>
            </>
          }
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Price lists</div>
              <Table>
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-xs text-slate-500">Code</th>
                    <th className="p-3 text-xs text-slate-500">Name</th>
                    <th className="p-3 text-xs text-slate-500">Type</th>
                    <th className="p-3 text-xs text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(priceLists.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-3 font-mono text-sm">{row.code}</td>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3 text-sm">{row.priceType}</td>
                      <td className="p-3">
                        <Badge>{row.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!priceLists.data?.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                        No price lists.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Promotions</div>
              <Table>
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-xs text-slate-500">Code</th>
                    <th className="p-3 text-xs text-slate-500">Name</th>
                    <th className="p-3 text-xs text-slate-500">Type</th>
                    <th className="p-3 text-xs text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(promotions.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-3 font-mono text-sm">{row.code}</td>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3 text-sm">{row.promoType}</td>
                      <td className="p-3">
                        <Badge>{row.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!promotions.data?.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                        No promotions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PageShell>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent>
          <DialogTitle>Create price list</DialogTitle>
          <div className="mt-5 grid gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={listForm.name} onChange={(e) => setListForm((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={listForm.code}
                onChange={(e) => {
                  setListCodeTouched(true)
                  setListForm((v) => ({ ...v, code: e.target.value }))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={listForm.priceType}
                onValueChange={(priceType) => setListForm((v) => ({ ...v, priceType: priceType as RetailPriceType }))}
              >
                <SelectTrigger>{listForm.priceType}</SelectTrigger>
                <SelectContent>
                  {PRICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setListOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveList()}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent>
          <DialogTitle>Create promotion</DialogTitle>
          <div className="mt-5 grid gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={promoForm.name} onChange={(e) => setPromoForm((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={promoForm.code}
                onChange={(e) => {
                  setPromoCodeTouched(true)
                  setPromoForm((v) => ({ ...v, code: e.target.value }))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={promoForm.promoType}
                onValueChange={(promoType) => setPromoForm((v) => ({ ...v, promoType: promoType as RetailPromoType }))}
              >
                <SelectTrigger>{promoForm.promoType}</SelectTrigger>
                <SelectContent>
                  {PROMO_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(promoForm.promoType === 'PERCENT_OFF' || promoForm.promoType === 'BILL_DISCOUNT') && (
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  value={promoForm.discountPercent}
                  onChange={(e) => setPromoForm((v) => ({ ...v, discountPercent: e.target.value }))}
                />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPromoOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void savePromo()}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </RetailModuleGate>
  )
}
