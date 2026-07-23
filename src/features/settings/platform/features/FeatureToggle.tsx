import { Switch } from '@/components/ui'
import { cn } from '@/lib/utils'

export function FeatureToggle({
  id,
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Switch
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(disabled && 'opacity-50')}
    />
  )
}
