export type WorkspacePage = 'home' | 'policies' | 'tasks' | 'education' | 'briefing' | 'profile';
export type Destination = { page: WorkspacePage | null; signup: boolean };
export function workspaceHash(page: WorkspacePage) { return `#my/${page}`; }
export function parseDestination(hash: string, search: string): Destination {
  if (hash === '#signup') return { page: 'home', signup: true };
  if (hash === '#login' || new URLSearchParams(search).get('onboarding') === '1') return { page: 'home', signup: false };
  const page = hash.replace(/^#my\//, '');
  if (hash.startsWith('#my/') && ['home', 'policies', 'tasks', 'education', 'briefing', 'profile'].includes(page)) return { page: page as WorkspacePage, signup: false };
  return { page: null, signup: false };
}
