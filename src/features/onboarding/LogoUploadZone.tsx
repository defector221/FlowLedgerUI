import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type LogoUploadZoneProps = {
  file: File | null
  onChange: (file: File | null) => void
  /** Already-saved logo URL (blob or remote) when no new file is selected. */
  existingUrl?: string | null
  /** Shown under the file name when a new file is selected. */
  pendingHint?: string
  className?: string
}

export function LogoUploadZone({
  file,
  onChange,
  existingUrl,
  pendingHint = 'Ready to upload',
  className,
}: LogoUploadZoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const previewUrl = localPreviewUrl ?? existingUrl ?? null
  const showingExisting = !file && !!existingUrl

  const acceptFile = (next: File | null) => {
    setError(null)
    if (!next) {
      onChange(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (!ACCEPTED_TYPES.includes(next.type) && !/\.(png|jpe?g|webp|svg)$/i.test(next.name)) {
      setError('Use a PNG, JPG, WebP, or SVG image.')
      return
    }
    if (next.size > MAX_BYTES) {
      setError('Logo must be 2 MB or smaller.')
      return
    }
    onChange(next)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0] ?? null
    acceptFile(dropped)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] sm:mx-0">
              <img src={previewUrl} alt="Organization logo preview" className="max-h-full max-w-full object-contain p-2" />
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
              <div>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {file?.name ?? 'Current organization logo'}
                </p>
                <p className="text-xs text-slate-500">
                  {file ? `${formatBytes(file.size)} · ${pendingHint}` : 'Saved logo — replace anytime'}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload className="size-3.5" />
                  {showingExisting ? 'Replace' : 'Change'}
                </Button>
                {file ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => acceptFile(null)}>
                    <Trash2 className="size-3.5" />
                    {existingUrl ? 'Cancel' : 'Remove'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-500">
            Preview — this logo appears on invoices and documents.
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget.contains(event.relatedTarget as Node)) return
            setDragging(false)
          }}
          onDrop={onDrop}
          className={cn(
            'group cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition',
            dragging
              ? 'border-teal-500 bg-teal-50/70 shadow-[inset_0_0_0_1px_rgb(20_184_166/0.35)]'
              : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-teal-50/40',
          )}
        >
          <div
            className={cn(
              'mx-auto mb-3 grid size-12 place-items-center rounded-xl transition',
              dragging ? 'bg-teal-100 text-teal-800' : 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200/80',
            )}
          >
            <ImagePlus className="size-5" />
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {dragging ? 'Drop logo to upload' : 'Drag & drop your logo'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or{' '}
            <span className="font-semibold text-teal-700 underline-offset-2 group-hover:underline">browse files</span>
          </p>
          <p className="mt-3 text-xs text-slate-400">PNG, JPG, WebP or SVG · up to 2 MB</p>
        </div>
      )}

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  )
}
