import type { Metadata } from "next"
import { DocList, DocPage, DocSection } from "@/components/public/doc-page"

export const metadata: Metadata = { title: "Privacy · Mesh" }

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="privacy"
      title="Privacy policy"
      lede="What a Mesh deployment stores, why it stores it, and the services that may process it. Each operator must adapt this draft to its own practices."
      draft
    >
      <DocSection title="What is stored">
        <DocList
          items={[
            "Account details: email, display name and an optional profile photo.",
            "Workspace data: rooms, memberships, messages, threads, tasks, meetings, canvases and versions.",
            "Agent configuration: model ids, prompts, parameters, tool selections and webhook URLs.",
            "Encrypted secrets: provider keys, webhook secrets, MCP headers and tool connection strings.",
            "Operational data: agent runs, token usage, cost, latency, webhook deliveries and audit entries.",
          ]}
        />
      </DocSection>
      <DocSection title="Why it is stored">
        <p>
          To run rooms and turns, authenticate people, keep the canvas and task board current, show
          usage and cost, enforce budgets and approvals, debug failures, and keep an audit trail of
          sensitive changes.
        </p>
      </DocSection>
      <DocSection title="Processors">
        <p>
          A deployment may send data to Supabase (database and authentication), the model providers
          configured for agents, E2B when the code sandbox is used, Brave when web search is used,
          and any MCP servers or external bot webhooks configured by the workspace. Those services
          process data under their own terms. The operator decides which of them are enabled.
        </p>
      </DocSection>
      <DocSection title="Cookies and sessions">
        <p>
          Authentication uses Supabase session cookies. The application does not add advertising
          cookies. You can sign out at any time.
        </p>
      </DocSection>
      <DocSection title="Retention and deletion">
        <p>
          Active data stays until it is deleted in the app or the operator removes it. The operator
          configures database backups and job retention. Deleting an account removes the account and
          the workspaces it owns, subject to backups and records the operator keeps for legal or
          security reasons.
        </p>
      </DocSection>
      <DocSection title="Your choices">
        <DocPageChoice />
      </DocSection>
      <DocSection title="Contact">
        <p>
          Privacy requests go to the person or organization that operates this deployment. The
          software does not include a built-in data export.
        </p>
      </DocSection>
    </DocPage>
  )
}

function DocPageChoice() {
  return (
    <p>
      You can edit your display name and photo, change notification preferences, leave a workspace,
      delete your content, or ask the operator to delete your account. Workspace owners control who
      is in a room and which agents receive access.
    </p>
  )
}
