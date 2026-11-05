'use client'

import { FileSearch } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 md:px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileSearch className="size-4" aria-hidden="true" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-tight">
            DocRAG
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              pathname === '/'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Workspace
          </Link>
          <Link
            href="/evaluate"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              pathname === '/evaluate'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Evaluation
          </Link>
        </nav>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
          pgvector
        </span>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
          hybrid search
        </span>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
          RRF
        </span>
      </div>
    </header>
  )
}
