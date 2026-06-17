// Domain-shaped types for the Get started onboarding prototype.
// Mirrors the real Packmind model loosely: imported Skills -> a Package ->
// shipped to a repo (Distribution) -> tracked in Governance.

export type StepId = 'import' | 'bundle' | 'ship' | 'govern';

export type StepStatus = 'done' | 'active' | 'pending';

export interface StepMeta {
  id: StepId;
  title: string;
  outcome: string;
}

export type SkillSource = 'sample' | 'cli';

export interface ImportedSkill {
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  files: number;
  agent: string;
}

// A skill the CLI pushed up, awaiting approval as a change proposal.
export interface ProposedSkill {
  id: string;
  name: string;
  description: string;
  files: number;
  agent: string;
}

export interface PackageDraft {
  name: string;
  skillIds: string[];
}

export type ShipState = 'idle' | 'pending' | 'success' | 'failure';
export type ShipLane = 'cli' | 'web';
export type ShipOutcome = 'success' | 'failure';

export interface GovernanceRepoRow {
  id: string;
  repo: string;
  packageName: string;
  version: number;
  behind: number; // 0 = on the latest version
  agents: string[];
  lastInstall: string;
}

export interface ActivityEntry {
  id: string;
  initials: string;
  actor: string;
  action: string;
  target: string;
  when: string;
}

export type Scenario = 'fresh' | 'midFlow' | 'activated';
