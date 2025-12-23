import React from 'react';
import { StartTrialCommandAgents } from '@packmind/types';
import { LuBot } from 'react-icons/lu';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { SiJetbrains } from 'react-icons/si';
import { IconType } from 'react-icons';
import { CursorIcon } from '@packmind/assets/icons/CursorIcon';
import { ContinueIcon } from '@packmind/assets/icons/ContinueIcon';

/**
 * Mapping of agent IDs to their corresponding icon components.
 * Use with PMIcon's `as` prop: <PMIcon as={AGENT_ICONS[agent]} size="xl" />
 */
export const AGENT_ICONS: Record<StartTrialCommandAgents, IconType> = {
  claude: RiClaudeLine,
  'vs-code': VscVscode,
  cursor: CursorIcon,
  jetbrains: SiJetbrains,
  'continue-dev': ContinueIcon,
  other: LuBot,
};

/**
 * Get the icon component for a given agent.
 * @param agent - The agent identifier
 * @returns The icon component to use with PMIcon's `as` prop
 */
export const getAgentIcon = (agent: StartTrialCommandAgents): IconType => {
  return AGENT_ICONS[agent] ?? LuBot;
};
