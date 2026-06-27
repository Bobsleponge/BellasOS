import { describe, expect, it } from 'vitest';
import {
  filterAgentsForMode,
  filterModulesForMode,
  formatOperatingModeForPrompt,
  parseExplicitModeFromMessage,
  resolveAdaptiveModeSwitch,
  resolveOperatingModeForContext,
} from './operating-mode';

describe('resolveOperatingModeForContext', () => {
  it('honors explicit user mode over workspace type', () => {
    expect(
      resolveOperatingModeForContext({
        operatingMode: 'personal',
        workspaceType: 'business',
      }),
    ).toBe('personal');
  });

  it('defaults to general when nothing is set', () => {
    expect(resolveOperatingModeForContext({})).toBe('general');
  });

  it('infers from workspace when mode is omitted', () => {
    expect(resolveOperatingModeForContext({ workspaceType: 'investment' })).toBe('wealth');
  });
});

describe('formatOperatingModeForPrompt', () => {
  it('includes posture text from specs', () => {
    const text = formatOperatingModeForPrompt('wealth');
    expect(text).toContain('wealth');
    expect(text).toContain('Jarvis posture');
  });

  it('describes general adaptability', () => {
    const text = formatOperatingModeForPrompt('general');
    expect(text).toContain('adapt');
  });
});

describe('mode-scoped routing', () => {
  it('does not filter agents in general mode', () => {
    const agents = filterAgentsForMode(
      [
        { name: 'finance', type: 'finance', dynamic: false },
        { name: 'social', type: 'social', dynamic: false },
      ],
      'general',
    );
    expect(agents).toHaveLength(2);
  });

  it('prefers finance agents in wealth mode', () => {
    const agents = filterAgentsForMode(
      [
        { name: 'finance', type: 'finance', dynamic: false },
        { name: 'social', type: 'social', dynamic: false },
      ],
      'wealth',
    );
    expect(agents.map((a) => a.type)).toEqual(['finance']);
  });
});

describe('resolveAdaptiveModeSwitch', () => {
  it('parses explicit mode commands', () => {
    expect(parseExplicitModeFromMessage('switch to wealth mode')).toBe('wealth');
    expect(parseExplicitModeFromMessage('general mode please')).toBe('general');
  });

  it('auto-switches from general to wealth on finance intent', () => {
    const result = resolveAdaptiveModeSwitch({
      currentMode: 'general',
      message: 'log a R4000 Nvidia purchase',
      intentDomain: 'finance',
      agentType: 'finance',
      modeManual: false,
    });
    expect(result.switched).toBe(true);
    expect(result.mode).toBe('wealth');
  });

  it('does not auto-switch when user pinned a mode', () => {
    const result = resolveAdaptiveModeSwitch({
      currentMode: 'personal',
      message: 'log a R4000 Nvidia purchase',
      agentType: 'finance',
      modeManual: true,
    });
    expect(result.switched).toBe(false);
  });

  it('drifts back to general on broad chat after specialist auto mode', () => {
    const result = resolveAdaptiveModeSwitch({
      currentMode: 'wealth',
      message: 'thanks, what is the weather like?',
      intentDomain: 'general',
      actionKind: 'chat',
      modeManual: false,
    });
    expect(result.switched).toBe(true);
    expect(result.mode).toBe('general');
  });

  it('returns to general when user asks', () => {
    const result = resolveAdaptiveModeSwitch({
      currentMode: 'wealth',
      message: 'switch to general mode',
    });
    expect(result.switched).toBe(true);
    expect(result.mode).toBe('general');
  });
});
