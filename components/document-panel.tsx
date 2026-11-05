'use client'

import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import type { DocumentInfo } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DocumentPanelProps {
  documents: DocumentInfo[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}

export function DocumentPanel({
  documents,
  isLoading,
  selectedId,
  onSelect,
}: DocumentPanelProps) {
  const { mutate } = useSWRConfig()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
      } else {
        await mutate('/api/documents')
        onSelect(data.id)
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    await mutate('/api/documents')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Chunking &amp; embedding...
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden="true" />
              Upload PDF
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          aria-label="Upload a PDF document"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto p-2" aria-label="Document library">
        {isLoading && (
          <li className="px-2 py-3 text-sm text-muted-foreground">
            Loading documents...
          </li>
        )}
        {!isLoading && documents.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">
            No documents yet. Upload a PDF to start.
          </li>
        )}
        {documents.map((doc) => (
          <li key={doc.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(doc.id)}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors',
                selectedId === doc.id
                  ? 'bg-accent'
                  : 'hover:bg-accent/50',
              )}
            >
              <FileText
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  selectedId === doc.id
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{doc.title}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {doc.pageCount} pages / {doc.chunkCount} chunks
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleDelete(doc.id)}
              className="absolute right-2 top-2.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
              aria-label={`Delete ${doc.title}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
