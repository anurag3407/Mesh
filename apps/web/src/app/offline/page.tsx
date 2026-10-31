export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm">
        <span className="font-mono text-[11px] text-accent">offline</span>
        <h1 className="mt-2 text-xl font-medium">The workspace is cached, messages are not</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Reconnect to load rooms. Messages you write while offline wait in this browser and send
          when the connection returns.
        </p>
      </div>
    </main>
  )
}
