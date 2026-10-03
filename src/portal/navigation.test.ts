import { describe, it, expect } from 'vitest';
import { parseDestination, workspaceHash } from './navigation';

describe('portal navigation', () => {
  it('opens the public portal by default without entering a private workspace', () => {
    expect(parseDestination('', '')).toEqual({ page: null, signup: false });
    expect(parseDestination('#unknown', '')).toEqual({ page: null, signup: false });
  });
  it('retains every valid personal destination on a direct link', () => {
    for (const page of ['home', 'policies', 'tasks', 'education', 'briefing', 'profile'] as const) {
      expect(parseDestination(workspaceHash(page), '')).toEqual({ page, signup: false });
    }
    expect(parseDestination('#my/not-a-page', '').page).toBeNull();
  });
  it('distinguishes sign up from login', () => {
    expect(parseDestination('#signup', '')).toEqual({ page: 'home', signup: true });
    expect(parseDestination('#login', '')).toEqual({ page: 'home', signup: false });
  });
  it('preserves the existing onboarding re-entry link', () => {
    expect(parseDestination('', '?onboarding=1').page).toBe('home');
    expect(parseDestination('', '?onboarding=0').page).toBeNull();
  });
});
