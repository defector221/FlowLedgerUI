import { forwardRef, useImperativeHandle, useRef } from 'react'
import EmailEditor, { type EditorRef } from 'react-email-editor'

export type DesignExport = {
  design: Record<string, unknown>
  html: string
}

export type EmailDesignEditorHandle = {
  exportHtml: () => Promise<DesignExport>
  loadDesign: (design: Record<string, unknown> | null | undefined) => void
}

type Props = {
  minHeight?: number
  mergeTags?: Record<string, { name: string; value: string; sample?: string }>
  onReady?: () => void
  displayMode?: 'email' | 'web'
}

const projectId = Number(import.meta.env.VITE_UNLAYER_PROJECT_ID || 0) || undefined

export const EmailDesignEditor = forwardRef<EmailDesignEditorHandle, Props>(function EmailDesignEditor(
  { minHeight = 560, mergeTags, onReady, displayMode = 'email' },
  ref,
) {
  const editorRef = useRef<EditorRef>(null)
  const pendingDesign = useRef<Record<string, unknown> | null>(null)

  useImperativeHandle(ref, () => ({
    exportHtml: () =>
      new Promise<DesignExport>((resolve, reject) => {
        const editor = editorRef.current?.editor
        if (!editor) {
          reject(new Error('Email editor is not ready yet'))
          return
        }
        editor.exportHtml((data: { design?: Record<string, unknown>; html?: string }) => {
          resolve({
            design: (data.design ?? {}) as Record<string, unknown>,
            html: data.html ?? '',
          })
        })
      }),
    loadDesign: (design) => {
      if (!design) return
      const editor = editorRef.current?.editor
      if (editor) {
        editor.loadDesign(design as never)
      } else {
        pendingDesign.current = design
      }
    },
  }))

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <EmailEditor
        ref={editorRef}
        minHeight={minHeight}
        projectId={projectId}
        options={{
          displayMode,
          features: { textEditor: { spellChecker: true } },
          mergeTags,
        }}
        onReady={() => {
          if (pendingDesign.current) {
            editorRef.current?.editor?.loadDesign(pendingDesign.current as never)
            pendingDesign.current = null
          }
          onReady?.()
        }}
      />
    </div>
  )
})
