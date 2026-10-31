import type { Metadata } from "next"
import { requireOrgAccess } from "@/lib/auth"
import { listProviderKeys } from "@/lib/queries"
import { saveProviderKey } from "@/lib/actions/keys"
import { PROVIDER_LABELS } from "@/lib/format"
import { ActionForm } from "@/components/ui/action-form"
import { Field, HelpText, Input, Select } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty"
import { Section } from "@/components/settings/section"
import { DeleteKeyButton, TestKeyButton } from "@/components/settings/key-actions"

export const maxDuration = 60

export const metadata: Metadata = { title: "Provider keys" }

export default async function KeysPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: orgSlug } = await params
  const access = await requireOrgAccess(orgSlug)
  const keys = await listProviderKeys(access.org.id)

  return (
    <>
      <Section
        title="Provider keys"
        description="Keys are encrypted with AES-256-GCM before they reach the database. The web app and orchestrator are the only processes that decrypt them. Only the last four characters are readable after saving."
      >
        {keys.length === 0 ? (
          <EmptyState
            title="No provider keys"
            body="Add a key, then attach it to an agent. Agents without a key use the orchestrator's DEV_OPENAI_COMPAT_* fallback when it is configured; otherwise they cannot run."
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-text">{key.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-faint">
                    {PROVIDER_LABELS[key.provider] ?? key.provider} · •••• {key.last4}
                    {key.baseUrl ? ` · ${key.baseUrl}` : ""}
                  </p>
                </div>
                <TestKeyButton orgSlug={orgSlug} keyId={key.id} provider={key.provider} />
                <DeleteKeyButton orgSlug={orgSlug} keyId={key.id} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Add a key"
        description="Use the provider's own key. For Ollama, vLLM, LM Studio or another OpenAI-compatible endpoint, choose the compatible provider and give its base URL."
      >
        <ActionForm action={saveProviderKey} submitLabel="Save key" resetOnSuccess>
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Field label="provider" htmlFor="provider">
              <Select id="provider" name="provider" defaultValue="openai">
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="label" htmlFor="key-label" hint="shown in agent settings">
              <Input id="key-label" name="label" required maxLength={60} placeholder="production OpenAI" />
            </Field>
          </div>
          <Field label="api key" htmlFor="api-key" hint="never shown again">
            <Input
              id="api-key"
              name="apiKey"
              type="password"
              required
              autoComplete="off"
              placeholder="sk-…"
            />
          </Field>
          <Field label="base url" htmlFor="base-url" hint="OpenAI-compatible only">
            <Input id="base-url" name="baseUrl" placeholder="http://localhost:11434/v1" />
          </Field>
          <HelpText>
            The key is tested after saving. Delete a key at any time; agents bound to it stop
            working until another key is attached.
          </HelpText>
        </ActionForm>
      </Section>
    </>
  )
}
