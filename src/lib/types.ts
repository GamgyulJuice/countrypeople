export type Purpose = '귀농' | '귀촌' | '탐색 중';
export interface Profile {
  user_id: string; display_name: string; birth_date: string | null;
  purpose: Purpose; current_region: string; target_province: string; target_district: string;
  move_date: string | null; moved: boolean; stage: string; interest: string;
  occupation: string; urban_months: number | null; independent_since: string | null;
  household_head: boolean | null; entity_status: string; farmland_status: string;
  income_band: string; notifications_enabled: boolean;
}
export type RuleField = 'age' | 'purpose' | 'region' | 'education_hours' | 'urban_months' | 'independent_years' | 'household_head' | 'entity_status' | 'farmland_status' | 'income_band' | 'moved';
export interface Rule {
  id: string; policy_id: string; field: RuleField; operator: 'gte' | 'lte' | 'eq';
  value: string | number | boolean; label: string; guidance: string;
}
export interface PolicyDocument { id: string; policy_id: string; title: string }
export interface Policy {
  id: string; title: string; summary: string; agency: string; region: string;
  category: string; benefit: string; start_date: string | null; end_date: string | null;
  source_name: string; source_url: string; policy_year: number; verified_at: string | null;
  contact: string; is_demo: boolean; rules: Rule[]; documents: PolicyDocument[];
}
// Missing/null start_date supports pre-upgrade records as single-day tasks.
export interface Task {
  id: string; user_id: string; title: string; start_date?: string | null; due_date: string; completed: boolean; category: string; policy_id: string | null;
  // Only configured courses count as education; an education-research task has no course metadata.
  education_provider?: string | null; education_hours?: number | null;
  education_completed_date?: string | null; education_certificate?: boolean;
}
export interface Education { id: string; user_id: string; title: string; provider: string; hours: number; completed_date: string; certificate: boolean; task_id?: string | null }
export interface Bookmark { user_id: string; policy_id: string }
export interface DocumentCheck { user_id: string; document_id: string; completed: boolean }
export interface Checkin { id: string; user_id: string; week_start: string; note: string; completed_count: number; total_count: number }
export interface AppData { profile: Profile | null; policies: Policy[]; tasks: Task[]; education: Education[]; bookmarks: Bookmark[]; documentChecks: DocumentCheck[]; checkins: Checkin[] }
export const emptyData: AppData = { profile: null, policies: [], tasks: [], education: [], bookmarks: [], documentChecks: [], checkins: [] };
export function blankProfile(userId: string): Profile {
  return { user_id: userId, display_name: '', birth_date: null, purpose: '탐색 중', current_region: '', target_province: '', target_district: '', move_date: null, moved: false, stage: '관심', interest: '', occupation: '', urban_months: null, independent_since: null, household_head: null, entity_status: '', farmland_status: '', income_band: '', notifications_enabled: true };
}
