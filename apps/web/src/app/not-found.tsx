import Link from "next/link"

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center bg-accent font-mono text-[13px] font-medium text-void">
            m
          </span>
          <span className="font-mono text-sm text-text">mesh</span>
        </div>
        <p className="mt-10 font-mono text-[11px] text-accent">404</p>
        <h1 className="mt-2 text-xl font-medium">This page does not exist</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          The workspace, room or canvas may have been removed, or you may not have access to it.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block font-mono text-[11px] text-accent underline underline-offset-4"
        >
          back to your workspace
        </Link>
      </div>
    </main>
  )
}
