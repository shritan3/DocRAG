'use client'

import { useEffect, useRef } from 'react'
import type { SourceChunk } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SourcesPanelProps {
  sources: SourceChunk[]
  activeIndex: number | null
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string
  value: number | null
  max: number
}) {
  const pct = value === null ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${label} score`}
        aria-valuenow={value ?? 0}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
        {value === null ? '—' : value.toFixed(3)}
      </span>
    </div>
  )
}

export function SourcesPanel({ sources, activeIndex }: SourcesPanelProps) {
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (activeIndex !== null && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [activeIndex])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Retrieved Sources
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hybrid search: vector + keyword, fused with RRF
        </p>
      </div>
      <ol className="flex-1 overflow-y-auto p-3" aria-label="Retrieved source chunks">
        {sources.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">
            Ask a question to see which chunks were retrieved and how they
            scored.
          </li>
        )}
        {sources.map((source, i) => (
          <li
            key={source.id}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className={cn(
              'mb-3 rounded-lg border p-3 transition-colors',
              activeIndex === i
                ? 'border-primary/60 bg-primary/5'
                : 'border-border bg-card',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded bg-primary/15 font-mono text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  page {source.pageNumber} / chunk #{source.chunkIndex}
                </span>
              </span>
            </div>
            <p className="mt-2 line-clamp-4 font-mono text-xs leading-relaxed text-foreground/85">
              {source.content}
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <ScoreBar label="vector" value={source.vectorScore} max={1} />
              <ScoreBar label="keyword" value={source.keywordScore} max={0.2} />
              <ScoreBar label="rrf" value={source.rrfScore} max={0.035} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
