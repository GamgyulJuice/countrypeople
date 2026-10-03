import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
function configurationError(): string | null {
  if (!url && !key) return null;
  if (!url || !key) return 'Supabase URL과 공개용 키를 모두 설정해 주세요.';
  try { if (new URL(url).protocol !== 'https:') return 'Supabase URL은 HTTPS 주소여야 합니다.'; } catch { return 'Supabase URL 형식을 확인해 주세요.'; }
  if (key.startsWith('sb_secret_')) return '비밀 키는 브라우저에서 사용할 수 없습니다. 공개용 publishable key를 설정하세요.';
  if (key.startsWith('sb_publishable_')) return null;
  try {
    const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    if (payload.role === 'anon') return null;
  } catch { /* Invalid keys must not silently activate demo mode. */ }
  return '공개용 publishable key 또는 anon key만 사용할 수 있습니다.';
}
export const configError = configurationError();
export const isDemo = !url && !key;
export const supabase = !isDemo && !configError ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
