'use client'

import { CheckCircle2, FlaskConical, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import type { DocumentInfo, EvaluationResult } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function EvaluationPanel() {
  const { data: documents } = useSWR<DocumentInfo[]>('/api/documents', fetcher)
  const { data: evaluations, isLoading } = useSWR<EvaluationResult[]>(
    '/api/evaluations',
    fetcher,
  )
  const { mutate } = useSWRConfig()

  const [documentId, setDocumentId] = useState<string>('')
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runEvaluation() {
    if (!documentId || !question.trim() || running) return
    setError(null)
    setRunning(true)
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: Number(documentId), question }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Evaluation failed')
      } else {
        setQuestion('')
        await mutate('/api/evaluations')
      }
    } catch {
      setError('Evaluation failed. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
          <FlaskConical className="size-5 text-primary" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">RAG Evaluation</h1>
          <p className="text-sm text-muted-foreground">
            Compare a grounded answer (with retrieval) against the model&apos;s
            ungrounded answer to the same question.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            aria-label="Select document"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm md:w-64"
          >
            <option value="">Select a document...</option>
            {documents?.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                runEvaluation()
              }
            }}
            placeholder="Ask a question the document should answer..."
            aria-label="Evaluation question"
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={runEvaluation}
            disabled={!documentId || !question.trim() || running}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Running both...
              </>
            ) : (
              'Run comparison'
            )}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading evaluations...</p>
        )}
        {!isLoading && (!evaluations || evaluations.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No evaluations yet. Run a comparison above to see RAG vs no-RAG
            side by side.
          </p>
        )}
        {evaluations?.map((ev) => (
          <article
            key={ev.id}
            className="rounded-lg border border-border bg-card"
          >
            <header className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium">{ev.question}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {ev.retrievedChunks.length} chunks retrieved /{' '}
                {new Date(ev.createdAt).toLocaleString()}
              </p>
            </header>
            <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="p-4">
                <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  With RAG (grounded)
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {ev.ragAnswer}
                </p>
              </div>
              <div className="p-4">
                <h3 className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <XCircle className="size-3.5" aria-hidden="true" />
                  Without RAG (model only)
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {ev.noRagAnswer}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
