import {
  AGENT_CAPABILITIES,
  AgentCapabilityFlags,
  ArtifactCapability,
  capableAgentsFor,
  hasCapableAgent,
} from './AgentCapabilities';
import { CodingAgent, CodingAgents } from './CodingAgent';
import { VALID_CODING_AGENTS } from './validation';

describe('AGENT_CAPABILITIES', () => {
  it('declares a capability row for every valid coding agent', () => {
    for (const agent of VALID_CODING_AGENTS) {
      expect(AGENT_CAPABILITIES[agent]).toBeDefined();
    }
  });

  it('declares all four capabilities for every agent (no implicit booleans)', () => {
    const allCapabilities: ArtifactCapability[] = [
      'skills',
      'standards',
      'commands',
      'recipes',
    ];
    for (const agent of VALID_CODING_AGENTS) {
      const flags = AGENT_CAPABILITIES[agent];
      for (const cap of allCapabilities) {
        expect(typeof flags[cap]).toBe('boolean');
      }
    }
  });

  describe('agents_md', () => {
    it('supports standards only', () => {
      expect(
        AGENT_CAPABILITIES[CodingAgents.agents_md],
      ).toEqual<AgentCapabilityFlags>({
        skills: false,
        standards: true,
        commands: false,
        recipes: false,
      });
    });
  });

  describe('packmind', () => {
    it('supports standards, commands, recipes — but not skills', () => {
      expect(
        AGENT_CAPABILITIES[CodingAgents.packmind],
      ).toEqual<AgentCapabilityFlags>({
        skills: false,
        standards: true,
        commands: true,
        recipes: true,
      });
    });
  });

  describe('claude', () => {
    it('supports every artifact type', () => {
      expect(
        AGENT_CAPABILITIES[CodingAgents.claude],
      ).toEqual<AgentCapabilityFlags>({
        skills: true,
        standards: true,
        commands: true,
        recipes: true,
      });
    });
  });
});

describe('hasCapableAgent', () => {
  describe('when at least one agent supports the capability', () => {
    it('returns true', () => {
      expect(hasCapableAgent(['agents_md', 'claude'], 'skills')).toBe(true);
    });
  });

  describe('when no agent supports the capability', () => {
    it('returns false', () => {
      expect(hasCapableAgent(['agents_md', 'packmind'], 'skills')).toBe(false);
    });
  });

  it('returns false on empty agent list', () => {
    expect(hasCapableAgent([], 'standards')).toBe(false);
  });
});

describe('capableAgentsFor', () => {
  describe('returns every agent whose capability is true', () => {
    it('contains claude', () => {
      expect(capableAgentsFor('skills')).toContain<CodingAgent>('claude');
    });

    it('does not contain agents_md', () => {
      expect(capableAgentsFor('skills')).not.toContain<CodingAgent>(
        'agents_md',
      );
    });

    it('does not contain packmind', () => {
      expect(capableAgentsFor('skills')).not.toContain<CodingAgent>('packmind');
    });
  });

  describe('returns every agent that supports standards', () => {
    it('contains all agents except claude_plugin', () => {
      const agentsWithStandards = VALID_CODING_AGENTS.filter(
        (agent) => agent !== 'claude_plugin',
      );
      expect(capableAgentsFor('standards')).toEqual(
        expect.arrayContaining([...agentsWithStandards]),
      );
    });

    it('does not contain claude_plugin', () => {
      expect(capableAgentsFor('standards')).not.toContain<CodingAgent>(
        'claude_plugin',
      );
    });
  });
});
