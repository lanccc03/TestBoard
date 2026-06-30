import { Activity, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { apiBaseUrl } from '@/lib/config'

function App() {
  const healthUrl = `${apiBaseUrl}/health`

  return (
    <main className="bg-background text-foreground min-h-svh">
      <section className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-8">
        <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg border">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-normal">
                TestBoard
              </h1>
              <p className="text-muted-foreground text-sm">Phase 0</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <a href={healthUrl} target="_blank" rel="noreferrer">
              <ExternalLink data-icon="inline-start" aria-hidden="true" />
              Open health endpoint
            </a>
          </Button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="bg-card text-card-foreground rounded-lg border p-5">
            <p className="text-muted-foreground text-sm">API base URL</p>
            <p className="mt-2 font-mono text-sm break-all">{apiBaseUrl}</p>
          </div>
          <div className="bg-card text-card-foreground rounded-lg border p-5">
            <p className="text-muted-foreground text-sm">Backend health</p>
            <p className="mt-2 font-mono text-sm break-all">{healthUrl}</p>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
