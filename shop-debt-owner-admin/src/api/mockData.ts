import { Entry, EntryHistory, AdminActionLog, Profile } from '../types/database';

export const INITIAL_MOCK_PROFILES: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'owner',
    full_name: 'Sohibboy',
    phone: '+998901234501',
    pin_code: '7777',
    avatar_color: 'from-violet-600 to-purple-600',
    is_active: true,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    role: 'worker',
    full_name: 'Sayfullo',
    phone: '+998901234502',
    pin_code: '2222',
    avatar_color: 'from-emerald-600 to-teal-600',
    is_active: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    role: 'worker',
    full_name: 'Abubakir',
    phone: '+998901234503',
    pin_code: '1111',
    avatar_color: 'from-blue-600 to-indigo-600',
    is_active: true,
    created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_MOCK_ENTRIES: Entry[] = [];

export const INITIAL_MOCK_HISTORIES: EntryHistory[] = [];

export const INITIAL_MOCK_ACTION_LOGS: AdminActionLog[] = [];
