import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Slot } from '@radix-ui/react-slot'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
    size?: 'sm' | 'lg' | 'icon'
    loading?: boolean
    asChild?: boolean
  }
>(({ className, variant = 'default', size, loading, disabled, asChild = false, children, ...props }, ref) => {
  const classNames = cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-tight transition-all duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'default' &&
      'bg-gradient-to-b from-teal-600 to-teal-700 text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_8px_18px_rgb(13_148_136/0.28)] hover:from-teal-500 hover:to-teal-700',
    variant === 'outline' &&
      'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50/60 hover:text-teal-900',
    variant === 'secondary' && 'border border-slate-200 bg-slate-50 text-slate-800 shadow-sm hover:bg-slate-100',
    variant === 'ghost' && 'font-medium text-slate-600 hover:bg-slate-100/90 hover:text-slate-900',
    variant === 'destructive' &&
      'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_8px_18px_rgb(225_29_72/0.25)] hover:from-rose-400 hover:to-rose-600',
    size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-11 px-5' : size === 'icon' ? 'size-9' : 'h-10 px-4',
    className,
  )

  // Slot requires exactly one React element child — never pass null/siblings alongside it.
  if (asChild) {
    return (
      <Slot ref={ref} className={classNames} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button ref={ref} disabled={disabled || loading} className={classNames} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})
Button.displayName = 'Button'
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:bg-slate-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

/** Plain text field that only accepts numbers — no spinner, no sticky leading zero. */
export const NumberInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
    value: number | string | null | undefined
    onValueChange: (value: number) => void
    allowDecimal?: boolean
  }
>(({ className, value, onValueChange, allowDecimal = true, onFocus, onBlur, ...props }, ref) => {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(() => editableNumber(value))

  useEffect(() => {
    if (!focused) setRaw(editableNumber(value))
  }, [value, focused])

  return (
    <input
      ref={ref}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      className={cn(
        'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:bg-slate-50',
        className,
      )}
      value={focused ? raw : editableNumber(value)}
      onFocus={(event) => {
        setFocused(true)
        setRaw(editableNumber(value))
        event.target.select()
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        const parsed = parseEditableNumber(raw)
        onValueChange(parsed)
        setRaw(editableNumber(parsed))
        onBlur?.(event)
      }}
      onChange={(event) => {
        const next = sanitizeNumericInput(event.target.value, allowDecimal)
        setRaw(next)
        if (next === '' || next === '-' || next === '.' || next === '-.') {
          onValueChange(0)
          return
        }
        const parsed = Number(next)
        if (Number.isFinite(parsed)) onValueChange(parsed)
      }}
      {...props}
    />
  )
})
NumberInput.displayName = 'NumberInput'

function editableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return ''
  if (Number.isInteger(n)) return String(n)
  // Keep at most 2 decimal places when not editing (avoids 1.0000 / 12000.0000)
  return String(Number(n.toFixed(2)))
}

function sanitizeNumericInput(value: string, allowDecimal: boolean) {
  let next = value.replace(allowDecimal ? /[^0-9.-]/g : /[^0-9-]/g, '')
  const negative = next.startsWith('-')
  next = next.replace(/-/g, '')
  if (allowDecimal) {
    const [whole, ...rest] = next.split('.')
    next = rest.length > 0 ? `${whole}.${rest.join('').replace(/\./g, '')}` : whole
  }
  return `${negative ? '-' : ''}${next}`
}

function parseEditableNumber(value: string) {
  if (!value || value === '-' || value === '.' || value === '-.') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
export const Label = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root className={cn('text-sm font-semibold text-slate-700', className)} {...props} />
)
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-2xl border border-slate-200/90 bg-white/90 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_28px_rgb(15_23_42/0.05)] backdrop-blur-sm',
      className,
    )}
    {...props}
  />
)
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-wrap items-center justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3', className)}
    {...props}
  />
)
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4 pt-2 sm:p-5 sm:pt-2', className)} {...props} />
)
export const Badge = ({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline'
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide',
      variant === 'default' && 'bg-teal-50 text-teal-800',
      variant === 'success' && 'bg-emerald-50 text-emerald-800',
      variant === 'warning' && 'bg-amber-50 text-amber-900',
      variant === 'danger' && 'bg-rose-50 text-rose-800',
      variant === 'neutral' && 'bg-slate-100 text-slate-700',
      variant === 'outline' && 'border border-slate-200 bg-white text-slate-600',
      className,
    )}
    {...props}
  />
)
export const Table = ({
  className,
  zebra,
  stickyHeader,
  fill,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & {
  zebra?: boolean
  stickyHeader?: boolean
  /** Fill parent height and scroll inside the wrap (use with ListTablePanel + stickyHeader). */
  fill?: boolean
}) => (
  <div className={cn('data-table-wrap', fill && 'data-table-wrap--fill scrollbar-panel')}>
    <table
      className={cn('data-table', zebra && 'data-table--zebra', stickyHeader && 'data-table-sticky', className)}
      {...props}
    />
  </div>
)

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('form-field', className)}>
      <Label>
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </Label>
      {children}
      {error ? <p className="form-error">{error}</p> : null}
      {!error && hint ? <p className="form-hint">{hint}</p> : null}
    </div>
  )
}
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded bg-slate-200', className)} />
)
export const Separator = ({ className }: { className?: string }) => (
  <div className={cn('h-px bg-slate-200', className)} />
)
export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'flex size-4 items-center justify-center rounded border border-slate-300 data-[state=checked]:border-teal-700 data-[state=checked]:bg-teal-700',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="text-white">
      <Check className="size-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'
export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-5 w-9 cursor-pointer rounded-full bg-slate-300 data-[state=checked]:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'
export const Dialog = DialogPrimitive.Root
export const DialogContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 max-h-[min(92dvh,48rem)] w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-lift)] sm:w-[calc(100%-2rem)] sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Close"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
export const Select = SelectPrimitive.Root
export const SelectTrigger = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      'flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown className="size-4 text-slate-500" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
)
export const SelectContent = ({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        'z-[200] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn('p-1', position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]')}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
)
export const SelectItem = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    className={cn(
      'relative flex cursor-pointer select-none items-start rounded-lg px-8 py-2.5 text-sm outline-none data-[highlighted]:bg-teal-50/80 data-[highlighted]:text-teal-950',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator className="absolute left-2 top-3">
      <Check className="size-4 text-teal-700" />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText asChild>
      <span className="min-w-0 flex-1">{children}</span>
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
)
export const Tabs = TabsPrimitive.Root
export const TabsList = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn('inline-flex gap-1 rounded-lg bg-slate-100 p-1', className)} {...props} />
)
export const TabsTrigger = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      'cursor-pointer rounded-md px-3 py-1.5 text-sm text-slate-600 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  />
)
export const TabsContent = TabsPrimitive.Content
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        'z-[80] min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_40px_rgb(15_23_42/0.16)]',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
)
export const DropdownMenuItem = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-slate-100',
      className,
    )}
    {...props}
  />
)
export const DropdownMenuSeparator = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) => (
  <DropdownMenuPrimitive.Separator className={cn('my-1 h-px bg-slate-200', className)} {...props} />
)

export const TooltipProvider = ({
  delayDuration = 280,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
)
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = ({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'z-[90] max-w-[14rem] rounded-md border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
)
