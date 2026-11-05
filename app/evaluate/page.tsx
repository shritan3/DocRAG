import { AppHeader } from '@/components/app-header'
import { EvaluationPanel } from '@/components/evaluation-panel'

export default function EvaluatePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">
        <EvaluationPanel />
      </main>
    </div>
  )
}
