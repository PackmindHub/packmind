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
  it('returns true when at least one agent supports the capability', () => {
    expect(hasCapableAgent(['agents_md', 'claude'], 'skills')).toBe(true);
  });

  it('returns false when no agent supports the capability', () => {
    expect(hasCapableAgent(['agents_md', 'packmind'], 'skills')).toBe(false);
  });

  it('returns false on empty agent list', () => {
    expect(hasCapableAgent([], 'standards')).toBe(false);
  });
});

describe('capableAgentsFor', () => {
  it('returns every agent whose capability is true', () => {
    const result = capableAgentsFor('skills');
    expect(result).toContain<CodingAgent>('claude');
    expect(result).not.toContain<CodingAgent>('agents_md');
    expect(result).not.toContain<CodingAgent>('packmind');
  });

  it('returns the right agents for standards (every agent supports standards in this design)', () => {
    expect(capableAgentsFor('standards')).toEqual(
      expect.arrayContaining([...VALID_CODING_AGENTS]),
    );
  });
});
