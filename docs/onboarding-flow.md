## Goal: learn more about _why_ visitors are willing to try Packmind

## TL;DR

- Add qualification questions during sign up process
- Unify sign up flow (with account only / remove "quick start" for now)

## UI/UX

Micro-copy and UX flow is described here:
https://miro.com/app/board/uXjVGSfLg68=/

## Behaviour

### Sign up flow

- Remove "quick start" option for now
- `/sign-up`-> display a "splash" screen with benefits of using Packmind + "Get started" button
- On "Get started" click -> `/sign-up/create-account`
- On account creation success -> `/sign-up/onboarding-reason`
- On reason selection -> redirect to new created organization dashboard

### Page content

#### Welcome

- Splash screen with benefits of using Packmind
  - Headline: "Get more done with AI-powered assistants"
  - Subheadline: "Create, manage and deploy AI assistants tailored to your needs."
- CTA: "Get started"

#### Sign up

- Current sign up form (with organization, email, password) as we already have it
- CTA: "Create account"

#### Onboarding reason

- Headline: What made you want to try Packmind today?
- Subheadline: This helps us tailor your experience.

- Choices:
  - Instructions are becoming messy as more people edit them
  - I know instructions matter, but I’m not sure what to write
  - I already have instructions, but maintaining them is painful
  - I use multiple AI coding assistants and want one source of truth
  - I want to understand the impact of instructions on generated code
  - I’m just exploring

- CTA: "Continue"
- Secondary CTA: "Skip for now"

### Analytics

- event `onboarding_reason_selected` should be tracked when finishing sign up
  - **metadata** `reason_key` and `reason_label`

| UI copy (user-facing)            | Internal key                   |
| -------------------------------- | ------------------------------ |
| Instructions are becoming messy… | governance_messy_edits         |
| I know instructions matter…      | instruction_clarity            |
| Maintaining them is painful      | instruction_maintenance        |
| One source of truth              | multi_assistant_centralization |
| Understand impact                | instruction_impact             |
| Just exploring                   | exploring                      |

- event `onboarding_reason_skipped` should be tracked when step is skipped
