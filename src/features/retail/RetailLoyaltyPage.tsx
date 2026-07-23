import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { Badge, Button, Card, CardContent, Input, Label } from '@/components/ui'
import { retailApi } from '@/services/api'
import type { RetailGiftCard, RetailGiftCardBalance } from '@/types/api'
import { RetailModuleGate } from './RetailModuleGate'

export function RetailLoyaltyPage() {
  const [cardNumber, setCardNumber] = useState('')
  const [initialBalance, setInitialBalance] = useState('500')
  const [issued, setIssued] = useState<RetailGiftCard | null>(null)
  const [lookupNumber, setLookupNumber] = useState('')
  const [balance, setBalance] = useState<RetailGiftCardBalance | null>(null)

  const issue = async () => {
    if (!cardNumber.trim()) return toast.error('Card number is required')
    const amount = Number(initialBalance)
    if (!amount || amount <= 0) return toast.error('Enter a valid balance')
    try {
      const card = await retailApi.loyalty.giftCards.issue({
        cardNumber: cardNumber.trim(),
        initialBalance: amount,
      })
      setIssued(card)
      toast.success('Gift card issued')
      setCardNumber('')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const checkBalance = async () => {
    if (!lookupNumber.trim()) return toast.error('Enter a card number')
    try {
      const result = await retailApi.loyalty.giftCards.balance(lookupNumber.trim())
      setBalance(result)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
      setBalance(null)
    }
  }

  return (
    <RetailModuleGate title="Loyalty">
      <PageShell>
        <PageHeader title="Loyalty & gift cards" subtitle="Issue gift cards and check balances." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Issue gift card</h2>
              <div className="space-y-1.5">
                <Label>Card number</Label>
                <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="GC-1001" />
              </div>
              <div className="space-y-1.5">
                <Label>Initial balance</Label>
                <Input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  min={1}
                  step="0.01"
                />
              </div>
              <Button onClick={() => void issue()}>Issue card</Button>
              {issued ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                  Issued <span className="font-mono">{issued.cardNumber}</span> · balance{' '}
                  {Number(issued.balance).toFixed(2)} · <Badge>{issued.status}</Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Check balance</h2>
              <div className="space-y-1.5">
                <Label>Card number</Label>
                <Input
                  value={lookupNumber}
                  onChange={(e) => setLookupNumber(e.target.value)}
                  placeholder="Scan or enter card"
                />
              </div>
              <Button variant="outline" onClick={() => void checkBalance()}>
                Look up
              </Button>
              {balance ? (
                <div className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <p className="font-mono font-medium">{balance.cardNumber}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{Number(balance.balance).toFixed(2)}</p>
                  <div className="mt-2">
                    <Badge>{balance.status}</Badge>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </RetailModuleGate>
  )
}
