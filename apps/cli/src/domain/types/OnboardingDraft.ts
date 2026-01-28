export type BaselineItemType = 'tooling' | 'structure' | 'convention' | 'agent';
export type ConfidenceLevel = 'high' | 'medium';

export interface IBaselineItem {
  id: string;
  type: BaselineItemType;
  label: string;
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface IDraftMeta {
  skill: 'packmind-onboard';
  version: string;
  generated_at: string;
  repo_fingerprint: string;
  read_only: true;
}

export interface IDraftSummary {
  languages: string[];
  frameworks: string[];
  tools: string[];
  structure_hints: string[];
}

export interface IOnboardingDraft {
  meta: IDraftMeta;
  summary: IDraftSummary;
  baseline_items: IBaselineItem[];
  redactions: string[];
  notes: string[];
}

export interface IOnboardingState {
  last_run_at: string | null;
  last_draft_paths: {
    json: string | null;
    md: string | null;
  };
  repo_fingerprint: string | null;
  last_push_status: {
    status: 'sent' | 'unsent';
    timestamp: string | null;
  };
  baseline_item_count: number;
}
