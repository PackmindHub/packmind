import { CodingAgent, CodingAgents } from '../coding-agent';
import { RenderMode } from './RenderMode';

export const RENDER_MODE_TO_CODING_AGENT: Record<RenderMode, CodingAgent> = {
  [RenderMode.PACKMIND]: CodingAgents.packmind,
  [RenderMode.AGENTS_MD]: CodingAgents.agents_md,
  [RenderMode.JUNIE]: CodingAgents.junie,
  [RenderMode.GH_COPILOT]: CodingAgents.copilot,
  [RenderMode.CLAUDE]: CodingAgents.claude,
  [RenderMode.CURSOR]: CodingAgents.cursor,
  [RenderMode.GITLAB_DUO]: CodingAgents.gitlab_duo,
  [RenderMode.CONTINUE]: CodingAgents.continue,
};

export const CODING_AGENT_TO_RENDER_MODE: Partial<
  Record<CodingAgent, RenderMode>
> = Object.entries(RENDER_MODE_TO_CODING_AGENT).reduce(
  (acc, [renderMode, codingAgent]) => {
    acc[codingAgent as CodingAgent] = renderMode as RenderMode;
    return acc;
  },
  {} as Partial<Record<CodingAgent, RenderMode>>,
);
