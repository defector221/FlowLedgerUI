import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { accountingApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageChrome'
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
  Textarea,
} from '@/components/ui'
import type { AccountRequest, AccountResponse, AccountStatus, AccountTreeNode, AccountType } from '@/types/api'

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']

const accountSchema = z.object({
  accountCode: z.string().min(1, 'Code is required'),
  accountName: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentAccountId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  allowManualPosting: z.boolean(),
})

type AccountFormValues = z.infer<typeof accountSchema>

function flattenTree(nodes: AccountTreeNode[]): AccountTreeNode[] {
  const out: AccountTreeNode[] = []
  const walk = (list: AccountTreeNode[]) => {
    for (const node of list) {
      out.push(node)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(nodes)
  return out
}

function isGroupNode(node: AccountTreeNode) {
  return node.accountCode.startsWith('GRP-') || (node.children?.length ?? 0) > 0
}

function collectExpandableIds(nodes: AccountTreeNode[]): string[] {
  const ids: string[] = []
  const walk = (list: AccountTreeNode[]) => {
    for (const node of list) {
      if (node.children?.length) {
        ids.push(node.id)
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return ids
}

function CoaTreeView({
  nodes,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
}: {
  nodes: AccountTreeNode[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (node: AccountTreeNode) => void
  onDelete: (node: AccountTreeNode) => void
}) {
  return (
    <>
      {nodes.map((node, index) => (
        <CoaTreeNodeRow
          key={node.id}
          node={node}
          isLast={index === nodes.length - 1}
          parentTrail={[]}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

function CoaTreeNodeRow({
  node,
  isLast,
  parentTrail,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
}: {
  node: AccountTreeNode
  isLast: boolean
  parentTrail: boolean[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onEdit: (node: AccountTreeNode) => void
  onDelete: (node: AccountTreeNode) => void
}) {
  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = expandedIds.has(node.id)
  const isGroup = isGroupNode(node)
  const isPostingLeaf = !hasChildren && Boolean(node.systemAccountKey)

  return (
    <>
      <div className={cn('coa-tree-row coa-tree-grid', isGroup ? 'coa-tree-row--group' : 'coa-tree-row--leaf')}>
        <span className="font-mono text-xs text-slate-500">{node.accountCode}</span>

        <div className="coa-tree-account min-w-0">
          <div className="coa-tree-indent" aria-hidden>
            {parentTrail.map((lastInBranch, i) => (
              <span
                key={`${node.id}-indent-${i}`}
                className={cn('coa-tree-indent-cell', lastInBranch && 'coa-tree-indent-cell--last')}
              />
            ))}
          </div>

          {hasChildren ? (
            <button
              type="button"
              className="coa-tree-toggle"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.accountName}`}
              onClick={() => onToggle(node.id)}
            >
              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="coa-tree-toggle-spacer" />
          )}

          {isGroup ? (
            isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-teal-600" aria-hidden />
            ) : (
              <Folder className="size-4 shrink-0 text-teal-600" aria-hidden />
            )
          ) : (
            <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
          )}

          <span
            className={cn('coa-tree-name', isGroup ? 'coa-tree-name--group' : 'coa-tree-name--leaf')}
            title={node.description ?? undefined}
          >
            {node.accountName}
          </span>

          {node.accountCode.startsWith('GRP-') ? (
            <Badge variant="neutral" className="ml-1 shrink-0 text-[0.62rem]">
              Group
            </Badge>
          ) : node.systemAccount ? (
            <Badge className="ml-1 shrink-0 text-[0.62rem]">{node.systemAccountKey ?? 'System'}</Badge>
          ) : (
            <Badge variant="outline" className="ml-1 shrink-0 text-[0.62rem]">
              Custom
            </Badge>
          )}
        </div>

        <span className="text-xs font-medium text-slate-500">{node.accountType}</span>

        <Badge variant={node.status === 'ACTIVE' ? 'success' : 'neutral'} className="w-fit text-[0.62rem]">
          {node.status}
        </Badge>

        <div className="coa-tree-actions">
          {(!node.systemAccount || node.editable) && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(node)}>
              <Pencil className="size-3.5" />
            </Button>
          )}
          {node.deletable && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-rose-600 hover:text-rose-700"
              onClick={() => onDelete(node)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          {isPostingLeaf && (
            <Link
              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
              to={`/accounting/ledgers/accounts/${node.id}`}
            >
              Ledger
            </Link>
          )}
        </div>
      </div>

      {hasChildren && isExpanded
        ? node.children!.map((child, childIndex) => (
            <CoaTreeNodeRow
              key={child.id}
              node={child}
              isLast={childIndex === node.children!.length - 1}
              parentTrail={[...parentTrail, isLast]}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        : null}
    </>
  )
}

export function ChartOfAccountsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AccountResponse | AccountTreeNode | null>(null)

  const {
    data: tree = [],
    isLoading: loadingTree,
    refetch: refetchTree,
  } = useQuery({
    queryKey: ['accounting', 'accounts', 'tree'],
    queryFn: accountingApi.accountTree,
  })
  const {
    data: list = [],
    isLoading: loadingList,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: accountingApi.listAccounts,
  })

  const expandableIds = useMemo(() => collectExpandableIds(tree), [tree])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!tree.length) return
    setExpandedIds((current) => {
      if (current.size > 0) return current
      return new Set(expandableIds)
    })
  }, [tree, expandableIds])

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedIds(new Set(expandableIds))
  const collapseAll = () => setExpandedIds(new Set())

  const parentOptions = useMemo(() => {
    const flat = view === 'tree' ? flattenTree(tree) : list
    return flat.filter((a) => a.systemAccount || !('children' in a && a.children?.length))
  }, [list, tree, view])

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountCode: '',
      accountName: '',
      description: '',
      accountType: 'ASSET',
      parentAccountId: '',
      status: 'ACTIVE',
      allowManualPosting: true,
    },
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({
      accountCode: '',
      accountName: '',
      description: '',
      accountType: 'ASSET',
      parentAccountId: '',
      status: 'ACTIVE',
      allowManualPosting: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (account: AccountResponse | AccountTreeNode) => {
    setEditing(account)
    form.reset({
      accountCode: account.accountCode,
      accountName: account.accountName,
      description: account.description ?? '',
      accountType: account.accountType,
      parentAccountId: account.parentAccountId ?? '',
      status: (account.status as AccountStatus) ?? (account.active ? 'ACTIVE' : 'INACTIVE'),
      allowManualPosting: account.allowManualPosting,
    })
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const payload: AccountRequest = {
        accountCode: values.accountCode.trim(),
        accountName: values.accountName.trim(),
        description: values.description?.trim() || undefined,
        accountType: values.accountType,
        parentAccountId: values.parentAccountId || undefined,
        status: values.status,
        allowManualPosting: values.allowManualPosting,
        openingDebit: 0,
        openingCredit: 0,
      }
      if (editing) {
        return accountingApi.updateAccount(editing.id, payload)
      }
      return accountingApi.createAccount(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounting', 'accounts'] })
      toast.success(editing ? 'Account updated' : 'Account created')
      setDialogOpen(false)
      setEditing(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteAccount(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounting', 'accounts'] })
      toast.success('Account deleted')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const onDelete = (node: AccountTreeNode | AccountResponse) => {
    if (!window.confirm(`Delete account "${node.accountName}"? This cannot be undone.`)) return
    deleteMutation.mutate(node.id)
  }

  const isSystemLocked = Boolean(editing?.systemAccount && !editing.editable)
  const isSystemPartial = Boolean(editing?.systemAccount && editing.editable)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of accounts"
        subtitle="Organisation ledger structure with system posting accounts and custom accounts."
        actions={
          <>
            <Button variant={view === 'tree' ? 'default' : 'outline'} size="sm" onClick={() => setView('tree')}>
              <FolderTree className="mr-1.5 size-4" />
              Tree
            </Button>
            <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
              <List className="mr-1.5 size-4" />
              List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTree()
                refetchList()
              }}
            >
              <RefreshCw className="mr-1.5 size-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              New account
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {(view === 'tree' ? loadingTree : loadingList) ? (
            <p className="px-5 py-10 text-sm text-slate-500">Loading accounts…</p>
          ) : view === 'tree' ? (
            tree.length ? (
              <div className="coa-tree overflow-x-auto">
                <div className="coa-tree-toolbar">
                  <p className="text-xs text-slate-500">
                    {expandableIds.filter((id) => expandedIds.has(id)).length} of {expandableIds.length} groups expanded
                  </p>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={expandAll}>
                      Expand all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={collapseAll}>
                      Collapse all
                    </Button>
                  </div>
                </div>
                <div className="coa-tree-grid coa-tree-header min-w-[52rem]">
                  <span>Code</span>
                  <span>Account</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="min-w-[52rem]">
                  <CoaTreeView
                    nodes={tree}
                    expandedIds={expandedIds}
                    onToggle={toggleExpanded}
                    onEdit={openEdit}
                    onDelete={onDelete}
                  />
                </div>
              </div>
            ) : (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                No accounts yet. Bootstrap runs automatically when your organisation is created.
              </p>
            )
          ) : list.length ? (
            <Table>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-sm hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-mono text-xs">{row.accountCode}</td>
                    <td className="px-5 py-3 font-medium">{row.accountName}</td>
                    <td className="px-5 py-3 text-slate-500">{row.accountType}</td>
                    <td className="px-5 py-3">
                      <Badge className={row.status === 'ACTIVE' ? '' : 'bg-slate-100 text-slate-600'}>
                        {row.status ?? (row.active ? 'ACTIVE' : 'INACTIVE')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {(!row.systemAccount || row.editable) && (
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)}>
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {row.deletable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-rose-600"
                            onClick={() => onDelete(row)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                        {row.systemAccountKey && (
                          <Link
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                            to={`/accounting/ledgers/accounts/${row.id}`}
                          >
                            Ledger
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-slate-500">No accounts found.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing ? 'Edit account' : 'Create account'}</DialogTitle>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Account code</Label>
                <Input {...form.register('accountCode')} disabled={isSystemPartial || isSystemLocked} />
              </div>
              <div className="space-y-1.5">
                <Label>Account type</Label>
                <Select
                  value={form.watch('accountType')}
                  onValueChange={(v) => form.setValue('accountType', v as AccountType)}
                  disabled={Boolean(editing?.systemAccount)}
                >
                  <SelectTrigger>{form.watch('accountType')}</SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input {...form.register('accountName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...form.register('description')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Parent account</Label>
                <Select
                  value={form.watch('parentAccountId') || '__none__'}
                  onValueChange={(v) => form.setValue('parentAccountId', v === '__none__' ? '' : v)}
                  disabled={Boolean(editing?.systemAccount)}
                >
                  <SelectTrigger>
                    {parentOptions.find((p) => p.id === form.watch('parentAccountId'))?.accountName ?? 'None'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {parentOptions
                      .filter((p) => p.id !== editing?.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.accountCode} — {p.accountName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as AccountStatus)}>
                  <SelectTrigger>{form.watch('status')}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.watch('allowManualPosting')}
                onChange={(e) => form.setValue('allowManualPosting', e.target.checked)}
                disabled={Boolean(editing?.systemAccount && editing.systemAccountKey)}
              />
              Allow manual journal posting
            </label>
            {editing?.systemAccount ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                System accounts have restricted edits. Type, code, and parent cannot be changed.
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
