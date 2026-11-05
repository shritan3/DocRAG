import { AppHeader } from '@/components/app-header'
import { Workspace } from '@/components/workspace'

export default function Page() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <Workspace />
    </div>
  )
}
