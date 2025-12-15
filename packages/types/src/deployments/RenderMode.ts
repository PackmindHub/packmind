export enum RenderMode {
  AGENTS_MD = 'AGENTS_MD',
  JUNIE = 'JUNIE',
  GH_COPILOT = 'GH_COPILOT',
  CLAUDE = 'CLAUDE',
  CURSOR = 'CURSOR',
  PACKMIND = 'PACKMIND',
  GITLAB_DUO = 'GITLAB_DUO',
  CONTINUE = 'CONTINUE',
}

export const REQUIRED_RENDER_MODE = RenderMode.PACKMIND;

export const RENDER_MODE_ORDER: RenderMode[] = [
  RenderMode.PACKMIND,
  RenderMode.AGENTS_MD,
  RenderMode.JUNIE,
  RenderMode.GH_COPILOT,
  RenderMode.CLAUDE,
  RenderMode.CURSOR,
  RenderMode.GITLAB_DUO,
  RenderMode.CONTINUE,
];

export const normalizeRenderModes = (modes: RenderMode[]): RenderMode[] => {
  const uniqueModes = new Set(modes);
  uniqueModes.add(REQUIRED_RENDER_MODE);

  return RENDER_MODE_ORDER.filter((mode) => uniqueModes.has(mode));
};
