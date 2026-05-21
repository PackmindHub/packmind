# Product

## Register

product

## Users

Tech leads, staff engineers, and engineering managers adopting AI coding agents (Claude Code, Copilot, Cursor, and the long tail) across multiple repos. They are senior, opinionated, time-poor, and skeptical of tools that pretend to be magic. They use Packmind in two modes:

1. **Curation mode**, at a desk with focus: writing, reviewing, versioning, and deploying standards, commands, and skills. Sessions are 15–45 minutes, deliberate.
2. **Governance mode**, in short check-ins: watching what got proposed from repos, who is using which version, where adoption is stalling.

The job to be done in one sentence: **keep one engineering playbook coherent and shipped to every AI agent in every repo, without copy-paste drift.**

## Product Purpose

Packmind is the source of truth for an engineering team's playbook (standards, commands, skills) and the distribution layer that renders it into the specific files each AI coding agent expects (`CLAUDE.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `AGENTS.md`, and the rest). Packmind is **not** a marketplace and does not package context files as plugins. It is a curation and governance layer that lives alongside a team's Git repos. The repos keep their code and history; Packmind keeps the playbook coherent and shipped.

It solves two problems that Git alone leaves open:

- **Curation and governance**: ownership, approval workflows, versioning, and adoption tracking for context content that lives across many repos. Without Packmind, this work is scattered across PR discipline, CODEOWNERS conventions, and ad-hoc Slack approvals.
- **Multi-agent rendering**: one canonical artifact, many destination formats, kept in sync automatically, so teams stop maintaining parallel `CLAUDE.md` / `.cursor/rules` / `copilot-instructions.md` files by hand.

Success looks like a tech lead saying: _"Our standards live in one place, every agent in every repo follows them, and I can see who is on which version."_

## Brand Personality

Three words: **expert, sharp, calm.**

- **Expert**: talks to senior engineers as peers. No "AI-powered" puffery, no rocket emojis, no marketing-flavored microcopy in the product. The reader is more experienced than the UI assumes by default in most SaaS.
- **Sharp**: every screen has a clear point of view about what matters. Dense where density is earned (lists of standards, version history, deployment status); spacious where reading is the task (editing an artifact, reviewing a change).
- **Calm**: no urgency theatre. No red badges by default, no animated confetti, no nudges. Status surfaces are factual. The product should feel like it knows what it is doing.

Emotional goal: the quiet confidence of a well-run internal tool that a senior engineer would build for themselves.

Reference lane: **Notion + Vercel dashboard**. Editorial-product hybrid. Strong typography, content-led layouts, generous spacing in editing surfaces, controlled density in governance surfaces. Not Linear's keyboard-first minimalism, not Notion's playful warmth. Somewhere between, leaning Vercel.

## Anti-references

The single trap to avoid is **enterprise B2B heaviness**: the Material/AntD/IBM-Carbon admin-console default. Specifically:

- Cramped data tables with no breathing room and gray-on-gray rows.
- Modal-for-everything (create, edit, confirm, error). Inline and progressive disclosure first; modals are an admission of layout failure.
- Tab-and-form-grid layouts that look like a configuration panel from 2014.
- Dense top nav + side nav + sub-nav stacked together.
- Status pills in every cell, every color, with no information hierarchy.
- Generic "Settings → General / Members / Billing / Integrations" sameness without a point of view.

Also off the table, even though they were not the strongest trap:

- AI-startup-template aesthetics (purple gradients, hero-metric tiles, glassmorphism, "sparkle" icons, identical card grids).
- Developer-cool maximalism (neon terminals, scroll-triggered everything, 3D logos).
- Side-stripe colored borders, gradient text, em dashes in UI copy.

## Design Principles

1. **The playbook is one library, not three products.** Standards, commands, and skills are distinct artifact types but live in the same mental model: same shell, same edit surface, same versioning, same deployment story. Resist designing each as its own product area.

2. **Governance is the differentiator. Make it visible.** Ownership, approval state, versions, deployments, adoption: these are the work Packmind does on top of plain files in a repo. Surface them in the primary view, not behind a tab labeled "History". A tech lead should be able to answer "what version is each repo on?" without clicking.

3. **Calm density.** Tech leads scan. Lists and tables should pack information without crowding it: Vercel-table-and-side-panel, never AntD-grid. Whitespace earns its place by making scanning faster, not by looking premium.

4. **Practice what you preach.** Packmind helps teams write clearer instructions for AI. The product's own copy (empty states, error messages, button labels, onboarding) must read like it was written by someone with opinions. If our microcopy is generic, we have failed our own pitch.

5. **Honest about being multi-agent.** When something is Claude-specific, Cursor-specific, or Copilot-specific, name it and show its native filename. Do not smooth the differences with generic robot icons. The product exists because tools are different; pretending otherwise is a bug.

## Accessibility & Inclusion

- **WCAG 2.1 AA** is the target. Sufficient for enterprise procurement and the baseline that B2B customers expect.
- All interactive elements must be keyboard-reachable with a visible focus state; tab order must follow visual order.
- Color is never the only signal; pair it with text, icon, or position (especially for status, diffs, and deployment state).
- Contrast meets AA for text and UI components against their nearest background; verify against the actual surface, not the design canvas.
- Respect `prefers-reduced-motion` for any animation longer than a state transition.
- Form fields have labels, not just placeholders. Errors are programmatically associated with their field and announced.
