import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { isOrgAdmin, requireOrgAccess } from "@/lib/auth"
import { listAuditLogs, listMemberViews } from "@/lib/queries"
import { inviteMember, updateSso } from "@/lib/actions/orgs"
import { ssoEnabled } from "@/lib/env"
import { ActionForm } from "@/components/ui/action-form"
import { Field, Input, Select } from "@/components/ui/field"
import { EmptyState, InlineAlert } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { MemberRoleForm } from "@/components/admin/member-role-form"
import { fullTime, pretty } from "@/lib/format"

export const metadata: Metadata = { title: "Members & audit" }

export default async function AdminPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  if (!isOrgAdmin(access.role)) redirect(`/${orgSlug}`)
  const [members, logs] = await Promise.all([
    listMemberViews(access.org.id),
    listAuditLogs(access.org.id),
  ])
  const isOwner = access.role === "owner"

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] text-faint">
          <Link href={`/${orgSlug}`} className="hover:text-text">
            workspace
          </Link>{" "}
          / admin
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em]">Members & audit</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
          Organization roles gate settings, keys, tool approvals and agent management. Room roles are
          set per room. Every sensitive change writes an audit row.
        </p>

        <div className="mt-6 space-y-8">
          <Section
            title="Members"
            description={`${members.length} ${members.length === 1 ? "person" : "people"} in this workspace.`}
          >
            <ul className="divide-y divide-line border-y border-line">
              {members.map((member) => (
                <li key={member.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                    {member.displayName}
                  </span>
                  <span className="font-mono text-[10px] text-faint">{member.role}</span>
                  <MemberRoleForm
                    orgSlug={orgSlug}
                    userId={member.userId}
                    role={member.role}
                    allowOwner={isOwner}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-line pt-5">
              <ActionForm action={inviteMember} submitLabel="Invite">
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                  <Field label="email" htmlFor="invite-email">
                    <Input id="invite-email" name="email" type="email" required placeholder="teammate@company.com" />
                  </Field>
                  <Field label="role" htmlFor="invite-role">
                    <Select id="invite-role" name="role" defaultValue="member">
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      {isOwner ? <option value="owner">owner</option> : null}
                    </Select>
                  </Field>
                </div>
                <p className="text-[12px] leading-relaxed text-faint">
                  If the address is new to Supabase, they receive an invite email. Existing users are
                  added directly.
                </p>
              </ActionForm>
            </div>
          </Section>

          <Section
            title="SAML SSO"
            description="Supabase SAML requires a Pro plan and the org's SSO connection configured in Supabase. The flag here only records intent; it does not bypass Supabase Auth."
          >
            {!ssoEnabled() ? (
              <InlineAlert tone="warning">
                SSO is disabled for this deployment. Set NEXT_PUBLIC_SSO_ENABLED=true after
                configuring SAML in Supabase to expose the toggle.
              </InlineAlert>
            ) : (
              <ActionForm action={updateSso} submitLabel="Save SSO flag">
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <Field label="state" htmlFor="sso-state">
                  <Select
                    id="sso-state"
                    name="enabled"
                    defaultValue={access.org.ssoEnabled ? "true" : "false"}
                  >
                    <option value="false">disabled</option>
                    <option value="true">enabled</option>
                  </Select>
                </Field>
              </ActionForm>
            )}
          </Section>

          <Section
            title="Audit log"
            description="The last 100 sensitive actions: keys, members, room settings, tool approvals and API keys."
          >
            {logs.length === 0 ? (
              <EmptyState
                title="No audit entries yet"
                body="Entries appear as soon as an admin changes a key, role, room setting or tool approval."
              />
            ) : (
              <div className="overflow-x-auto border-y border-line">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line font-mono text-[10px] text-faint">
                      <th className="py-2 pr-3 font-normal">time</th>
                      <th className="py-2 pr-3 font-normal">action</th>
                      <th className="py-2 pr-3 font-normal">target</th>
                      <th className="py-2 pr-3 font-normal">actor</th>
                      <th className="py-2 font-normal">metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {logs.map((log) => (
                      <tr key={log.id} className="align-top">
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-[10px] text-faint">
                          {fullTime(log.createdAt)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-text">{log.action}</td>
                        <td className="max-w-[180px] truncate py-2 pr-3 font-mono text-[10px] text-muted">
                          {log.target ?? "-"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px] text-faint">
                          {log.actorType}
                          {log.actorId ? `:${log.actorId.slice(0, 8)}` : ""}
                        </td>
                        <td className="max-w-[260px] py-2 font-mono text-[10px] leading-relaxed text-faint">
                          <details>
                            <summary className="cursor-pointer hover:text-text">view</summary>
                            <pre className="mt-1 whitespace-pre-wrap break-all">
                              {pretty(log.metadata)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
