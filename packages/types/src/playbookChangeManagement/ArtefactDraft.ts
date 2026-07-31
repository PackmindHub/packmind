import { RuleId } from '../standards/RuleId';

/**
 * The unsaved editor content for an artefact, shaped per artefact type to mirror
 * what each edit form already builds before submitting.
 *
 * Used to answer "if I save this, which pending proposals stop merging?" before
 * the save happens — the merge has to run against the draft, not against HEAD.
 */
export type StandardDraft = {
  kind: 'standard';
  name: string;
  description: string;
  scope: string | null;
  rules: { id: RuleId; content: string }[];
};

export type CommandDraft = {
  kind: 'command';
  name: string;
  content: string;
};

/**
 * Skill files are addressed by path here, not id: the editor knows the path it
 * opened, and resolving it to a file id is the backend's job.
 */
export type SkillDraft = {
  kind: 'skill';
  files: { path: string; content: string }[];
};

export type ArtefactDraft = StandardDraft | CommandDraft | SkillDraft;
