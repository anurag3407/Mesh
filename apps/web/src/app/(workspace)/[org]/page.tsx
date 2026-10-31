import type { Metadata } from "next"
import Link from "next/link"
import { requireOrgAccess } from "@/lib/auth"
import { listMemberViews, listRooms } from "@/lib/queries"
import { RoomForm } from "@/components/room-form"
import { EmptyState } from "@/components/ui/empty"
import { TURN_MODE_LABELS } from "@/lib/format"

export const metadata: Metadata = { title: "Rooms" }

export default async function OrgHomePage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const [rooms, members] = await Promise.all([
    listRooms(access.org.id),
    listMemberViews(access.org.id),
  ])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="border-b border-line pb-6">
          <p className="font-mono text-[11px] text-faint">workspace</p>
          <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">{access.org.name}</h1>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} · {members.length}{" "}
            {members.length === 1 ? "member" : "members"} · you are {access.role}
          </p>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
          <section aria-labelledby="rooms-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="rooms-heading" className="text-[15px] font-medium">
                Rooms
              </h2>
              <span className="font-mono text-[10px] text-faint">read access follows membership</span>
            </div>
            {rooms.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No rooms yet"
                  body="Create the first room. It starts empty: add agents, then mention one with @handle to give it the floor."
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {rooms.map((room) => (
                  <li key={room.id}>
                    <Link
                      href={`/${orgSlug}/r/${room.id}`}
                      className="group flex items-center gap-4 py-3 transition-colors hover:bg-raised"
                    >
                      <span
                        aria-hidden="true"
                        className="w-5 shrink-0 text-center font-mono text-[12px] text-faint group-hover:text-accent"
                      >
                        {room.kind === "public" ? "#" : room.kind === "dm" ? "@" : "·"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-text">{room.name}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-faint">
                          {room.kind} · {TURN_MODE_LABELS[room.turnMode]}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
                        open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <RoomForm orgSlug={orgSlug} members={members} selfId={access.user.id} />
          </section>
        </div>
      </div>
    </div>
  )
}
